const express = require('express');
const stateStore = require('../engines/stateStore');
const SecurityIncident = require('../models/SecurityIncident');
const TokenBlacklist = require('../models/TokenBlacklist');
const User = require('../models/User');

const router = express.Router();

// POST /api/simulation/reset
router.post('/reset', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const cleanIp = clientIp.replace(/^.*:/, '') || '127.0.0.1';
    const userId = req.body.userId || null;

    // Reset in-memory state
    stateStore.unblock(userId, cleanIp);

    // Reset user in DB if user is provided
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        status: 'normal',
        riskScore: 0,
        blockedAt: null,
      });
    }

    // Clear active incidents for this client
    await SecurityIncident.updateMany(
      { attackerIp: cleanIp },
      { status: 'resolved_unblocked', resolvedAt: new Date(), resolvedBy: 'Simulation Reset' }
    );

    await TokenBlacklist.deleteMany({});

    res.json({
      success: true,
      message: `Reset complete for IP ${cleanIp}. Ready for new attack simulation tests.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
