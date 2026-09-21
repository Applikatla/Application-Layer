/**
 * Monitor Middleware: Intercepts internal application state and feeds the detection pipeline.
 */

const stateStore = require('../engines/stateStore');
const analysisEngine = require('../engines/analysisEngine');
const detectionEngine = require('../engines/detectionEngine');
const decisionEngine = require('../engines/decisionEngine');
const socketManager = require('../socket/socketManager');
const SecurityLog = require('../models/SecurityLog');

const extractResourceId = (req) => {
  // If explicitly in route params (e.g. /api/accounts/101)
  if (req.params && (req.params.id || req.params.accountNumber)) {
    return req.params.id || req.params.accountNumber;
  }
  // Extract trailing numeric/alphanumeric resource identifier from path
  const match = req.originalUrl.match(/\/(?:accounts|users|transactions|data)\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  return null;
};

const monitor = (req, res, next) => {
  const startTime = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace(/^.*:/, '') || '127.0.0.1'; // clean ipv6 wrapper
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Attach metadata to req
  req.clientIp = cleanIp;
  req.resourceId = extractResourceId(req);

  // Hook response finish event to record outcome and execute security analysis
  res.on('finish', async () => {
    const responseTimeMs = Date.now() - startTime;
    const userId = req.user ? req.user._id : null;
    const username = req.user ? req.user.username : (req.body && req.body.username ? req.body.username : 'anonymous');
    const endpoint = req.originalUrl || req.url;
    const statusCode = res.statusCode;

    // Skip monitoring static assets or internal socket health if any
    if (endpoint.startsWith('/socket.io') || endpoint.startsWith('/favicon.ico')) {
      return;
    }

    const event = {
      endpoint,
      method: req.method,
      statusCode,
      resourceId: req.resourceId,
      userAgent,
      username,
      isFailedAuth: statusCode === 401 && endpoint.includes('/auth'),
      isPrivilegeViolation: req.isPrivilegeViolation || (statusCode === 403 && endpoint.includes('/admin')),
    };

    // 1. Record in-memory internal application state
    stateStore.recordActivity(userId, cleanIp, event);

    // 2. Extract behavioral features
    const metrics = analysisEngine.analyze(userId, cleanIp, event);

    // 3. Detect threat patterns
    const threats = detectionEngine.evaluateThreats(metrics, event);

    // 4. Compute risk score and execute dynamic policies
    const reqInfo = {
      endpoint,
      method: req.method,
      userAgent,
      username,
      token: req.token,
    };
    const decision = await decisionEngine.evaluateAndEnforce(userId, cleanIp, threats, reqInfo);

    // 5. Broadcast live telemetry to SOC Dashboard
    socketManager.broadcastTelemetry({
      timestamp: new Date(),
      ip: cleanIp,
      username,
      method: req.method,
      endpoint,
      statusCode,
      responseTimeMs,
      riskScore: decision.score,
      classification: decision.classification,
      threatCount: threats.length,
      threats: threats.map(t => t.type),
      resourceId: req.resourceId,
    });

    // 6. Asynchronously save log to MongoDB
    try {
      SecurityLog.create({
        ip: cleanIp,
        userId,
        username,
        method: req.method,
        endpoint,
        statusCode,
        responseTimeMs,
        userAgent,
        riskScore: decision.score,
        classification: decision.classification,
        violationFlags: threats.map(t => t.flag),
        metadata: {
          threats: threats.map(t => ({ type: t.type, severity: t.severity })),
          resourceId: req.resourceId,
        },
      }).catch(err => {
        // silently ignore logging failures to never crash the main request
      });
    } catch (e) {
      // ignore
    }
  });

  next();
};

module.exports = monitor;
