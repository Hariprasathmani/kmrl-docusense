// routes/notificationRoutes.js — Notification endpoints
'use strict';

const express = require('express');
const router  = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET  /api/notifications               — list notifications
router.get('/', notificationController.getNotifications);

// GET  /api/notifications/unread-count  — unread count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/mark-all-read — mark all read
router.patch('/mark-all-read', notificationController.markAllRead);

// PATCH /api/notifications/:id/read     — mark one read
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
