/**
 * DecisionEngine: Dynamic Risk Scoring and Automated Security Enforcement.
 * Computes Risk Score (0-100), classifies user, and executes automated responses.
 */

const stateStore = require('./stateStore');
const socketManager = require('../socket/socketManager');
const SecurityIncident = require('../models/SecurityIncident');
const TokenBlacklist = require('../models/TokenBlacklist');
const User = require('../models/User');

class DecisionEngine {
  async evaluateAndEnforce(userId, ip, threats = [], reqInfo = {}) {
    const currentState = stateStore.getRiskState(userId, ip);
    let score = currentState.currentRiskScore || 0;

    // Apply time decay: reduce 5 points for every 30 seconds since last violation
    if (currentState.lastViolationTime && threats.length === 0) {
      const secondsSinceViolation = (Date.now() - currentState.lastViolationTime) / 1000;
      const decayUnits = Math.floor(secondsSinceViolation / 30);
      score = Math.max(0, score - (decayUnits * 5));
    }

    // Add risk points from detected threats
    const newViolationFlags = [];
    if (threats.length > 0) {
      threats.forEach(t => {
        score += t.riskPoints;
        newViolationFlags.push(t.flag);
      });
    }

    // Bound score to [0, 100]
    score = Math.min(100, Math.max(0, score));

    // Determine Classification
    let classification = 'normal'; // 🟢
    if (score >= 75) {
      classification = 'blocked'; // 🔴 Attacker
    } else if (score >= 40) {
      classification = 'suspicious'; // 🟡 Suspicious User
    }

    // Check for state transition
    const previousClassification = currentState.classification;
    const updatedState = stateStore.updateRiskState(
      userId,
      ip,
      score,
      classification,
      newViolationFlags
    );

    // Automated Response Execution
    if (classification === 'blocked' && previousClassification !== 'blocked') {
      await this.executeBlockingAction(userId, ip, score, threats, reqInfo);
    } else if (classification === 'suspicious' && previousClassification === 'normal') {
      await this.executeWarningAction(userId, ip, score, threats);
    }

    // Broadcast live state update to SOC Dashboard
    socketManager.broadcastUserState({
      key: updatedState.key,
      ip: updatedState.ip,
      username: updatedState.username,
      currentRiskScore: score,
      classification: classification,
      violationFlags: updatedState.violationFlags,
      blockedAt: updatedState.blockedAt,
    });

    return {
      score,
      classification,
      threats,
      isBlocked: classification === 'blocked',
      isSuspicious: classification === 'suspicious',
    };
  }

  async executeBlockingAction(userId, ip, score, threats, reqInfo) {
    const primaryThreat = threats[0] || {
      type: 'Account Enumeration (IDOR)',
      description: 'Threshold score reached via repeated suspicious activities.',
    };

    const incidentId = `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      // 1. Blacklist active JWT token if available
      if (reqInfo.token) {
        await TokenBlacklist.create({
          token: reqInfo.token,
          reason: `Auto-blocked: ${primaryThreat.type}`,
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24h
        });
      }

      // 2. Update user status in DB if registered user
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          status: 'blocked',
          riskScore: score,
          blockedAt: new Date(),
        });
      }

      // 3. Record Security Incident in DB
      const incident = await SecurityIncident.create({
        incidentId,
        attackType: primaryThreat.type,
        attackerIp: ip,
        userId: userId || null,
        username: reqInfo.username || 'anonymous',
        riskScore: score,
        triggerReason: primaryThreat.description,
        forensicDetails: {
          threats,
          endpoint: reqInfo.endpoint,
          method: reqInfo.method,
          userAgent: reqInfo.userAgent,
          evidence: threats.map(t => t.evidence),
        },
        status: 'active_blocked',
      });

      console.warn(`[SECURITY ALERT 🔴] Attacker BLOCKED: IP=${ip}, User=${reqInfo.username || 'anon'}, Score=${score}, Attack=${primaryThreat.type}`);

      // 4. Dispatch high-priority WebSocket alert to SOC Dashboard
      socketManager.broadcastThreatAlert({
        incidentId,
        timestamp: new Date(),
        level: 'CRITICAL',
        attackType: primaryThreat.type,
        attackerIp: ip,
        username: reqInfo.username || 'anonymous',
        riskScore: score,
        message: primaryThreat.description,
        details: threats,
      });

      socketManager.broadcastIncident(incident);
    } catch (err) {
      console.error(`[DecisionEngine] Error recording incident: ${err.message}`);
    }
  }

  async executeWarningAction(userId, ip, score, threats) {
    const threat = threats[0] || { type: 'Suspicious Behavior', description: 'Behavior pattern deviation.' };

    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          status: 'suspicious',
          riskScore: score,
        });
      } catch (err) {
        console.error(`[DecisionEngine] Error updating user status: ${err.message}`);
      }
    }

    console.warn(`[SECURITY WARNING 🟡] Suspicious User: IP=${ip}, Score=${score}, Pattern=${threat.type}`);

    socketManager.broadcastThreatAlert({
      level: 'WARNING',
      attackType: threat.type,
      attackerIp: ip,
      riskScore: score,
      message: threat.description,
    });
  }
}

const decisionEngine = new DecisionEngine();
module.exports = decisionEngine;
