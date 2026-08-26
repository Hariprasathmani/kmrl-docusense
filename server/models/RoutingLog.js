const mongoose = require('mongoose');

const routingLogSchema = new mongoose.Schema(
  {
    // Reference to the document that was routed
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    // Department the document was routed to
    department: {
      type: String,
      required: true,
    },
    // AI confidence score at the time of routing (0–100)
    confidenceScore: {
      type: Number,
      required: true,
    },
    // Timestamp when the document was routed
    routedAt: {
      type: Date,
      default: Date.now,
    },
    // Entity responsible for routing (defaults to AI auto-routing)
    routedBy: {
      type: String,
      default: 'AI',
    },
    // Current delivery status of the routed document
    status: {
      type: String,
      enum: ['Routed', 'Delivered', 'Viewed'],
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  }
);

const RoutingLog = mongoose.model('RoutingLog', routingLogSchema);

module.exports = RoutingLog;
