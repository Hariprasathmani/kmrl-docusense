// controllers/notificationController.js — Notification management
'use strict';

const Notification = require('../models/Notification');

// ── Utility: create a notification (called internally after upload/routing) ──
exports.createNotification = async ({ recipient, type, title, message, documentId, department }) => {
  try {
    await Notification.create({ recipient: recipient || null, type, title, message, documentId: documentId || null, department: department || null });
  } catch (err) {
    console.error('[Notifications] Failed to create notification:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// Admin sees all; employees see notifications for their department or addressed to them
// ─────────────────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query;
    if (req.user.role === 'Admin') {
      query = {}; // Admin sees all
    } else {
      query = {
        $or: [
          { recipient: req.user.id },
          { department: req.user.department, recipient: null },
        ],
      };
    }

    const [notifications, total, unread] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('documentId', 'title'),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount: unread,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read  — mark single notification as read
// ─────────────────────────────────────────────────────────────────────────────
exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });
    notif.isRead = true;
    await notif.save();
    return res.status(200).json({ success: true, message: 'Marked as read.' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/mark-all-read  — mark all as read for current user
// ─────────────────────────────────────────────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'Admin') {
      query = { isRead: false };
    } else {
      query = {
        isRead: false,
        $or: [
          { recipient: req.user.id },
          { department: req.user.department, recipient: null },
        ],
      };
    }
    await Notification.updateMany(query, { isRead: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ─────────────────────────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'Admin') {
      query = { isRead: false };
    } else {
      query = {
        isRead: false,
        $or: [
          { recipient: req.user.id },
          { department: req.user.department, recipient: null },
        ],
      };
    }
    const count = await Notification.countDocuments(query);
    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) { next(err); }
};
