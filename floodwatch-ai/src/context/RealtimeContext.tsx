"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Camera, SewerSensorReading, ZoneRisk, FloodIncident, CitizenAlert, TrafficIncident, WeatherAlert } from '@/types/schemas';

interface AppState {
  cameras: Camera[];
  sensors: SewerSensorReading[];
  zones: ZoneRisk[];
  incidents: FloodIncident[];
  alerts: CitizenAlert[];
  traffic: TrafficIncident[];
  weather: WeatherAlert | null;
  isDemoMode: boolean;
  demoTickCount: number;
}

interface RealtimeContextType {
  state: AppState;
  isConnected: boolean;
  toggleDemoMode: (active: boolean) => Promise<void>;
}

const defaultState: AppState = {
  cameras: [],
  sensors: [],
  zones: [],
  incidents: [],
  alerts: [],
  traffic: [],
  weather: null,
  isDemoMode: false,
  demoTickCount: 0,
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initial fetch to paint UI immediately
    const fetchInitial = () => {
      fetch('/api/operations')
        .then(res => res.json())
        .then(data => setState(data))
        .catch(console.error);
    };

    fetchInitial();

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    const connect = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('[SSE] Connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState(data);
        } catch (err) {
          console.error('Failed to parse SSE message', err);
        }
      };

      eventSource.onerror = (err) => {
        setIsConnected(false);
        console.warn('[SSE] Connection lost, retrying in 3s...', err);
        eventSource?.close();
        
        // Reconnect after 3 seconds
        clearTimeout(retryTimeout);
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  const toggleDemoMode = async (active: boolean) => {
    try {
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      // SSE will pick up the update but optimistically set
      setState(prev => ({ ...prev, isDemoMode: active }));
    } catch (err) {
      console.error('Failed to toggle demo mode', err);
    }
  };

  return (
    <RealtimeContext.Provider value={{ state, isConnected, toggleDemoMode }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
