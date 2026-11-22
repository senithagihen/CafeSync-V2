const express = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware');
const { chat } = require('./assistant.controller');
const { adminChat } = require('./admin-assistant.controller');
const { createAssistantLimiter } = require('./assistant.limiter');

const router = express.Router();

// Customer AI assistant route (accessible by authenticated customers)
router.post('/chat', protect, createAssistantLimiter(), chat);

// Admin Operations AI assistant route (restricted to administrators)
router.post('/admin/chat', protect, authorize('admin'), createAssistantLimiter(), adminChat);

module.exports = router;
