const express = require('express');
const {
  listNotifications,
  readNotification,
  readAllNotifications,
  unreadCount,
} = require('./notification.controller');
const { protect, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', listNotifications);
router.get('/unread-count', unreadCount);
router.put('/read-all', readAllNotifications);
router.put('/:id/read', readNotification);

module.exports = router;
