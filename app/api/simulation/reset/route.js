import { withSecurity } from '@/lib/middleware/securityPipeline';
import stateStore from '@/lib/engines/stateStore';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let SecurityIncident, User, TokenBlacklist;
try {
  SecurityIncident = require('@/lib/models/SecurityIncident');
  User = require('@/lib/models/User');
  TokenBlacklist = require('@/lib/models/TokenBlacklist');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const POST = withSecurity(async (req) => {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {}

  const clientIp = req.clientIp || '127.0.0.1';
  const userId = body.userId || (req.user ? req.user.id || req.user._id : null);

  // Reset in-memory state
  stateStore.unblock(userId, clientIp);

  // Reset user in DB
  if (userId) {
    if (isDbConnected() && User) {
      try {
        await User.findByIdAndUpdate(userId, {
          status: 'normal',
          riskScore: 0,
          blockedAt: null,
        });
      } catch (e) {}
    }
    await memoryStore.updateUserById(userId, {
      status: 'normal',
      riskScore: 0,
      blockedAt: null,
    });
  }

  // Clear active incidents for client
  if (isDbConnected() && SecurityIncident) {
    try {
      await SecurityIncident.updateMany(
        { attackerIp: clientIp },
        { status: 'resolved_unblocked', resolvedAt: new Date(), resolvedBy: 'Simulation Reset' }
      );
    } catch (e) {}
  }
  await memoryStore.updateIncidents(
    { attackerIp: clientIp },
    { status: 'resolved_unblocked', resolvedAt: new Date(), resolvedBy: 'Simulation Reset' }
  );

  // Clear token blacklist
  if (isDbConnected() && TokenBlacklist) {
    try {
      await TokenBlacklist.deleteMany({});
    } catch (e) {}
  }
  await memoryStore.clearBlacklist();

  return Response.json({
    success: true,
    message: `Reset complete for IP ${clientIp}. Ready for new attack simulation tests.`,
  });
}, { exempt: true });
