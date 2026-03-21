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
    fetch('/api/operations')
      .then(res => res.json())
      .then(data => setState(data))
      .catch(console.error);

    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setIsConnected(true);
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
      console.error('SSE Error', err);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
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
