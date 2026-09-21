/**
 * Enforcer Middleware: Enforces real-time access decisions (Allow / Warn / Block).
 * Short-circuits malicious requests before application controllers run.
 */

const stateStore = require('../engines/stateStore');

const enforcer = (req, res, next) => {
  // Allow SOC administration and simulation endpoints to avoid locking out the admin
  const path = req.originalUrl || req.url;
  if (path.startsWith('/api/security') || path.startsWith('/api/simulation/reset')) {
    return next();
  }

  const userId = req.user ? req.user._id : null;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace(/^.*:/, '') || '127.0.0.1';

  const riskState = stateStore.getRiskState(userId, cleanIp);

  // 1. Check if user/IP is classified as ATTACKER (Blocked)
  if (riskState.classification === 'blocked' || riskState.currentRiskScore >= 75) {
    return res.status(403).json({
      error: 'SECURITY_BLOCK',
      classification: 'blocked',
      riskScore: riskState.currentRiskScore,
      message: 'Access Blocked: Your session was terminated due to suspicious application-layer attack behavior.',
      reason: riskState.violationFlags.join(', ') || 'High risk score threshold breached',
      blockedAt: riskState.blockedAt,
    });
  }

  // 2. Check if user/IP is classified as SUSPICIOUS (Warn & Throttle)
  if (riskState.classification === 'suspicious' || riskState.currentRiskScore >= 40) {
    res.setHeader('X-Security-Risk', 'suspicious');
    res.setHeader('X-Security-Warning', 'Behavior anomaly flagged. Session under observation.');

    // Introduce a subtle 350ms delay to deter automated tooling without breaking UI
    return setTimeout(() => {
      next();
    }, 350);
  }

  // 3. Normal User (Allow)
  next();
};

module.exports = enforcer;
