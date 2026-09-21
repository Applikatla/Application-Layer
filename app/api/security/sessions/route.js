import { withSecurity } from '@/lib/middleware/securityPipeline';
import stateStore from '@/lib/engines/stateStore';

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  const sessions = stateStore.getAllActiveStates();
  return Response.json(sessions);
}, { exempt: true });
