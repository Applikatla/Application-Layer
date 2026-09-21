const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    default: 'Security block triggered',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

module.exports = mongoose.models.TokenBlacklist || mongoose.model('TokenBlacklist', tokenBlacklistSchema);
