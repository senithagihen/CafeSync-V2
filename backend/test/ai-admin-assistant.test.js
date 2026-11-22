const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateAdminChat,
  loadAdminContext,
  buildAdminGuideReply,
  getAdminAssistantReply,
} = require('../src/domains/assistant/admin-assistant.service');

test('Admin AI: input validation rejects empty, long or malformed input', () => {
  assert.throws(() => validateAdminChat(null), /Please send a message/);
  assert.throws(() => validateAdminChat({ message: '' }), /Please enter a message/);
  assert.throws(() => validateAdminChat({ message: '   ' }), /Please enter a message/);
  assert.throws(() => validateAdminChat({ message: 'a'.repeat(1001) }), /Keep your message under 1001/);
  assert.throws(() => validateAdminChat({ message: 'hi', history: Array(11).fill({ role: 'user', content: 'test' }) }), /Conversation history must contain at most 10/);
  assert.throws(() => validateAdminChat({ message: 'hi', history: [{ role: 'system', content: 'invalid' }] }), /Conversation history contains an invalid message/);

  const valid = validateAdminChat({ message: '  What are today sales?  ', history: [{ role: 'user', content: 'hello' }] });
  assert.equal(valid.message, 'What are today sales?');
  assert.equal(valid.history.length, 1);
});

test('Admin AI: aggregates confirmed facts from mock models', async () => {
  const mockInventory = [
    { _id: '1', name: 'Espresso', stock: 15, lowStockThreshold: 5, category: 'Coffee' },
    { _id: '2', name: 'Croissant', stock: 2, lowStockThreshold: 5, category: 'Snacks' },
    { _id: '3', name: 'Matcha', stock: 0, lowStockThreshold: 3, category: 'Tea' },
  ];
  const mockOrders = [
    { _id: 'ord1', status: 'Completed', totalAmount: 1200, orderType: 'Dine-In', createdAt: new Date() },
    { _id: 'ord2', status: 'Pending', totalAmount: 850, orderType: 'Takeaway', createdAt: new Date(Date.now() - 20 * 60 * 1000) },
  ];
  const mockReservations = [
    { _id: 'res1', tableNumber: 3, guests: 2, time: '14:00', status: 'Confirmed', date: new Date() },
  ];
  const mockRecentOrders = [
    { items: [{ name: 'Espresso', quantity: 5 }, { name: 'Croissant', quantity: 3 }] },
  ];

  const models = {
    Inventory: { find: () => ({ select: () => ({ sort: () => ({ lean: async () => mockInventory }) }) }) },
    Order: {
      find: (q) => ({
        select: () => {
          if (q.status && q.status.$ne) {
            return { sort: () => ({ limit: () => ({ lean: async () => mockRecentOrders }) }) };
          }
          return { lean: async () => mockOrders };
        },
      }),
    },
    Reservation: { find: () => ({ select: () => ({ lean: async () => mockReservations }) }) },
  };

  const context = await loadAdminContext(models);

  assert.equal(context.sales.totalRevenueToday, 1200);
  assert.equal(context.sales.completedOrdersCount, 1);
  assert.equal(context.orders.pendingCount, 1);
  assert.equal(context.orders.urgentCount, 1); // 20 mins old > 15
  assert.equal(context.inventory.outOfStockCount, 1);
  assert.deepEqual(context.inventory.outOfStockList, ['Matcha']);
  assert.equal(context.inventory.lowStockCount, 1);
  assert.equal(context.inventory.lowStockList[0].name, 'Croissant');
  assert.equal(context.reservations.confirmedToday, 1);
  assert.equal(context.reservations.totalGuestsExpected, 2);
  assert.equal(context.inventory.topSelling[0].name, 'Espresso');
  assert.equal(context.inventory.topSelling[0].unitsSold, 5);
});

test('Admin AI: deterministic guide distinguishes confirmed facts and operational suggestions', () => {
  const context = {
    todayDate: '2026-11-22',
    sales: { totalRevenueToday: 4500, completedOrdersCount: 3, totalOrdersToday: 4 },
    orders: {
      pendingCount: 1,
      pendingList: [{ id: 'ABC123', status: 'Pending', type: 'Dine-In', total: 1500 }],
      urgentCount: 1,
    },
    inventory: {
      totalProductsCount: 10,
      outOfStockCount: 1,
      outOfStockList: ['Matcha Latte'],
      lowStockCount: 1,
      lowStockList: [{ name: 'Oat Milk', stock: 2, threshold: 5 }],
      topSelling: [{ name: 'Cappuccino', unitsSold: 8 }],
      slowPerforming: [{ name: 'Chai Tea', stock: 12, category: 'Tea' }],
    },
    reservations: {
      totalToday: 2,
      confirmedToday: 1,
      pendingToday: 1,
      totalGuestsExpected: 5,
      scheduledSlots: ['Table #2 at 18:00 (3 guests)'],
    },
  };

  // Test asking about sales
  const salesReply = buildAdminGuideReply('What are today sales and revenue?', context);
  assert.match(salesReply.reply, /CONFIRMED FACTS - TODAY'S SALES/);
  assert.match(salesReply.reply, /Total Revenue: Rs. 4,500/);
  assert.equal(salesReply.metrics.salesToday, 4500);

  // Test asking about low stock
  const stockReply = buildAdminGuideReply('Which items are out of stock or low?', context);
  assert.match(stockReply.reply, /CONFIRMED FACTS - INVENTORY HEALTH/);
  assert.match(stockReply.reply, /Out of Stock Items \(1\): Matcha Latte/);
  assert.match(stockReply.reply, /Low Stock Warnings \(1\): Oat Milk \(2 left\)/);
  assert.equal(stockReply.metrics.outOfStockCount, 1);
  assert.equal(stockReply.metrics.lowStockCount, 1);
  assert.ok(stockReply.suggestions.some((s) => s.includes('Restock Alert')));

  // Test asking about pending orders
  const ordersReply = buildAdminGuideReply('Are there any pending or urgent orders?', context);
  assert.match(ordersReply.reply, /Active Orders in Queue: 1/);
  assert.match(ordersReply.reply, /Urgent Orders/);
  assert.ok(ordersReply.suggestions.some((s) => s.includes('Priority Action')));

  // Test asking about reservations
  const resReply = buildAdminGuideReply('What reservations are scheduled today?', context);
  assert.match(resReply.reply, /CONFIRMED FACTS - TODAY'S RESERVATIONS/);
  assert.match(resReply.reply, /Total Guests Expected: 5/);
});

test('Admin AI: unconfigured or failed AI falls back to guide without crashing', async () => {
  const context = {
    todayDate: '2026-11-22',
    sales: { totalRevenueToday: 0, completedOrdersCount: 0, totalOrdersToday: 0 },
    orders: { pendingCount: 0, pendingList: [], urgentCount: 0 },
    inventory: {
      totalProductsCount: 5,
      outOfStockCount: 0,
      outOfStockList: [],
      lowStockCount: 0,
      lowStockList: [],
      topSelling: [],
      slowPerforming: [],
    },
    reservations: { totalToday: 0, confirmedToday: 0, pendingToday: 0, totalGuestsExpected: 0, scheduledSlots: [] },
  };

  const reply = await getAdminAssistantReply({
    message: 'Give me a summary',
    history: [],
    context,
    apiKey: '', // unconfigured
    provider: 'openai',
  });

  assert.equal(reply.mode, 'guide');
  assert.match(reply.reply, /OPERATIONS SNAPSHOT/);
  assert.equal(reply.availability.code, 'not_configured');
});

test('Scenario 6: Role authorization middleware blocks non-admin users from admin AI', () => {
  const { authorize } = require('../src/middlewares/auth.middleware');
  const adminOnly = authorize('admin');

  let nextCalled = false;
  let status = null;
  let responseData = null;

  const mockRes = {
    status: (s) => {
      status = s;
      return {
        json: (data) => { responseData = data; },
      };
    },
  };

  // 1. Regular customer attempting access
  adminOnly({ user: { role: 'customer' } }, mockRes, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(status, 403);
  assert.equal(responseData.success, false);
  assert.match(responseData.error, /not authorized/);

  // 2. Admin attempting access
  nextCalled = false;
  adminOnly({ user: { role: 'admin' } }, mockRes, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('Scenario 3 & 4: Customer AI context strictly isolates records to authenticated customer', async () => {
  const { loadCustomerContext } = require('../src/domains/assistant/assistant.controller');

  let orderFilter = null;
  let reservationFilter = null;

  const mockModels = {
    Inventory: {
      find: () => ({
        select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
      }),
    },
    Order: {
      find: (filter) => {
        orderFilter = filter;
        return {
          select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
        };
      },
    },
    Reservation: {
      find: (filter) => {
        reservationFilter = filter;
        return {
          select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
        };
      },
    },
  };

  const customerId = 'cust_user_456';
  await loadCustomerContext(customerId, mockModels);

  // Assert queries were strictly filtered by req.user.id
  assert.equal(orderFilter.customer, customerId);
  assert.equal(reservationFilter.customer, customerId);
});

