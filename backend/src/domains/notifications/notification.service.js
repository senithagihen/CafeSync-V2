const Notification = require('./notification.model');
const StockMovement = require('../inventory/stock-movement.model');

const DEDUPLICATION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Evaluates stock thresholds, records stock movements, and generates deduplicated alerts.
 */
async function evaluateStockAlerts({
  product,
  previousStock,
  currentStock,
  actor = null,
  referenceId = '',
  reason = 'manual_adjustment',
  models = { Notification, StockMovement },
}) {
  if (!product || !product._id) return null;

  const threshold = Number.isFinite(product.lowStockThreshold) ? product.lowStockThreshold : 5;
  const prev = Number(previousStock);
  const curr = Number(currentStock);

  // 1. Record stock movement audit trail if quantity changed
  if (Number.isFinite(prev) && Number.isFinite(curr) && prev !== curr) {
    try {
      await models.StockMovement.create({
        product: product._id,
        change: curr - prev,
        previousStock: prev,
        newStock: curr,
        reason,
        referenceId: referenceId || undefined,
        performedBy: actor || undefined,
      });
    } catch {
      // Audit failure must never prevent order completion
    }
  }

  // 2. Replenishment: if stock went from low/out to above threshold, resolve pending alerts
  if (curr > threshold) {
    try {
      await models.Notification.updateMany(
        { item: product._id, resolvedAt: null },
        { $set: { resolvedAt: new Date() } }
      );
    } catch {
      // Non-blocking resolution
    }
    return null;
  }

  // 3. Out of stock condition
  if (curr <= 0) {
    const cutoff = new Date(Date.now() - DEDUPLICATION_WINDOW_MS);
    const existing = await models.Notification.findOne({
      item: product._id,
      type: 'out_of_stock',
      resolvedAt: null,
      createdAt: { $gte: cutoff },
    });

    if (existing) return existing; // Deduplicated

    return models.Notification.create({
      type: 'out_of_stock',
      title: `Critical Out of Stock: ${product.name}`,
      message: `${product.name} is completely out of stock (0 items remaining). Immediate restock required.`,
      item: product._id,
      currentStock: 0,
      threshold,
      severity: 'critical',
      isRead: false,
      resolvedAt: null,
    });
  }

  // 4. Low stock condition
  if (curr <= threshold) {
    const cutoff = new Date(Date.now() - DEDUPLICATION_WINDOW_MS);
    const existing = await models.Notification.findOne({
      item: product._id,
      type: 'low_stock',
      resolvedAt: null,
      createdAt: { $gte: cutoff },
    });

    if (existing) return existing; // Deduplicated

    return models.Notification.create({
      type: 'low_stock',
      title: `Low Stock Alert: ${product.name}`,
      message: `${product.name} is running low (${curr} remaining, minimum threshold is ${threshold}).`,
      item: product._id,
      currentStock: curr,
      threshold,
      severity: 'warning',
      isRead: false,
      resolvedAt: null,
    });
  }

  return null;
}

async function getNotifications({ limit = 50, models = { Notification } } = {}) {
  return models.Notification.find()
    .populate('item', 'name category price stock lowStockThreshold')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function markAsRead(id, models = { Notification }) {
  return models.Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
}

async function markAllAsRead(models = { Notification }) {
  return models.Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
}

async function getUnreadCount(models = { Notification }) {
  return models.Notification.countDocuments({ isRead: false });
}

module.exports = {
  evaluateStockAlerts,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  DEDUPLICATION_WINDOW_MS,
};
