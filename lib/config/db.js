const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, isConnected: false };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    // Graceful fallback to memory store if no MongoDB URI provided
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      cached.isConnected = true;
      console.log(`[Database] MongoDB Connected to ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.warn(`[Database] MongoDB connection error (${err.message}). Using in-memory fallback store.`);
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.conn = null;
  }

  return cached.conn;
}

function isDbConnected() {
  return cached && cached.isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbConnected };
