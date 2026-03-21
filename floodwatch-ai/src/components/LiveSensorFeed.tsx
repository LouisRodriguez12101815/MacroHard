"use client";

import { useEffect, useState, useRef } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { useRealtime } from '@/context/RealtimeContext';

interface SensorLine {
  id: string;
  timestamp: string;
  source: string;
  location: string;
  reading: string;
  status: 'normal' | 'warning' | 'critical';
}

// Fetch from our live API routes and format into readable lines
async function fetchSensorLines(): Promise<SensorLine[]> {
  const lines: SensorLine[] = [];
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });

  // NOAA Tides
  try {
    const res = await fetch('/api/sensors/noaa-tides');
    if (res.ok) {
      const data = await res.json();
      if (data.waterLevel) {
        lines.push({
          id: `noaa-wl-${Date.now()}`,
          timestamp: now,
          source: 'NOAA Tides',
          location: 'Virginia Key',
          reading: `Water Level: ${data.waterLevel.value} ft (${data.waterLevel.datum})`,
          status: data.waterLevel.value > 2.0 ? 'warning' : 'normal',
        });
      }
      if (data.wind) {
        lines.push({
          id: `noaa-wind-${Date.now()}`,
          timestamp: now,
          source: 'NOAA Met',
          location: 'Virginia Key',
          reading: `Wind: ${data.wind.speed} kts ${data.wind.directionCardinal} | Gusts: ${data.wind.gusts} kts`,
          status: data.wind.gusts > 25 ? 'warning' : 'normal',
        });
      }
      if (data.waterTemp) {
        lines.push({
          id: `noaa-wt-${Date.now()}`,
          timestamp: now,
          source: 'NOAA Met',
          location: 'Virginia Key',
          reading: `Water Temp: ${data.waterTemp.value}°F | Air: ${data.airTemp?.value ?? '—'}°F`,
          status: 'normal',
        });
      }
      if (data.barometricPressure) {
        lines.push({
          id: `noaa-bp-${Date.now()}`,
          timestamp: now,
          source: 'NOAA Met',
          location: 'Virginia Key',
          reading: `Pressure: ${data.barometricPressure.value} mb`,
          status: data.barometricPressure.value < 1005 ? 'warning' : 'normal',
        });
      }
    }
  } catch { /* skip */ }

  // Air Quality
  try {
    const res = await fetch('/api/sensors/air-quality');
    if (res.ok) {
      const data = await res.json();
      if (data.aqi) {
        lines.push({
          id: `waqi-${Date.now()}`,
          timestamp: now,
          source: 'WAQI AQI',
          location: 'Fire Station #5',
          reading: `AQI: ${data.aqi.value} (${data.aqi.level}) | PM2.5: ${data.pollutants?.pm25 ?? '—'} | O₃: ${data.pollutants?.o3 ?? '—'}`,
          status: data.aqi.value > 100 ? 'critical' : data.aqi.value > 50 ? 'warning' : 'normal',
        });
      }
    }
  } catch { /* skip */ }

  // Miami Beach Pumps
  try {
    const res = await fetch('/api/sensors/miami-beach-pumps');
    if (res.ok) {
      const data = await res.json();
      lines.push({
        id: `mb-pumps-${Date.now()}`,
        timestamp: now,
        source: 'MB Pumps',
        location: 'Miami Beach',
        reading: `${data.total} stations | ${data.online} online | ${data.offline} offline`,
        status: data.offline > 5 ? 'critical' : data.offline > 0 ? 'warning' : 'normal',
      });
    }
  } catch { /* skip */ }

  // NEXRAD Rain Radar
  try {
    const res = await fetch('/api/sensors/nexrad-rain');
    if (res.ok) {
      const data = await res.json();
      for (const area of (data.areas || [])) {
        if (area.error) continue;
        lines.push({
          id: `nexrad-${area.area}-${Date.now()}`,
          timestamp: now,
          source: 'NEXRAD Radar',
          location: area.area,
          reading: `Rain: ${area.avgPrecipitationMmHr} mm/hr (${area.intensity}) | Max: ${area.maxPrecipitationMmHr} mm/hr`,
          status: area.avgPrecipitationMmHr > 7.5 ? 'critical' : area.avgPrecipitationMmHr > 2.5 ? 'warning' : 'normal',
        });
      }
    }
  } catch { /* skip */ }

  // WASD Sewer (summary)
  try {
    const res = await fetch('/api/sensors/sewer');
    if (res.ok) {
      const data = await res.json();
      const features = data.features || [];
      const ssoCount = features.filter((f: any) => f.attributes?.SSO === 'Y').length;
      const moratCount = features.filter((f: any) => f.attributes?.MORATFLAG === 'Yes').length;
      lines.push({
        id: `wasd-${Date.now()}`,
        timestamp: now,
        source: 'WASD Sewer',
        location: 'Miami-Dade County',
        reading: `${data.count} basins | SSO overflows: ${ssoCount} | Moratoriums: ${moratCount}`,
        status: ssoCount > 0 ? 'critical' : moratCount > 50 ? 'warning' : 'normal',
      });
    }
  } catch { /* skip */ }

  return lines;
}

// Simulated flood event readings
function getFloodSimLines(): SensorLine[] {
  const now = new Date().toLocaleTimeString('en-US', { hour12: false });
  const jitter = () => (Math.random() * 0.5).toFixed(1);
  return [
    { id: `sim-wl-${Date.now()}`, timestamp: now, source: '⚠ NOAA Tides', location: 'Virginia Key', reading: `Water Level: ${(3.2 + Math.random() * 0.8).toFixed(2)} ft (MLLW) ▲ SURGE`, status: 'critical' },
    { id: `sim-wind-${Date.now()}`, timestamp: now, source: '⚠ NOAA Met', location: 'Virginia Key', reading: `Wind: ${(35 + Math.random() * 15).toFixed(0)} kts ESE | Gusts: ${(52 + Math.random() * 10).toFixed(0)} kts`, status: 'critical' },
    { id: `sim-press-${Date.now()}`, timestamp: now, source: '⚠ NOAA Met', location: 'Virginia Key', reading: `Pressure: ${(998 - Math.random() * 5).toFixed(1)} mb ▼ DROPPING`, status: 'critical' },
    { id: `sim-rain1-${Date.now()}`, timestamp: now, source: '⚠ NEXRAD', location: 'Downtown Miami', reading: `Rain: ${(18 + Math.random() * 12).toFixed(1)} mm/hr (EXTREME) | Max: ${(35 + Math.random() * 15).toFixed(0)} mm/hr`, status: 'critical' },
    { id: `sim-rain2-${Date.now()}`, timestamp: now, source: '⚠ NEXRAD', location: 'Key Biscayne', reading: `Rain: ${(22 + Math.random() * 8).toFixed(1)} mm/hr (EXTREME) | Max: ${(40 + Math.random() * 10).toFixed(0)} mm/hr`, status: 'critical' },
    { id: `sim-pumps-${Date.now()}`, timestamp: now, source: '⚠ MB Pumps', location: 'Miami Beach', reading: `52 stations | 31 online | 21 OFFLINE ▲ CAPACITY EXCEEDED`, status: 'critical' },
    { id: `sim-sso-${Date.now()}`, timestamp: now, source: '⚠ WASD Sewer', location: 'Miami-Dade', reading: `1000 basins | SSO overflows: 24 ▲ | Moratoriums: 198`, status: 'critical' },
    { id: `sim-aqi-${Date.now()}`, timestamp: now, source: '⚠ WAQI AQI', location: 'Downtown', reading: `AQI: ${(85 + Math.random() * 30).toFixed(0)} (Moderate→USG) | PM2.5: ${(45 + Math.random() * 20).toFixed(0)}`, status: 'warning' },
    { id: `sim-fwy-${Date.now()}`, timestamp: now, source: '⚠ NDBC Fowey', location: 'Offshore', reading: `Wave Height: ${(8 + Math.random() * 4).toFixed(1)} ft | Wind: ${(42 + Math.random() * 10).toFixed(0)} kts`, status: 'critical' },
    { id: `sim-curr-${Date.now()}`, timestamp: now, source: '⚠ PORTS', location: 'Gov Cut', reading: `Current: ${(3.5 + Math.random() * 1.5).toFixed(1)} kts REVERSED ▲ SURGE INFLOW`, status: 'critical' },
  ];
}

export function LiveSensorFeed() {
  const { state } = useRealtime();
  const [lines, setLines] = useState<SensorLine[]>([]);
  const [refreshingIdx, setRefreshingIdx] = useState<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const initialLoad = useRef(true);

  // Initial fetch: load all at once
  useEffect(() => {
    const doFetch = async () => {
      const newLines = await fetchSensorLines();
      setLines(newLines);
      initialLoad.current = false;
    };
    doFetch();
  }, []);

  // Switch to simulated flood data when demo mode is active
  useEffect(() => {
    if (state.isDemoMode) {
      setLines(getFloodSimLines());
    }
  }, [state.isDemoMode]);

  // Staggered refresh: one sensor at a time, cycling through
  useEffect(() => {
    if (lines.length === 0) return;
    let idx = 0;
    const timer = setInterval(async () => {
      setRefreshingIdx(idx);
      if (state.isDemoMode) {
        // In demo mode, refresh with jittered flood values
        setLines(prev => {
          const updated = [...prev];
          const sim = getFloodSimLines();
          if (sim[idx]) updated[idx] = sim[idx];
          return updated;
        });
      } else {
        const freshLines = await fetchSensorLines();
        setLines(prev => {
          const updated = [...prev];
          if (freshLines[idx]) {
            updated[idx] = { ...freshLines[idx], id: `${freshLines[idx].id}-${Date.now()}` };
          }
          return updated;
        });
      }
      idx = (idx + 1) % lines.length;
      setTimeout(() => setRefreshingIdx(null), 500);
    }, state.isDemoMode ? 1500 : 3000); // Faster refresh in demo mode
    return () => clearInterval(timer);
  }, [lines.length, state.isDemoMode]);

  const statusColor = (s: string) => {
    if (s === 'critical') return 'text-red-400';
    if (s === 'warning') return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const statusDot = (s: string) => {
    if (s === 'critical') return 'bg-red-500 shadow-[0_0_6px_#ef4444]';
    if (s === 'warning') return 'bg-yellow-500 shadow-[0_0_6px_#eab308]';
    return 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${state.isDemoMode ? 'border-red-800 bg-red-950/30' : 'border-slate-800'}`}>
        {state.isDemoMode ? <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> : <Activity className="w-4 h-4" style={{ color: '#FF5F00' }} />}
        <span className={`text-xs font-bold uppercase tracking-widest ${state.isDemoMode ? 'text-red-400' : 'text-slate-500'}`}>
          {state.isDemoMode ? '⚠ FLOOD EVENT ACTIVE' : 'Live Sensor Feed'}
        </span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono">{lines.length} sources</span>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {lines.map((line, i) => (
          <div
            key={line.id}
            className={`bg-slate-800/50 rounded-md px-3 py-2 border transition-all duration-300 ${
              refreshingIdx === i ? 'border-[#FF5F00]/50 bg-[#FF5F00]/5' : 'border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                refreshingIdx === i ? 'bg-[#FF5F00] shadow-[0_0_6px_#FF5F00] animate-pulse' : statusDot(line.status)
              }`} />
              <span className="text-[10px] font-mono text-slate-500">{line.timestamp}</span>
              <span className="text-[10px] font-bold" style={{ color: '#FF5F00' }}>{line.source}</span>
              <span className="text-[10px] text-slate-600 ml-auto">{line.location}</span>
            </div>
            <p className={`text-xs font-mono mt-1 ${statusColor(line.status)}`}>
              {line.reading}
            </p>
          </div>
        ))}

        {lines.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs space-y-2">
            <Activity className="w-8 h-8 animate-pulse" />
            <span>Connecting to sensors...</span>
          </div>
        )}
      </div>
    </div>
  );
}
