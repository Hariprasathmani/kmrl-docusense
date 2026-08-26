'use strict';

const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  result: { type: String, enum: ['PROCESSED', 'FAILED', 'SKIPPED', 'DUPLICATE'], required: true },
  reason: { type: String, default: '' },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
}, { _id: false });

const emailProcessingLogSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  sender: { type: String, default: '' },
  subject: { type: String, default: '' },
  receivedAt: { type: Date, default: null },
  status: { type: String, enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED'], default: 'RECEIVED', index: true },
  attachments: [attachmentSchema],
  error: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('EmailProcessingLog', emailProcessingLogSchema);
