/**
 * SocketManager: Handles real-time WebSocket communication for the SOC Dashboard.
 */

let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket] SOC Dashboard client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] SOC Dashboard client disconnected: ${socket.id}`);
    });
  });
};

const broadcastTelemetry = (data) => {
  if (ioInstance) {
    ioInstance.emit('telemetry_event', data);
  }
};

const broadcastThreatAlert = (threatData) => {
  if (ioInstance) {
    ioInstance.emit('threat_alert', threatData);
  }
};

const broadcastUserState = (userState) => {
  if (ioInstance) {
    ioInstance.emit('user_state_updated', userState);
  }
};

const broadcastIncident = (incident) => {
  if (ioInstance) {
    ioInstance.emit('new_incident', incident);
  }
};

module.exports = {
  initSocket,
  broadcastTelemetry,
  broadcastThreatAlert,
  broadcastUserState,
  broadcastIncident,
};
