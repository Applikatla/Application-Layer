import { withSecurity } from '@/lib/middleware/securityPipeline';
import { isDbConnected } from '@/lib/config/db';
import memoryStore from '@/lib/db/memoryStore';

let SecurityIncident;
try {
  SecurityIncident = require('@/lib/models/SecurityIncident');
} catch (e) {}

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  if (isDbConnected() && SecurityIncident) {
    try {
      const incidents = await SecurityIncident.find().sort({ timestamp: -1 }).limit(50);
      return Response.json(incidents);
    } catch (e) {}
  }

  const incidents = await memoryStore.getIncidents({}, 50);
  return Response.json(incidents);
}, { exempt: true });
