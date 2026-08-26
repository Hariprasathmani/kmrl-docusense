// models/Notification.js — KMRL DocuSense Notification schema
'use strict';

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    // Who this notification is for (null = broadcast to all admins)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Notification type
    type: {
      type: String,
      enum: ['upload', 'classification', 'routing', 'assignment', 'error', 'system'],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Related document (optional)
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },

    // Department the notification is scoped to (null = admin broadcast)
    department: {
      type: String,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fast unread count queries
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ department: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
