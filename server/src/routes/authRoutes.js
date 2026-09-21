const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, JWT_SECRET } = require('../middleware/auth');
const stateStore = require('../engines/stateStore');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '8h' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, accountNumber } = req.body;

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({
      username,
      password,
      name: name || username,
      role: role || 'customer',
      accountNumber: accountNumber || '101',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        accountNumber: user.accountNumber,
        status: user.status,
        riskScore: user.riskScore,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user || !(await user.matchPassword(password))) {
      // 401 will trigger credential stuffing / brute force detector in telemetry monitor
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        error: 'USER_BLOCKED',
        message: 'Account is suspended due to application security violations.',
        riskScore: user.riskScore,
      });
    }

    const token = generateToken(user._id);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        accountNumber: user.accountNumber,
        status: user.status,
        riskScore: user.riskScore,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/profile
router.get('/profile', protect, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace(/^.*:/, '') || '127.0.0.1';
  const riskState = stateStore.getRiskState(req.user._id, cleanIp);

  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      accountNumber: req.user.accountNumber,
      status: riskState.classification,
      riskScore: riskState.currentRiskScore,
      violationFlags: riskState.violationFlags,
    },
  });
});

module.exports = router;
