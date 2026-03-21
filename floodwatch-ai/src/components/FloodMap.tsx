"use client";

import dynamic from 'next/dynamic';
import { useRealtime } from '@/context/RealtimeContext';

// Dynamically import MapClient since leafleft requires window object
const MapClient = dynamic(() => import('./MapClient'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center rounded-lg border border-slate-800">
      <span className="text-slate-500">Loading Map...</span>
    </div>
  )
});

interface FloodMapProps {
  onIncidentSelect?: (incidentId: string) => void;
  selectedIncidentId?: string | null;
}

export function FloodMap({ onIncidentSelect, selectedIncidentId }: FloodMapProps) {
  const { state } = useRealtime();

  return (
    <MapClient 
      cameras={state.cameras}
      sensors={state.sensors}
      zones={state.zones}
      incidents={state.incidents}
      traffic={state.traffic}
      onIncidentSelect={onIncidentSelect}
      selectedIncidentId={selectedIncidentId}
    />
  );
}
