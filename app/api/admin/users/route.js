import { withSecurity } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let User;
try {
  User = require('@/lib/models/User');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  if (isDbConnected() && User) {
    try {
      const users = await User.find().select('-password');
      return Response.json(users);
    } catch (e) {}
  }

  const users = await memoryStore.getAllUsers();
  return Response.json(users);
}, { requireAuth: true, requireAdmin: true });
