const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ip: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  username: {
    type: String,
    default: 'anonymous',
  },
  method: {
    type: String,
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  statusCode: {
    type: Number,
    required: true,
  },
  responseTimeMs: {
    type: Number,
    default: 0,
  },
  userAgent: {
    type: String,
    default: '',
  },
  riskScore: {
    type: Number,
    default: 0,
  },
  classification: {
    type: String,
    enum: ['normal', 'suspicious', 'blocked'],
    default: 'normal',
  },
  violationFlags: [{
    type: String,
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

module.exports = mongoose.models.SecurityLog || mongoose.model('SecurityLog', securityLogSchema);
