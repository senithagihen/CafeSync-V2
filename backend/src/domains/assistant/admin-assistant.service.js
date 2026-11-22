const Inventory = require('../inventory/inventory.model');
const Order = require('../orders/order.model');
const Reservation = require('../reservations/reservation.model');
const { resolveAIConfig } = require('../../config/ai');
const {
  CUSTOMER_UNAVAILABLE_MESSAGE,
  readProviderFailure,
  classifyNetworkFailure,
  logProviderFailure,
} = require('./assistant.provider');

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_LENGTH = 10;

function validateAdminChat(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Please send a message.');
  }
  if (typeof body.message !== 'string' || !body.message.trim()) {
    throw new Error('Please enter a message.');
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Keep your message under ${MAX_MESSAGE_LENGTH + 1} characters.`);
  }
  const history = body.history === undefined ? [] : body.history;
  if (!Array.isArray(history) || history.length > MAX_HISTORY_LENGTH) {
    throw new Error(`Conversation history must contain at most ${MAX_HISTORY_LENGTH} messages.`);
  }
  if (history.some((entry) => !entry || !['user', 'assistant'].includes(entry.role)
    || typeof entry.content !== 'string' || !entry.content.trim()
    || entry.content.length > MAX_MESSAGE_LENGTH)) {
    throw new Error('Conversation history contains an invalid message.');
  }
  return {
    message: body.message.trim(),
    history: history.map(({ role, content }) => ({ role, content: content.trim() })),
  };
}

/**
 * Loads real-time, aggregated business metrics for the admin assistant.
 */
async function loadAdminContext(models = { Inventory, Order, Reservation }) {
  // Start of day in local Sri Lanka time (Asia/Colombo UTC+05:30)
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(now);
  const startOfDay = new Date(`${todayStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${todayStr}T23:59:59.999+05:30`);

  const [allInventory, todayOrders, todayReservations, allRecentOrders] = await Promise.all([
    models.Inventory.find({ isActive: true })
      .select('_id name category price stock lowStockThreshold').sort({ name: 1 }).lean(),
    models.Order.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
      .select('_id status totalAmount orderType paymentStatus createdAt items').lean(),
    models.Reservation.find({ date: { $gte: startOfDay, $lte: endOfDay } })
      .select('_id tableNumber guests time status customer').lean(),
    models.Order.find({ status: { $ne: 'Cancelled' } })
      .select('items totalAmount createdAt').sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  // Inventory analysis
  const outOfStockItems = allInventory.filter((item) => (item.stock || 0) <= 0);
  const lowStockItems = allInventory.filter((item) => {
    const threshold = Number.isFinite(item.lowStockThreshold) ? item.lowStockThreshold : 5;
    return (item.stock || 0) > 0 && (item.stock || 0) <= threshold;
  });

  // Sales and order metrics
  const completedOrders = todayOrders.filter((o) => o.status === 'Completed');
  const salesToday = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = todayOrders.filter((o) => ['Pending', 'Preparing'].includes(o.status));
  const urgentOrders = todayOrders.filter((o) => {
    const isPending = o.status === 'Pending';
    const ageMinutes = (now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 60);
    return isPending && ageMinutes > 15;
  });

  // Product popularity calculation from recent non-cancelled orders
  const productSalesMap = {};
  for (const o of allRecentOrders) {
    for (const item of (o.items || [])) {
      const name = item.name || 'Unknown Item';
      productSalesMap[name] = (productSalesMap[name] || 0) + (Number(item.quantity) || 1);
    }
  }

  const sortedSales = Object.entries(productSalesMap).sort((a, b) => b[1] - a[1]);
  const topSelling = sortedSales.slice(0, 5).map(([name, qty]) => ({ name, unitsSold: qty }));
  
  // Products with zero recent sales
  const soldNames = new Set(Object.keys(productSalesMap));
  const slowPerforming = allInventory
    .filter((item) => !soldNames.has(item.name))
    .slice(0, 5)
    .map((item) => ({ name: item.name, stock: item.stock, category: item.category }));

  // Reservation metrics
  const confirmedReservations = todayReservations.filter((r) => r.status === 'Confirmed');
  const pendingReservations = todayReservations.filter((r) => r.status === 'Pending');
  const totalGuestsToday = todayReservations
    .filter((r) => ['Confirmed', 'Pending'].includes(r.status))
    .reduce((sum, r) => sum + (r.guests || 0), 0);

  return {
    todayDate: todayStr,
    sales: {
      totalRevenueToday: salesToday,
      completedOrdersCount: completedOrders.length,
      totalOrdersToday: todayOrders.length,
    },
    orders: {
      pendingCount: pendingOrders.length,
      pendingList: pendingOrders.map((o) => ({
        id: String(o._id).slice(-6).toUpperCase(),
        status: o.status,
        type: o.orderType,
        total: o.totalAmount,
      })),
      urgentCount: urgentOrders.length,
    },
    inventory: {
      totalProductsCount: allInventory.length,
      outOfStockCount: outOfStockItems.length,
      outOfStockList: outOfStockItems.map((i) => i.name),
      lowStockCount: lowStockItems.length,
      lowStockList: lowStockItems.map((i) => ({
        name: i.name,
        stock: i.stock,
        threshold: i.lowStockThreshold || 5,
      })),
      topSelling,
      slowPerforming,
    },
    reservations: {
      totalToday: todayReservations.length,
      confirmedToday: confirmedReservations.length,
      pendingToday: pendingReservations.length,
      totalGuestsExpected: totalGuestsToday,
      scheduledSlots: todayReservations
        .filter((r) => ['Confirmed', 'Pending'].includes(r.status))
        .map((r) => `Table #${r.tableNumber} at ${r.time} (${r.guests} guests)`),
    },
  };
}

/**
 * Builds a deterministic, 100% data-verified response when AI is offline or unconfigured.
 */
function buildAdminGuideReply(message, context) {
  const text = message.toLowerCase();
  const parts = [];
  const suggestions = [];

  const asksSales = /\b(sales?|revenue|income|earning|total|money)\b/.test(text);
  const asksOrders = /\b(orders?|pending|preparing|urgent|pipeline)\b/.test(text);
  const asksStock = /\b(stock|inventory|low|out\s*of\s*stock|restock|item)\b/.test(text);
  const asksBookings = /\b(reservation|reservations|booking|bookings|table|tables|guest)\b/.test(text);
  const asksTop = /\b(top|best|popular|selling|favorite|performing|slow)\b/.test(text);

  if (asksSales) {
    parts.push(
      `[CONFIRMED FACTS - TODAY'S SALES (${context.todayDate})]\n` +
      `• Total Revenue: Rs. ${context.sales.totalRevenueToday.toLocaleString('en-LK')}\n` +
      `• Completed Orders: ${context.sales.completedOrdersCount}\n` +
      `• Total Orders Received: ${context.sales.totalOrdersToday}`
    );
    if (context.sales.totalOrdersToday > 0) {
      const avg = (context.sales.totalRevenueToday / (context.sales.completedOrdersCount || 1)).toFixed(0);
      suggestions.push(`Average order value today is Rs. ${avg}.`);
    }
  }

  if (asksOrders) {
    const list = context.orders.pendingList.map((o) => `#${o.id} (${o.type}, Rs. ${o.total})`).join(', ');
    parts.push(
      `[CONFIRMED FACTS - ORDER PIPELINE]\n` +
      `• Active Orders in Queue: ${context.orders.pendingCount}\n` +
      (context.orders.pendingCount > 0 ? `• Queue: ${list}\n` : '') +
      `• Urgent Orders (>15m pending): ${context.orders.urgentCount}`
    );
    if (context.orders.urgentCount > 0) {
      suggestions.push('Priority Action: Attend to delayed pending orders in the Order Manager immediately.');
    }
  }

  if (asksStock) {
    const outList = context.inventory.outOfStockList.join(', ') || 'None';
    const lowList = context.inventory.lowStockList.map((i) => `${i.name} (${i.stock} left)`).join(', ') || 'None';
    parts.push(
      `[CONFIRMED FACTS - INVENTORY HEALTH]\n` +
      `• Out of Stock Items (${context.inventory.outOfStockCount}): ${outList}\n` +
      `• Low Stock Warnings (${context.inventory.lowStockCount}): ${lowList}\n` +
      `• Total Active Products: ${context.inventory.totalProductsCount}`
    );
    if (context.inventory.outOfStockCount > 0 || context.inventory.lowStockCount > 0) {
      suggestions.push(`Restock Alert: Prioritize replenishing ${outList !== 'None' ? outList : lowList}.`);
    }
  }

  if (asksBookings) {
    const slots = context.reservations.scheduledSlots.slice(0, 4).join('; ') || 'No bookings scheduled';
    parts.push(
      `[CONFIRMED FACTS - TODAY'S RESERVATIONS]\n` +
      `• Total Scheduled Today: ${context.reservations.totalToday}\n` +
      `• Confirmed Bookings: ${context.reservations.confirmedToday} | Pending: ${context.reservations.pendingToday}\n` +
      `• Total Guests Expected: ${context.reservations.totalGuestsExpected}\n` +
      `• Schedule: ${slots}`
    );
  }

  if (asksTop) {
    const topStr = context.inventory.topSelling.map((p) => `${p.name} (${p.unitsSold} sold)`).join(', ') || 'No sales recorded yet';
    const slowStr = context.inventory.slowPerforming.map((p) => p.name).join(', ') || 'None';
    parts.push(
      `[CONFIRMED FACTS - PRODUCT PERFORMANCE]\n` +
      `• Top Sellers: ${topStr}\n` +
      `• Underperforming Items (Zero recent sales): ${slowStr}`
    );
    if (context.inventory.slowPerforming.length > 0) {
      suggestions.push(`Promotion Opportunity: Consider featuring slow items (${slowStr}) in daily specials.`);
    }
  }

  // Fallback overview if query was generic
  if (!parts.length) {
    parts.push(
      `[CONFIRMED FACTS - OPERATIONS SNAPSHOT (${context.todayDate})]\n` +
      `• Revenue: Rs. ${context.sales.totalRevenueToday.toLocaleString('en-LK')} (${context.sales.completedOrdersCount} orders)\n` +
      `• Active Orders: ${context.orders.pendingCount} in progress\n` +
      `• Stock Alerts: ${context.inventory.outOfStockCount} out of stock, ${context.inventory.lowStockCount} low stock\n` +
      `• Reservations: ${context.reservations.totalToday} bookings (${context.reservations.totalGuestsExpected} guests)`
    );
    suggestions.push('Ask me about: "Today\'s sales", "Low stock items", "Pending orders", or "Top sellers".');
  }

  return {
    reply: parts.join('\n\n'),
    mode: 'guide',
    metrics: {
      salesToday: context.sales.totalRevenueToday,
      pendingOrders: context.orders.pendingCount,
      lowStockCount: context.inventory.lowStockCount,
      outOfStockCount: context.inventory.outOfStockCount,
    },
    suggestions,
  };
}

function adminResponseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      reply: { type: 'string' },
      suggestions: { type: 'array', items: { type: 'string' } },
    },
    required: ['reply', 'suggestions'],
  };
}

async function getAdminAssistantReply({
  message,
  history,
  context,
  apiKey,
  provider = 'openai',
  model,
  fetchImpl = fetch,
  logger = console.warn,
}) {
  const guide = (failure) => {
    logProviderFailure(logger, failure);
    return {
      ...buildAdminGuideReply(message, context),
      availability: { code: failure.code, message: CUSTOMER_UNAVAILABLE_MESSAGE },
    };
  };

  if (!['openai', 'gemini'].includes(provider) || (model !== undefined && typeof model !== 'string')) {
    return guide({ code: 'invalid_configuration' });
  }
  if (typeof apiKey !== 'string' || !apiKey.trim()) return guide({ code: 'not_configured' });

  const providerKey = apiKey.trim();
  const resolvedModel = model?.trim() || (provider === 'gemini' ? 'gemini-3.5-flash-lite' : 'gpt-4.1-mini');

  const instructions = [
    'You are the CafeSync Admin Operations Assistant. You assist cafe managers and staff with real-time operational analysis, sales insights, inventory health, order queues, and reservations.',
    'Use ONLY the authorized operational data provided below. Never invent numbers, revenue figures, order counts, or product names.',
    'Clearly distinguish between CONFIRMED FACTS (exact numbers directly from the system) and OPERATIONAL SUGGESTIONS / RECOMMENDATIONS.',
    'Keep replies concise, professional, structured, and easy to read on mobile or desktop (under 250 words).',
    'Do not perform destructive operations autonomously. You are a decision-support assistant.',
    'Never reveal API keys, user passwords, or internal server configurations.',
  ].join('\n');

  const liveData = `Operational Data for Cafe Admin:\n${JSON.stringify(context)}`;

  let receivedResponse = false;
  try {
    const isGemini = provider === 'gemini';
    const endpoint = isGemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`
      : 'https://api.openai.com/v1/responses';

    const requestBody = isGemini
      ? {
        systemInstruction: { parts: [{ text: instructions }, { text: liveData }] },
        contents: [
          ...history.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: adminResponseSchema(),
          maxOutputTokens: 900,
        },
      }
      : {
        model: resolvedModel,
        instructions,
        store: false,
        max_output_tokens: 900,
        input: [{ role: 'developer', content: liveData }, ...history, { role: 'user', content: message }],
        text: {
          format: {
            type: 'json_schema',
            name: 'admin_assistant_reply',
            strict: true,
            schema: adminResponseSchema(),
          },
        },
      };

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        ...(isGemini ? { 'x-goog-api-key': providerKey } : { Authorization: `Bearer ${providerKey}` }),
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify(requestBody),
    });

    receivedResponse = true;
    if (!response.ok) return guide(await readProviderFailure(response, provider));

    const payload = await response.json();
    let parsed;
    if (isGemini) {
      const candidate = payload?.candidates?.[0];
      const text = candidate?.content?.parts
        ?.filter((p) => p.thought !== true && typeof p.text === 'string')
        ?.map((p) => p.text)
        ?.join('');
      parsed = JSON.parse(text);
    } else {
      const rawText = payload.output
        ?.filter((item) => item.type === 'message')
        ?.flatMap((item) => (Array.isArray(item.content) ? item.content : []))
        ?.filter((p) => p.type === 'output_text')
        ?.map((p) => p.text)
        ?.join('');
      parsed = JSON.parse(rawText);
    }

    return {
      reply: parsed.reply.trim(),
      mode: 'ai',
      metrics: {
        salesToday: context.sales.totalRevenueToday,
        pendingOrders: context.orders.pendingCount,
        lowStockCount: context.inventory.lowStockCount,
        outOfStockCount: context.inventory.outOfStockCount,
      },
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error) {
    const networkFailure = classifyNetworkFailure(error);
    return guide({
      code: networkFailure === 'timeout' ? 'timeout' : receivedResponse ? 'invalid_response' : networkFailure,
    });
  }
}

module.exports = {
  validateAdminChat,
  loadAdminContext,
  buildAdminGuideReply,
  getAdminAssistantReply,
};
