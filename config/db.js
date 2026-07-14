const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doener_shop';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB verbunden:', uri);
  } catch (err) {
    console.error('❌ MongoDB Verbindung fehlgeschlagen:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
