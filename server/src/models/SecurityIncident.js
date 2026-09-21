const mongoose = require('mongoose');

const securityIncidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  attackType: {
    type: String,
    required: true,
    enum: [
      'Account Enumeration (IDOR)',
      'Credential Stuffing / Brute Force',
      'Privilege Escalation Probing',
      'Hyper-Velocity Scraping',
      'Session Anomaly',
      'Manual Security Block',
    ],
  },
  attackerIp: {
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
  riskScore: {
    type: Number,
    required: true,
  },
  triggerReason: {
    type: String,
    required: true,
  },
  forensicDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['active_blocked', 'under_investigation', 'resolved_unblocked'],
    default: 'active_blocked',
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: String,
  },
});

module.exports = mongoose.model('SecurityIncident', securityIncidentSchema);
