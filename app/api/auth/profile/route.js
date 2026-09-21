import { withSecurity } from '@/lib/middleware/securityPipeline';
import stateStore from '@/lib/engines/stateStore';

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = req.user._id || req.user.id;
  const riskState = stateStore.getRiskState(userId, req.clientIp);

  return Response.json({
    user: {
      id: userId,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      accountNumber: req.user.accountNumber,
      status: riskState.classification,
      riskScore: riskState.currentRiskScore,
      violationFlags: riskState.violationFlags,
    },
  });
}, { requireAuth: true });
