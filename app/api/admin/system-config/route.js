import { withSecurity } from '@/lib/middleware/securityPipeline';

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  return Response.json({
    environment: 'production-secure',
    databaseCluster: 'mongo-replica-primary-01',
    encryptionLevel: 'AES-256-GCM',
    wafBypassAllowed: false,
    sessionTimeoutSeconds: 3600,
    apiGatewayVersion: 'v4.12.0',
    adminKeysRotatedAt: new Date(Date.now() - 86400000),
  });
}, { requireAuth: true, requireAdmin: true });
