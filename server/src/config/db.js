const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/app_layer_security';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] MongoDB Connection Error: ${error.message}`);
    console.warn('[Database] Note: Ensure MongoDB is running on 127.0.0.1:27017 or set MONGODB_URI.');
  }
};

module.exports = connectDB;
