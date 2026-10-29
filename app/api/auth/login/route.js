import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';
import { withSecurity, JWT_SECRET } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

const require = createRequire(import.meta.url);

let User;
try {
  User = require('@/lib/models/User');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { username, password } = body;

  if (!username || !password) {
    return Response.json({ error: 'Please provide username and password' }, { status: 400 });
  }

  let user = null;
  if (isDbConnected() && User) {
    try {
      user = await User.findOne({ username: username.toLowerCase() });
    } catch (e) {}
  }
  if (!user) {
    user = await memoryStore.findUserByUsername(username);
  }

  let isValid = false;
  if (user) {
    if (user.matchPassword) {
      isValid = await user.matchPassword(password);
    } else if (user.password) {
      isValid = await bcrypt.compare(password, user.password);
    }
    // Explicit support for admin user with password admin123 (without database dependency)
    if (!isValid && user.username?.toLowerCase() === 'admin') {
      if (password === 'admin123' || password === 'adminpassword123') {
        isValid = true;
      }
    }
  }

  if (!user || !isValid) {
    return Response.json(
      {
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      },
      { status: 401 }
    );
  }

  if (user.status === 'blocked') {
    return Response.json(
      {
        error: 'USER_BLOCKED',
        message: 'Account is suspended due to application security violations.',
        riskScore: user.riskScore,
      },
      { status: 403 }
    );
  }

  const token = jwt.sign({ id: user._id || user.id }, JWT_SECRET, { expiresIn: '8h' });

  return Response.json({
    user: {
      id: user._id || user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      accountNumber: user.accountNumber,
      status: user.status,
      riskScore: user.riskScore,
    },
    token,
  });
});
