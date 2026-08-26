'use strict';

// Reports ticket/document status drift by default. Pass --apply to update only
// the mismatched document records using the production status mapping.
require('dotenv').config();

const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Document = require('../models/Document');
const { documentStatusForTicketStatus } = require('../services/ticketService');

const applyChanges = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  await mongoose.connect(process.env.MONGO_URI);

  const tickets = await Ticket.find({}, 'ticketId status documentId').lean();
  const operations = [];
  const mismatches = [];

  for (const ticket of tickets) {
    const expectedStatus = documentStatusForTicketStatus(ticket.status);
    const document = await Document.findById(ticket.documentId, 'status').lean();
    if (!document || document.status === expectedStatus) continue;

    mismatches.push({
      ticketId: ticket.ticketId,
      ticketStatus: ticket.status,
      documentStatus: document.status,
      expectedDocumentStatus: expectedStatus,
    });
    operations.push({
      updateOne: {
        filter: { _id: document._id, status: document.status },
        update: { $set: { status: expectedStatus } },
      },
    });
  }

  console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'report-only',
    ticketsChecked: tickets.length,
    inconsistentCount: mismatches.length,
    sample: mismatches.slice(0, 10),
  }, null, 2));

  if (applyChanges && operations.length) {
    const result = await Document.bulkWrite(operations, { ordered: false });
    console.log(`Updated ${result.modifiedCount} document status record(s).`);
  }
}

main()
  .catch((error) => {
    console.error('[Ticket/document status sync]', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
