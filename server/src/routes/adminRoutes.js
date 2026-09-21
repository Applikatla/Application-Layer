const express = require('express');
const { protect, requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// All routes here require valid auth and admin role
router.use(protect, requireAuth, requireAdmin);

// GET /api/admin/system-config
router.get('/system-config', async (req, res) => {
  res.json({
    environment: 'production-secure',
    databaseCluster: 'mongo-replica-primary-01',
    encryptionLevel: 'AES-256-GCM',
    wafBypassAllowed: false,
    sessionTimeoutSeconds: 3600,
    apiGatewayVersion: 'v4.12.0',
    adminKeysRotatedAt: new Date(Date.now() - 86400000),
  });
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-vault
router.get('/audit-vault', async (req, res) => {
  res.json({
    vaultStatus: 'SEALED',
    vaultId: 'VAULT-ALPHA-99',
    masterKeysCount: 4,
    lastAuditTimestamp: new Date(),
  });
});

module.exports = router;
