const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateStockAlerts,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('../src/domains/notifications/notification.service');

function createMockNotificationModels() {
  const notifications = [];
  const stockMovements = [];

  const Notification = {
    create: async (doc) => {
      const created = { _id: `notif_${notifications.length + 1}`, createdAt: new Date(), resolvedAt: null, ...doc };
      notifications.push(created);
      return created;
    },
    findOne: async (query) => {
      return notifications.find((n) => {
        if (query.item && String(n.item) !== String(query.item)) return false;
        if (query.type && n.type !== query.type) return false;
        if (query.resolvedAt === null && n.resolvedAt !== null) return false;
        return true;
      }) || null;
    },
    find: () => ({
      populate: () => ({
        sort: () => ({
          limit: (n) => ({
            lean: async () => notifications.slice(0, n),
          }),
        }),
      }),
    }),
    updateMany: async (query, update) => {
      let count = 0;
      for (const n of notifications) {
        if (query.item && String(n.item) !== String(query.item)) continue;
        if (query.resolvedAt === null && n.resolvedAt !== null) continue;
        if (query.isRead === false && n.isRead !== false) continue;
        if (update.$set) Object.assign(n, update.$set);
        count++;
      }
      return { modifiedCount: count };
    },
    findByIdAndUpdate: async (id, update) => {
      const n = notifications.find((x) => x._id === id);
      if (n && update.isRead !== undefined) n.isRead = update.isRead;
      return n || null;
    },
    countDocuments: async (query) => {
      return notifications.filter((n) => {
        if (query.isRead !== undefined && n.isRead !== query.isRead) return false;
        return true;
      }).length;
    },
    _raw: notifications,
  };

  const StockMovement = {
    create: async (doc) => {
      const created = { _id: `sm_${stockMovements.length + 1}`, createdAt: new Date(), ...doc };
      stockMovements.push(created);
      return created;
    },
    _raw: stockMovements,
  };

  return { Notification, StockMovement };
}

test('Scenario 7: Stock above threshold produces no low-stock notification', async () => {
  const models = createMockNotificationModels();
  const product = { _id: 'prod1', name: 'Espresso Beans', lowStockThreshold: 5 };

  const result = await evaluateStockAlerts({
    product,
    previousStock: 20,
    currentStock: 15,
    models,
  });

  assert.equal(result, null);
  assert.equal(models.Notification._raw.length, 0);
  assert.equal(models.StockMovement._raw.length, 1);
  assert.equal(models.StockMovement._raw[0].change, -5);
});

test('Scenario 8 & 9: Stock crossing below or equal to threshold creates a low-stock alert', async () => {
  const models = createMockNotificationModels();
  const product = { _id: 'prod2', name: 'Almond Milk', lowStockThreshold: 5 };

  // Stock equal to threshold (5)
  const result = await evaluateStockAlerts({
    product,
    previousStock: 10,
    currentStock: 5,
    reason: 'order_placed',
    referenceId: 'ord_123',
    models,
  });

  assert.ok(result);
  assert.equal(result.type, 'low_stock');
  assert.equal(result.severity, 'warning');
  assert.equal(result.currentStock, 5);
  assert.equal(result.threshold, 5);
  assert.equal(models.Notification._raw.length, 1);
  assert.equal(models.StockMovement._raw[0].reason, 'order_placed');
});

test('Scenario 10: Zero stock creates a critical out-of-stock alert', async () => {
  const models = createMockNotificationModels();
  const product = { _id: 'prod3', name: 'Caramel Syrup', lowStockThreshold: 3 };

  const result = await evaluateStockAlerts({
    product,
    previousStock: 2,
    currentStock: 0,
    models,
  });

  assert.ok(result);
  assert.equal(result.type, 'out_of_stock');
  assert.equal(result.severity, 'critical');
  assert.equal(result.currentStock, 0);
  assert.equal(models.Notification._raw.length, 1);
});

test('Scenario 11: Multiple updates do not generate duplicate unresolved alerts (Deduplication)', async () => {
  const models = createMockNotificationModels();
  const product = { _id: 'prod4', name: 'Vanilla Ice Cream', lowStockThreshold: 4 };

  // First drop below threshold
  const first = await evaluateStockAlerts({
    product,
    previousStock: 8,
    currentStock: 3,
    models,
  });
  assert.ok(first);
  assert.equal(models.Notification._raw.length, 1);

  // Subsequent order further decrements stock from 3 to 2
  const second = await evaluateStockAlerts({
    product,
    previousStock: 3,
    currentStock: 2,
    models,
  });

  // Must deduplicate and return existing unresolved alert without creating a 2nd
  assert.equal(models.Notification._raw.length, 1);
  assert.equal(second._id, first._id);

  // Both movements were recorded
  assert.equal(models.StockMovement._raw.length, 2);
});

test('Scenario 13: Stock replenishment resolves the relevant alert correctly', async () => {
  const models = createMockNotificationModels();
  const product = { _id: 'prod5', name: 'Matcha Powder', lowStockThreshold: 5 };

  // Drop to 1 item
  await evaluateStockAlerts({
    product,
    previousStock: 6,
    currentStock: 1,
    models,
  });
  assert.equal(models.Notification._raw.length, 1);
  assert.equal(models.Notification._raw[0].resolvedAt, null);

  // Restocked to 20 items (above threshold 5)
  await evaluateStockAlerts({
    product,
    previousStock: 1,
    currentStock: 20,
    reason: 'restock',
    models,
  });

  assert.equal(models.Notification._raw.length, 1);
  assert.ok(models.Notification._raw[0].resolvedAt instanceof Date);
  assert.equal(models.StockMovement._raw[1].reason, 'restock');
});

test('Scenario 14 & 15: Staff read/acknowledgement and unread count', async () => {
  const models = createMockNotificationModels();
  const product = { _id: 'prod6', name: 'Chai Tea', lowStockThreshold: 3 };

  await evaluateStockAlerts({ product, previousStock: 5, currentStock: 2, models });
  assert.equal(await getUnreadCount(models), 1);

  const notif = models.Notification._raw[0];
  await markAsRead(notif._id, models);
  assert.equal(models.Notification._raw[0].isRead, true);
  assert.equal(await getUnreadCount(models), 0);
});
