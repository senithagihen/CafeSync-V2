const Payment = require('./payment.model');
const Order = require('../orders/order.model');

// @desc    Record a new payment
// @route   POST /api/payments
// @access  Private
exports.recordPayment = async (req, res, next) => {
  try {
    const { order: orderId, paymentMethod } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (req.user.role !== 'admin' && String(order.customer) !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized for this order' });
    }
    // Staff confirm collection through the protected payment status endpoint.
    const payment = await Payment.create({
      order: orderId,
      customer: order.customer,
      amount: order.totalAmount,
      paymentMethod,
      status: 'Pending',
    });

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'admin') {
      query = Payment.find().populate('customer', 'name email').populate('order');
    } else {
      query = Payment.find({ customer: req.user.id }).populate('order');
    }

    const payments = await query.sort('-createdAt');
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    next(err);
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id
// @access  Private (Admin)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { status } = req.body;
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    payment.status = status;
    await payment.save();

    // If payment completed, update order status
    if (status === 'Completed') {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'Paid';
        await order.save();
      }
    }

    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
exports.deletePayment = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // If the payment being deleted was completed, we might want to update the order status
    if (payment.status === 'Completed') {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'Pending';
        await order.save();
      }
    }

    await payment.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
