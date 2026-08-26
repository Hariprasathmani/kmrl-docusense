// config/db.js — MongoDB connection via Mongoose
'use strict';

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌  MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);

    console.log(`✅  MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);

    // Surface important connection events
    mongoose.connection.on('disconnected', () =>
      console.warn('⚠️   MongoDB disconnected.')
    );
    mongoose.connection.on('reconnected', () =>
      console.log('🔄  MongoDB reconnected.')
    );
  } catch (err) {
    console.error(`❌  MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
