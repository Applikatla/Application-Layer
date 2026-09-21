import { withSecurity } from '@/lib/middleware/securityPipeline';
import stateStore from '@/lib/engines/stateStore';
import eventBus from '@/lib/events/eventBus';
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
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { key, ip, userId, incidentId } = body;

  let targetIp = ip;
  let targetUserId = userId;

  if (key) {
    if (key.startsWith('user:')) targetUserId = key.replace('user:', '');
    if (key.startsWith('ip:')) targetIp = key.replace('ip:', '');
  }

  // Handle incident resolution
  if (incidentId) {
    if (isDbConnected() && SecurityIncident) {
      try {
        const incident = await SecurityIncident.findOne({ incidentId });
        if (incident) {
          if (incident.userId) targetUserId = incident.userId.toString();
          if (incident.attackerIp) targetIp = incident.attackerIp;
          incident.status = 'resolved_unblocked';
          incident.resolvedAt = new Date();
          incident.resolvedBy = 'SOC Admin';
          await incident.save();
        }
      } catch (e) {}
    }
    const memInc = await memoryStore.findIncidentById(incidentId);
    if (memInc) {
      if (memInc.userId) targetUserId = memInc.userId;
      if (memInc.attackerIp) targetIp = memInc.attackerIp;
      memInc.status = 'resolved_unblocked';
      memInc.resolvedAt = new Date();
      memInc.resolvedBy = 'SOC Admin';
    }
  } else if (targetIp) {
    if (isDbConnected() && SecurityIncident) {
      try {
        await SecurityIncident.updateMany(
          { attackerIp: targetIp, status: 'active_blocked' },
          { status: 'resolved_unblocked', resolvedAt: new Date(), resolvedBy: 'SOC Admin' }
        );
      } catch (e) {}
    }
    await memoryStore.updateIncidents(
      { attackerIp: targetIp, status: 'active_blocked' },
      { status: 'resolved_unblocked', resolvedAt: new Date(), resolvedBy: 'SOC Admin' }
    );
  }

  // 1. Reset in-memory state
  if (targetUserId) {
    stateStore.unblock(targetUserId, null);
  }
  if (targetIp) {
    stateStore.unblock(null, targetIp);
  }

  // 2. Reset User DB record
  if (targetUserId) {
    if (isDbConnected() && User) {
      try {
        await User.findByIdAndUpdate(targetUserId, {
          status: 'normal',
          riskScore: 0,
          blockedAt: null,
        });
      } catch (e) {}
    }
    await memoryStore.updateUserById(targetUserId, {
      status: 'normal',
      riskScore: 0,
      blockedAt: null,
    });
  }

  // 3. Clear blacklisted tokens
  if (isDbConnected() && TokenBlacklist) {
    try {
      await TokenBlacklist.deleteMany({});
    } catch (e) {}
  }
  await memoryStore.clearBlacklist();

  // 4. Notify SOC Dashboard via SSE EventBus
  eventBus.broadcastUserState({
    key: key || `ip:${targetIp}`,
    ip: targetIp,
    currentRiskScore: 0,
    classification: 'normal',
    violationFlags: [],
    blockedAt: null,
  });

  return Response.json({
    success: true,
    message: 'Target unblocked successfully. Risk score reset to 0 (Normal).',
  });
}, { exempt: true });
