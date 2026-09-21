/**
 * EventBus: Real-time event streaming engine for Vercel & serverless deployments.
 * Supports Server-Sent Events (SSE) connections and polling fallbacks.
 */

if (!global.__ALAD_EVENT_BUS__) {
  global.__ALAD_EVENT_BUS__ = {
    subscribers: new Set(),
    buffer: [],
    maxBuffer: 150,
  };
}

const bus = global.__ALAD_EVENT_BUS__;

function broadcast(eventType, data) {
  const eventPayload = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    event: eventType,
    data,
    timestamp: Date.now(),
  };

  // Add to in-memory rolling buffer
  bus.buffer.unshift(eventPayload);
  if (bus.buffer.length > bus.maxBuffer) {
    bus.buffer.pop();
  }

  // Push to all active SSE subscribers
  const rawMessage = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(rawMessage);

  bus.subscribers.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (err) {
      // Dead controller, remove it
      bus.subscribers.delete(controller);
    }
  });

  return eventPayload;
}

const eventBus = {
  subscribe: (controller) => {
    bus.subscribers.add(controller);
    // Send initial ping
    try {
      const ping = new TextEncoder().encode(`event: ping\ndata: {"time":${Date.now()}}\n\n`);
      controller.enqueue(ping);
    } catch (e) {}
  },

  unsubscribe: (controller) => {
    bus.subscribers.delete(controller);
  },

  broadcastTelemetry: (data) => broadcast('telemetry_event', data),
  broadcastThreatAlert: (threatData) => broadcast('threat_alert', threatData),
  broadcastUserState: (userState) => broadcast('user_state_updated', userState),
  broadcastIncident: (incident) => broadcast('new_incident', incident),

  getRecentEvents: (since = 0) => {
    if (!since) return bus.buffer.slice(0, 30);
    return bus.buffer.filter((e) => e.timestamp > Number(since));
  },
};

module.exports = eventBus;
