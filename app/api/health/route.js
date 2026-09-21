import { withSecurity } from '@/lib/middleware/securityPipeline';

export const dynamic = 'force-dynamic';

export const GET = withSecurity(async () => {
  return Response.json({
    status: 'online',
    system: 'Application-Layer Attack Detection Engine',
    framework: 'Next.js App Router (Vercel-Ready)',
    timestamp: new Date(),
  });
}, { exempt: true });
