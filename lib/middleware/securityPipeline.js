/**
 * SecurityPipeline: Unified Next.js API route wrapper for Protect, Enforce, and Monitor.
 */

const jwt = require('jsonwebtoken');
const stateStore = require('../engines/stateStore');
const analysisEngine = require('../engines/analysisEngine');
const detectionEngine = require('../engines/detectionEngine');
const decisionEngine = require('../engines/decisionEngine');
const eventBus = require('../events/eventBus');
const memoryStore = require('../db/memoryStore');
const { connectDB, isDbConnected } = require('../config/db');

let User, TokenBlacklist, SecurityLog;
try {
  User = require('../models/User');
  TokenBlacklist = require('../models/TokenBlacklist');
  SecurityLog = require('../models/SecurityLog');
} catch (e) {}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-alad-security-key-2026';

function extractClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim().replace(/^.*:/, '');
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.replace(/^.*:/, '');
  return '127.0.0.1';
}

function extractResourceId(pathname) {
  const match = pathname.match(/\/(?:accounts|users|transactions|data)\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return null;
}

async function verifyAuth(req) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { user: null, token: null };
  }

  const token = authHeader.split(' ')[1];
  if (!token) return { user: null, token: null };

  // Check token blacklist
  const isBlacklisted =
    (await memoryStore.isTokenBlacklisted(token)) ||
    (isDbConnected() && TokenBlacklist && (await TokenBlacklist.findOne({ token })));

  if (isBlacklisted) {
    return { user: null, token, isBlockedToken: true };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = null;

    if (isDbConnected() && User) {
      user = await User.findById(decoded.id).select('-password');
    }
    if (!user) {
      user = await memoryStore.findUserById(decoded.id);
    }

    return { user, token, isBlockedToken: false };
  } catch (err) {
    return { user: null, token: null };
  }
}

function withSecurity(handler, options = {}) {
  return async (req, context = {}) => {
    await connectDB();

    const startTime = Date.now();
    const urlObj = new URL(req.url);
    const pathname = urlObj.pathname;
    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const resourceId = (context.params && (context.params.accountNumber || context.params.id)) || extractResourceId(pathname);

    // 1. Authenticate Request
    const { user, token, isBlockedToken } = await verifyAuth(req);

    if (isBlockedToken) {
      return Response.json(
        {
          error: 'SECURITY_BLOCK',
          classification: 'blocked',
          message: 'This session token has been revoked due to a detected application-layer security violation.',
        },
        { status: 403 }
      );
    }

    const userId = user ? user.id || user._id : null;
    let username = user ? user.username : 'anonymous';

    // 2. Enforce Access Policy (Allow / Warn / Block)
    const isExempt =
      pathname.startsWith('/api/security') ||
      pathname.startsWith('/api/simulation/reset') ||
      pathname.startsWith('/api/events') ||
      pathname.startsWith('/api/health') ||
      options.exempt;

    const riskState = stateStore.getRiskState(userId, clientIp);

    if (!isExempt) {
      if (riskState.classification === 'blocked' || riskState.currentRiskScore >= 75) {
        return Response.json(
          {
            error: 'SECURITY_BLOCK',
            classification: 'blocked',
            riskScore: riskState.currentRiskScore,
            message: 'Access Blocked: Your session was terminated due to suspicious application-layer attack behavior.',
            reason: riskState.violationFlags.join(', ') || 'High risk score threshold breached',
            blockedAt: riskState.blockedAt,
          },
          { status: 403 }
        );
      }
    }

    // Role check if required
    let isPrivilegeViolation = false;
    if (options.requireAuth && !user) {
      return Response.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (options.requireAdmin && (!user || user.role !== 'admin')) {
      isPrivilegeViolation = true;
    }

    // Attach enriched security context to req
    req.clientIp = clientIp;
    req.user = user;
    req.token = token;
    req.resourceId = resourceId;

    // Apply suspicious throttle delay if needed
    if (!isExempt && (riskState.classification === 'suspicious' || riskState.currentRiskScore >= 40)) {
      await new Promise((r) => setTimeout(r, 350));
    }

    let res;
    let statusCode = 200;

    if (isPrivilegeViolation) {
      statusCode = 403;
      res = Response.json(
        {
          error: 'FORBIDDEN',
          message: 'Administrative privileges required to access this resource.',
        },
        { status: 403 }
      );
    } else {
      try {
        res = await handler(req, context);
        statusCode = res.status;
      } catch (err) {
        console.error(`[API Error] ${pathname}:`, err);
        statusCode = 500;
        res = Response.json({ error: 'INTERNAL_SERVER_ERROR', message: err.message }, { status: 500 });
      }
    }

    // 3. Telemetry Monitoring & Security Scoring
    const responseTimeMs = Date.now() - startTime;

    // If login attempt failed, flag auth failure
    const isFailedAuth = statusCode === 401 && pathname.includes('/auth');

    const event = {
      endpoint: pathname,
      method: req.method,
      statusCode,
      resourceId,
      userAgent,
      username,
      isFailedAuth,
      isPrivilegeViolation,
    };

    // Record internal activity
    stateStore.recordActivity(userId, clientIp, event);

    // Extract features & evaluate threats
    const metrics = analysisEngine.analyze(userId, clientIp, event);
    const threats = detectionEngine.evaluateThreats(metrics, event);

    // Compute dynamic risk score and update enforcer
    const reqInfo = {
      endpoint: pathname,
      method: req.method,
      userAgent,
      username,
      token,
    };

    const decision = await decisionEngine.evaluateAndEnforce(userId, clientIp, threats, reqInfo);

    // Broadcast live telemetry to SOC Dashboard
    eventBus.broadcastTelemetry({
      timestamp: new Date(),
      ip: clientIp,
      username,
      method: req.method,
      endpoint: pathname,
      statusCode,
      responseTimeMs,
      riskScore: decision.score,
      classification: decision.classification,
      threatCount: threats.length,
      threats: threats.map((t) => t.type),
      resourceId,
    });

    // Asynchronously record log in DB or memory store
    const logData = {
      ip: clientIp,
      userId,
      username,
      method: req.method,
      endpoint: pathname,
      statusCode,
      responseTimeMs,
      userAgent,
      riskScore: decision.score,
      classification: decision.classification,
      violationFlags: threats.map((t) => t.flag),
      metadata: {
        threats: threats.map((t) => ({ type: t.type, severity: t.severity })),
        resourceId,
      },
    };

    if (isDbConnected() && SecurityLog) {
      SecurityLog.create(logData).catch(() => {});
    }
    memoryStore.createLog(logData).catch(() => {});

    // Inject risk headers if suspicious
    if (decision.classification === 'suspicious') {
      res.headers.set('X-Security-Risk', 'suspicious');
      res.headers.set('X-Security-Warning', 'Behavior anomaly flagged. Session under observation.');
    }

    return res;
  };
}

module.exports = { withSecurity, JWT_SECRET, verifyAuth };
