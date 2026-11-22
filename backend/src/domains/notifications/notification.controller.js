const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require('./notification.service');

// @desc    Get all staff/admin notifications
// @route   GET /api/notifications
// @access  Private (Admin/Staff)
exports.listNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const notifications = await getNotifications({ limit });
    const unreadCount = await getUnreadCount();
    res.status(200).json({ success: true, count: notifications.length, unreadCount, data: notifications });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (Admin/Staff)
exports.readNotification = async (req, res, next) => {
  try {
    const notification = await markAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private (Admin/Staff)
exports.readAllNotifications = async (req, res, next) => {
  try {
    await markAllAsRead();
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get count of unread notifications
// @route   GET /api/notifications/unread-count
// @access  Private (Admin/Staff)
exports.unreadCount = async (req, res, next) => {
  try {
    const count = await getUnreadCount();
    res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
};
