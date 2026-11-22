const Inventory = require('./inventory.model');
const { evaluateStockAlerts } = require('../notifications/notification.service');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Public
exports.getInventoryItems = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    const items = await Inventory.find(filter);
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Public
exports.getInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// @desc    Add new inventory item
// @route   POST /api/inventory
// @access  Private (Admin)
exports.addInventoryItem = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.image = req.file.filename;
    }

    const item = await Inventory.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Admin)
exports.updateInventoryItem = async (req, res, next) => {
  try {
    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const prevStock = item.stock;

    if (req.file) {
      req.body.image = req.file.filename;
    }

    item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (req.body.stock !== undefined && Number(req.body.stock) !== prevStock) {
      const newStock = Number(req.body.stock);
      await evaluateStockAlerts({
        product: item,
        previousStock: prevStock,
        currentStock: newStock,
        actor: req.user ? req.user.id : null,
        reason: newStock > prevStock ? 'restock' : 'manual_adjustment',
      });
    }

    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete inventory item (Soft delete)
// @route   DELETE /api/inventory/:id
// @access  Private (Admin)
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // We do a soft delete for inventory to keep order history consistent
    item.isActive = false;
    await item.save();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
