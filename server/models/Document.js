const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    // The title of the document
    title: {
      type: String,
      required: true,
    },
    // The original file name when uploaded
    originalFileName: {
      type: String,
      required: true,
    },
    // Path where the document is stored on the server/storage
    filePath: {
      type: String,
      required: true,
    },
    // The format or type of the document
    documentType: {
      type: String,
      enum: ['PDF', 'DOCX', 'TXT', 'EMAIL'],
    },
    // Reference to the user who uploaded the document
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // AI-generated summary of the document's content
    summary: {
      type: String,
      default: '',
    },
    // The department associated with or responsible for this document
    department: {
      type: String,
      enum: ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'],
    },
    // Confidence score for AI predictions/extractions (0 to 100 or 0 to 1)
    confidenceScore: {
      type: Number,
      default: 0,
    },
    // The priority level assigned to this document
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
    },
    // Array of keywords extracted from the document for searchability
    keywords: [
      {
        type: String,
      },
    ],
    // Extracted raw text from the document via AI Service
    extractedText: {
      type: String,
    },
    // The size of the file in bytes
    fileSize: {
      type: Number,
    },
    // Current processing status of the document in the automation pipeline
    status: {
      type: String,
      enum: ['Pending', 'Processed', 'Routed'],
    },
    // Indicates whether the document has been reviewed by a human
    isReviewed: {
      type: Boolean,
      default: false,
    },
    // Reference back to the auto-generated Ticket (format: KMRL-YYYY-000001)
    // Populated automatically during the upload pipeline after ticket creation.
    ticketId: {
      type: String,
      default: null,
    },
    // Array of departments this document is explicitly shared with
    sharedWith: [
      {
        department: {
          type: String,
          enum: ['Finance', 'HR', 'Legal', 'Operations', 'Safety', 'IT'],
          required: true,
        },
        sharedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
    // SHA-256 hash of the uploaded file's contents to prevent duplicates
    fileHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Where the document entered the system. Existing records are manual uploads.
    source: {
      type: String,
      enum: ['manual', 'email'],
      default: 'manual',
      index: true,
    },
    // Email-only provenance. These optional fields keep old documents compatible.
    emailMessageId: { type: String, trim: true, index: true, sparse: true },
    emailSender: { type: String, trim: true },
    emailSubject: { type: String, trim: true },
    emailReceivedAt: { type: Date },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  }
);

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
