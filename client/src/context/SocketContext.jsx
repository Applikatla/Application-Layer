import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [userStates, setUserStates] = useState({});
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('Connected to ALAD WebSocket Gateway');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('telemetry_event', (event) => {
      setTelemetry((prev) => [event, ...prev.slice(0, 49)]); // keep latest 50
    });

    newSocket.on('threat_alert', (alert) => {
      setActiveAlerts((prev) => [alert, ...prev.slice(0, 19)]);
    });

    newSocket.on('user_state_updated', (state) => {
      setUserStates((prev) => ({
        ...prev,
        [state.key || `ip:${state.ip}`]: state,
      }));
    });

    newSocket.on('new_incident', (incident) => {
      setIncidents((prev) => [incident, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, telemetry, activeAlerts, userStates, incidents, setIncidents }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
