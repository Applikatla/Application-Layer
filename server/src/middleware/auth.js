const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-security-key-2026';

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(403).json({
        error: 'SECURITY_BLOCK',
        classification: 'blocked',
        reason: isBlacklisted.reason || 'Token revoked',
        message: 'This session token has been revoked due to a detected application-layer security violation.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user && user.status === 'blocked') {
      return res.status(403).json({
        error: 'SECURITY_BLOCK',
        message: 'Your account is currently suspended due to security violations.',
        riskScore: user.riskScore,
        classification: 'blocked',
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    // Flag this as privilege violation in the request context for detection engine
    req.isPrivilegeViolation = true;
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Administrative privileges required to access this resource.',
    });
  }
  next();
};

module.exports = {
  protect,
  requireAuth,
  requireAdmin,
  JWT_SECRET,
};
