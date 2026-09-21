import { withSecurity } from '@/lib/middleware/securityPipeline';

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  return Response.json({
    vaultStatus: 'SEALED',
    vaultId: 'VAULT-ALPHA-99',
    masterKeysCount: 4,
    lastAuditTimestamp: new Date(),
  });
}, { requireAuth: true, requireAdmin: true });
