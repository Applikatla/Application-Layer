import eventBus from '@/lib/events/eventBus';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since') || '0';

  const events = eventBus.getRecentEvents(Number(since));
  return Response.json({ events, serverTime: Date.now() });
}
