import eventBus from '@/lib/events/eventBus';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  let timer;

  const stream = new ReadableStream({
    start(controller) {
      eventBus.subscribe(controller);

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));

      timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          clearInterval(timer);
          eventBus.unsubscribe(controller);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(timer);
        eventBus.unsubscribe(controller);
      });
    },
    cancel(controller) {
      if (timer) clearInterval(timer);
      eventBus.unsubscribe(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
