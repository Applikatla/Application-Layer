'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [userStates, setUserStates] = useState({});
  const [incidents, setIncidents] = useState([]);

  const lastEventTimestamp = useRef(Date.now());
  const seenEventIds = useRef(new Set());

  const handleIncomingEvent = (eventType, data) => {
    if (eventType === 'telemetry_event') {
      setTelemetry((prev) => [data, ...prev.slice(0, 49)]);
    } else if (eventType === 'threat_alert') {
      setActiveAlerts((prev) => [data, ...prev.slice(0, 19)]);
    } else if (eventType === 'user_state_updated') {
      setUserStates((prev) => ({
        ...prev,
        [data.key || `ip:${data.ip}`]: data,
      }));
    } else if (eventType === 'new_incident') {
      setIncidents((prev) => {
        if (prev.some((inc) => inc.incidentId === data.incidentId)) return prev;
        return [data, ...prev];
      });
    }
  };

  useEffect(() => {
    let eventSource = null;
    let pollInterval = null;
    let isSseActive = false;

    // 1. Primary: Server-Sent Events stream
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setConnected(true);
        isSseActive = true;
      };

      eventSource.addEventListener('telemetry_event', (e) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingEvent('telemetry_event', data);
        } catch (err) {}
      });

      eventSource.addEventListener('threat_alert', (e) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingEvent('threat_alert', data);
        } catch (err) {}
      });

      eventSource.addEventListener('user_state_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingEvent('user_state_updated', data);
        } catch (err) {}
      });

      eventSource.addEventListener('new_incident', (e) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingEvent('new_incident', data);
        } catch (err) {}
      });

      eventSource.onerror = () => {
        isSseActive = false;
        // Don't set connected false immediately if polling is active
      };
    } catch (e) {
      console.warn('SSE not supported or failed, falling back to polling');
    }

    // 2. Secondary: Fast Polling Sync Fallback (synchronizes state on Vercel)
    const pollEvents = async () => {
      try {
        const res = await fetch(`/api/events/poll?since=${lastEventTimestamp.current}`);
        if (res.ok) {
          const json = await res.json();
          setConnected(true);
          if (json.events && json.events.length > 0) {
            json.events.forEach((evt) => {
              if (!seenEventIds.current.has(evt.id)) {
                seenEventIds.current.add(evt.id);
                handleIncomingEvent(evt.event, evt.data);
              }
            });
            lastEventTimestamp.current = json.serverTime || Date.now();
          }
        }
      } catch (err) {}
    };

    pollInterval = setInterval(pollEvents, 2000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: null,
        connected,
        telemetry,
        activeAlerts,
        userStates,
        incidents,
        setIncidents,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
