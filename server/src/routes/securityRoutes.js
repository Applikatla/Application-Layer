const express = require('express');
const SecurityIncident = require('../models/SecurityIncident');
const SecurityLog = require('../models/SecurityLog');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const stateStore = require('../engines/stateStore');
const socketManager = require('../socket/socketManager');

const router = express.Router();

// GET /api/security/stats
router.get('/stats', async (req, res) => {
  try {
    const activeSessions = stateStore.getAllActiveStates();
    const totalBlockedSessions = activeSessions.filter(s => s.classification === 'blocked').length;
    const totalSuspiciousSessions = activeSessions.filter(s => s.classification === 'suspicious').length;
    const totalNormalSessions = activeSessions.filter(s => s.classification === 'normal').length;

    const totalIncidentsCount = await SecurityIncident.countDocuments();
    const activeIncidentsCount = await SecurityIncident.countDocuments({ status: 'active_blocked' });

    // Attack types breakdown
    const incidentBreakdown = await SecurityIncident.aggregate([
      { $group: { _id: '$attackType', count: { $sum: 1 } } },
    ]);

    const totalLogsCount = await SecurityLog.countDocuments();

    res.json({
      activeSessionsCount: activeSessions.length,
      normalCount: totalNormalSessions,
      suspiciousCount: totalSuspiciousSessions,
      blockedCount: totalBlockedSessions,
      totalIncidentsCount,
      activeIncidentsCount,
      incidentBreakdown,
      totalLogsCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/security/sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = stateStore.getAllActiveStates();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/security/incidents
router.get('/incidents', async (req, res) => {
  try {
    const incidents = await SecurityIncident.find()
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/security/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await SecurityLog.find()
      .sort({ timestamp: -1 })
      .limit(60);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/security/unblock
router.post('/unblock', async (req, res) => {
  try {
    const { key, ip, userId, incidentId } = req.body;

    let targetIp = ip;
    let targetUserId = userId;

    if (key) {
      if (key.startsWith('user:')) targetUserId = key.replace('user:', '');
      if (key.startsWith('ip:')) targetIp = key.replace('ip:', '');
    }

    if (incidentId) {
      const incident = await SecurityIncident.findOne({ incidentId });
      if (incident) {
        if (incident.userId) targetUserId = incident.userId.toString();
        if (incident.attackerIp) targetIp = incident.attackerIp;
        incident.status = 'resolved_unblocked';
        incident.resolvedAt = new Date();
        incident.resolvedBy = 'SOC Admin';
        await incident.save();
      }
    } else if (targetIp) {
      await SecurityIncident.updateMany(
        { attackerIp: targetIp, status: 'active_blocked' },
        { status: 'resolved_unblocked', resolvedAt: new Date(), resolvedBy: 'SOC Admin' }
      );
    }

    // 1. Reset in-memory state for both user and IP
    if (targetUserId) {
      stateStore.unblock(targetUserId, null);
    }
    if (targetIp) {
      stateStore.unblock(null, targetIp);
    }

    // 2. Reset User DB record if userId provided
    if (targetUserId) {
      await User.findByIdAndUpdate(targetUserId, {
        status: 'normal',
        riskScore: 0,
        blockedAt: null,
      });
    }

    // 3. Remove blacklist tokens
    await TokenBlacklist.deleteMany({});

    // 5. Notify SOC Dashboard via WebSocket
    socketManager.broadcastUserState({
      key: key || `ip:${targetIp}`,
      ip: targetIp,
      currentRiskScore: 0,
      classification: 'normal',
      violationFlags: [],
      blockedAt: null,
    });

    res.json({
      success: true,
      message: `Target unblocked successfully. Risk score reset to 0 (Normal).`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
