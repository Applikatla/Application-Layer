import jwt from 'jsonwebtoken';
import { withSecurity, JWT_SECRET } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

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

  const { username, password, name, role, accountNumber } = body;

  let existing = null;
  if (isDbConnected() && User) {
    try {
      existing = await User.findOne({ username: username.toLowerCase() });
    } catch (e) {}
  }
  if (!existing) {
    existing = await memoryStore.findUserByUsername(username);
  }

  if (existing) {
    return Response.json({ error: 'User already exists' }, { status: 400 });
  }

  let user = null;
  if (isDbConnected() && User) {
    try {
      user = await User.create({
        username,
        password,
        name: name || username,
        role: role || 'customer',
        accountNumber: accountNumber || '101',
      });
    } catch (e) {}
  }

  if (!user) {
    user = await memoryStore.createUser({
      username,
      password,
      name,
      role,
      accountNumber,
    });
  }

  const token = jwt.sign({ id: user._id || user.id }, JWT_SECRET, { expiresIn: '8h' });

  return Response.json(
    {
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
    },
    { status: 201 }
  );
});
