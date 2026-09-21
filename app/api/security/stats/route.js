import { withSecurity } from '@/lib/middleware/securityPipeline';
import stateStore from '@/lib/engines/stateStore';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let SecurityIncident, SecurityLog;
try {
  SecurityIncident = require('@/lib/models/SecurityIncident');
  SecurityLog = require('@/lib/models/SecurityLog');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  const activeSessions = stateStore.getAllActiveStates();
  const totalBlockedSessions = activeSessions.filter((s) => s.classification === 'blocked').length;
  const totalSuspiciousSessions = activeSessions.filter((s) => s.classification === 'suspicious').length;
  const totalNormalSessions = activeSessions.filter((s) => s.classification === 'normal').length;

  let totalIncidentsCount = 0;
  let activeIncidentsCount = 0;
  let incidentBreakdown = [];
  let totalLogsCount = 0;

  if (isDbConnected() && SecurityIncident && SecurityLog) {
    try {
      totalIncidentsCount = await SecurityIncident.countDocuments();
      activeIncidentsCount = await SecurityIncident.countDocuments({ status: 'active_blocked' });
      incidentBreakdown = await SecurityIncident.aggregate([
        { $group: { _id: '$attackType', count: { $sum: 1 } } },
      ]);
      totalLogsCount = await SecurityLog.countDocuments();
      return Response.json({
        activeSessionsCount: activeSessions.length,
        normalCount: totalNormalSessions,
        suspiciousCount: totalSuspiciousSessions,
        blockedCount: totalBlockedSessions,
        totalIncidentsCount,
        activeIncidentsCount,
        incidentBreakdown,
        totalLogsCount,
      });
    } catch (e) {}
  }

  // Memory fallback
  totalIncidentsCount = await memoryStore.countIncidents();
  activeIncidentsCount = await memoryStore.countIncidents({ status: 'active_blocked' });
  incidentBreakdown = await memoryStore.aggregateIncidentBreakdown();
  totalLogsCount = await memoryStore.countLogs();

  return Response.json({
    activeSessionsCount: activeSessions.length,
    normalCount: totalNormalSessions,
    suspiciousCount: totalSuspiciousSessions,
    blockedCount: totalBlockedSessions,
    totalIncidentsCount,
    activeIncidentsCount,
    incidentBreakdown,
    totalLogsCount,
  });
}, { exempt: true });
