// server/seeds/backfillFileHashes.js
'use strict';

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const crypto = require('crypto');
const Document = require('../models/Document');

const isDryRun = process.argv.includes('--dry-run');

async function backfillFileHashes() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI is not defined in .env');
      process.exit(1);
    }

    console.log(`Connecting to MongoDB at ${process.env.MONGO_URI}...`);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.');

    if (isDryRun) {
      console.log('\n=======================================');
      console.log('      RUNNING IN DRY-RUN MODE          ');
      console.log('   (No database changes will be made)  ');
      console.log('=======================================\n');
    }

    const docs = await Document.find({
      $or: [
        { fileHash: { $exists: false } },
        { fileHash: null },
      ]
    });

    console.log(`Found ${docs.length} documents requiring fileHash backfill.\n`);

    let successCount = 0;
    let missingCount = 0;
    let collisionCount = 0;

    for (const doc of docs) {
      if (!fs.existsSync(doc.filePath)) {
        console.warn(`[SKIP] File not found for document ID: ${doc._id} | Title: ${doc.title} | Path: ${doc.filePath}`);
        missingCount++;
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(doc.filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        if (isDryRun) {
          console.log(`[DRY RUN] Would update document ID: ${doc._id} with hash: ${fileHash}`);
          successCount++;
        } else {
          doc.fileHash = fileHash;
          await doc.save();
          console.log(`[SUCCESS] Updated document ID: ${doc._id} with hash: ${fileHash}`);
          successCount++;
        }
      } catch (err) {
        if (err.code === 11000 && err.keyPattern && err.keyPattern.fileHash) {
          console.warn(`[COLLISION] Document ID: ${doc._id} has identical contents to an already-hashed document. Skipping...`);
          collisionCount++;
        } else {
          console.error(`[ERROR] Failed to process document ID: ${doc._id}`, err);
        }
      }
    }

    console.log('\n=======================================');
    console.log('          BACKFILL COMPLETE            ');
    console.log('=======================================');
    console.log(`Documents successfully ${isDryRun ? 'dry-run simulated' : 'updated'}: ${successCount}`);
    console.log(`Skipped (File missing): ${missingCount}`);
    console.log(`Skipped (Duplicate collision): ${collisionCount}`);

  } catch (error) {
    console.error('\nFatal Error during backfill:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

backfillFileHashes();
