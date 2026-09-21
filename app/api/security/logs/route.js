import { withSecurity } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let SecurityLog;
try {
  SecurityLog = require('@/lib/models/SecurityLog');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  if (isDbConnected() && SecurityLog) {
    try {
      const logs = await SecurityLog.find().sort({ timestamp: -1 }).limit(60);
      return Response.json(logs);
    } catch (e) {}
  }

  const logs = await memoryStore.getLogs(60);
  return Response.json(logs);
}, { exempt: true });
