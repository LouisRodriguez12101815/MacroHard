"use client";

import { useState, useEffect } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { LiveSensorFeed } from '@/components/LiveSensorFeed';
import { useMobileView } from '@/components/AppShell';
import { IncidentQueue } from '@/components/IncidentQueue';
import { IncidentDetailPanel } from '@/components/IncidentDetailPanel';
import { ServiceDispatchPanel } from '@/components/ServiceDispatchPanel';
import { FloodMap } from '@/components/FloodMap';
import { Shield, PlayCircle, Activity, ChevronRight, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { state, toggleDemoMode } = useRealtime();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const mobileView = useMobileView();

  const selectedIncident = state.incidents.find(i => i.id === selectedIncidentId);

  // Demo Timeline Stops
  const timelineStages = [
    { tick: 0, label: 'Monitoring Nominal' },
    { tick: 2, label: 'Weather Anomaly Detected' },
    { tick: 4, label: 'Sensor Spikes & Traffic Stops' },
    { tick: 7, label: 'Vision AI Verified' },
  ];

  const getTimelineProgress = () => {
    if (state.demoTickCount >= 7) return 100;
    if (state.demoTickCount >= 4) return 66;
    if (state.demoTickCount >= 2) return 33;
    return 0;
  };

  // ── Mobile View: YVE Hotel Corner ────────────────────────────────────────
  const [activeSensorIdx, setActiveSensorIdx] = useState(0);
  const [mobileTime, setMobileTime] = useState('');

  const nearbyMobileSensors = [
    { name: 'NOAA Tides', location: 'Virginia Key', icon: '🌊', value: 'Loading...', color: '#3b82f6' },
    { name: 'NEXRAD Rain', location: 'Downtown Miami', icon: '🌧️', value: 'Loading...', color: '#10b981' },
    { name: 'WASD Sewer', location: 'Brickell/Downtown', icon: '🚰', value: 'Loading...', color: '#FF5F00' },
    { name: 'Air Quality', location: 'Fire Station #5', icon: '💨', value: 'Loading...', color: '#F79E1B' },
    { name: 'MB Pumps', location: 'Miami Beach', icon: '⚡', value: 'Loading...', color: '#8b5cf6' },
    { name: 'Wind & Pressure', location: 'Virginia Key', icon: '🌀', value: 'Loading...', color: '#06b6d4' },
  ];
  const [mobileSensors, setMobileSensors] = useState(nearbyMobileSensors);

  // Rotate sensors every 3 seconds in mobile
  useEffect(() => {
    if (!mobileView) return;
    const timer = setInterval(() => {
      setActiveSensorIdx(prev => (prev + 1) % mobileSensors.length);
    }, 3000);
    setMobileTime(new Date().toLocaleTimeString());
    const clock = setInterval(() => setMobileTime(new Date().toLocaleTimeString()), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, [mobileView, mobileSensors.length]);

  // Fetch live data for mobile sensors
  useEffect(() => {
    if (!mobileView) return;
    const fetchMobile = async () => {
      const updated = [...nearbyMobileSensors];
      try {
        const tides = await fetch('/api/sensors/noaa-tides').then(r => r.json()).catch(() => null);
        if (tides?.waterLevel) updated[0].value = `${tides.waterLevel.value} ft MLLW`;
        if (tides?.wind) updated[5].value = `${tides.wind.speed} kts ${tides.wind.directionCardinal} | ${tides.barometricPressure?.value ?? '—'} mb`;
      } catch {}
      try {
        const rain = await fetch('/api/sensors/nexrad-rain').then(r => r.json()).catch(() => null);
        const dt = rain?.areas?.find((a: any) => a.area === 'Downtown Miami');
        if (dt) updated[1].value = `${dt.avgPrecipitationMmHr} mm/hr (${dt.intensity})`;
      } catch {}
      try {
        const sewer = await fetch('/api/sensors/sewer').then(r => r.json()).catch(() => null);
        if (sewer) {
          const sso = (sewer.features || []).filter((f: any) => f.attributes?.SSO === 'Y').length;
          updated[2].value = `${sewer.count} basins | ${sso} SSO overflows`;
        }
      } catch {}
      try {
        const aqi = await fetch('/api/sensors/air-quality').then(r => r.json()).catch(() => null);
        if (aqi?.aqi) updated[3].value = `AQI ${aqi.aqi.value} (${aqi.aqi.level})`;
      } catch {}
      try {
        const pumps = await fetch('/api/sensors/miami-beach-pumps').then(r => r.json()).catch(() => null);
        if (pumps) updated[4].value = `${pumps.online}/${pumps.total} online`;
      } catch {}
      setMobileSensors(updated);
    };
    fetchMobile();
    const intv = setInterval(fetchMobile, 30000);
    return () => clearInterval(intv);
  }, [mobileView]);

  if (mobileView) {
    const currentSensor = mobileSensors[activeSensorIdx];
    return (
      <div className="flex flex-col h-full bg-slate-950">
        {/* Compact header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#FF5F00' }} />
            <span className="text-sm font-bold text-white">FloodWatch AI</span>
          </div>
          <div className="flex items-center gap-2">
            {!state.isDemoMode ? (
              <button onClick={() => toggleDemoMode(true)} className="px-3 py-1.5 text-[10px] font-bold text-white rounded-md" style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00)' }}>DEMO</button>
            ) : (
              <button onClick={() => toggleDemoMode(false)} className="px-3 py-1.5 text-[10px] font-bold text-red-400 rounded-md bg-red-500/10 border border-red-500/20">STOP</button>
            )}
            <span className="text-[10px] font-mono text-slate-500">{mobileTime}</span>
          </div>
        </div>

        {/* Location banner */}
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
            <span className="text-xs text-slate-400">Monitoring:</span>
            <span className="text-xs font-bold text-white">YVE Hotel Miami</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-0.5">146 Biscayne Blvd, Miami, FL 33132 · 25.7748°N, 80.1887°W</p>
        </div>

        {/* Camera feed placeholder */}
        <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 relative" style={{ height: 200 }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-slate-700 text-xs font-mono mb-2">LIVE FEED — CAM-BISCAYNE-01</div>
            <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <div className="text-[10px] text-slate-600 mt-2">Biscayne Blvd & NE 2nd St</div>
          </div>
          {/* Scan line animation */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent animate-pulse" />
          <div className="absolute bottom-2 left-3 text-[9px] font-mono text-emerald-500/60">REC ●</div>
          <div className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-600">{mobileTime}</div>
        </div>

        {/* Rotating sensor card */}
        <div className="mx-4 mt-3 flex-1 flex flex-col min-h-0">
          {/* Active sensor — big card */}
          <div className="rounded-xl border p-4 transition-all duration-500" style={{ borderColor: currentSensor.color + '44', background: currentSensor.color + '08' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentSensor.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{currentSensor.name}</div>
                  <div className="text-[10px] text-slate-500">{currentSensor.location}</div>
                </div>
              </div>
              <div className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ color: currentSensor.color, background: currentSensor.color + '15' }}>
                LIVE
              </div>
            </div>
            <div className="text-lg font-mono font-bold" style={{ color: currentSensor.color }}>
              {currentSensor.value}
            </div>
          </div>

          {/* Sensor dots indicator */}
          <div className="flex justify-center gap-1.5 mt-3">
            {mobileSensors.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${i === activeSensorIdx ? 'w-4 h-1.5' : 'w-1.5 h-1.5'}`}
                style={{ backgroundColor: i === activeSensorIdx ? mobileSensors[i].color : '#334155' }}
              />
            ))}
          </div>

          {/* Mini sensor list */}
          <div className="mt-3 space-y-1 overflow-y-auto flex-1 pb-2">
            {mobileSensors.map((s, i) => (
              <div
                key={i}
                onClick={() => setActiveSensorIdx(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${i === activeSensorIdx ? 'bg-slate-800 border border-slate-700' : 'opacity-60'}`}
              >
                <span className="text-sm">{s.icon}</span>
                <span className="text-[11px] text-slate-300 flex-1">{s.name}</span>
                <span className="text-[10px] font-mono" style={{ color: s.color }}>{s.value === 'Loading...' ? '...' : s.value.substring(0, 20)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Value Proposition Header */}
        <header className={`border-b border-slate-800 bg-slate-900/40 shrink-0 relative overflow-hidden ${mobileView ? 'px-4 py-2' : 'px-6 py-5'}`}>
           {/* Glow Effect */}
           {state.isDemoMode && (
             <div className="absolute inset-0 bg-gradient-to-r from-[#EB001B]/10 via-[#FF5F00]/5 to-transparent animate-pulse" />
           )}
           <div className="relative z-10 flex items-center justify-between">
              <div>
                 <h1 className={`font-extrabold text-white tracking-tight flex items-center gap-2 ${mobileView ? 'text-base' : 'text-2xl'}`}>
                    <Shield className={mobileView ? 'w-4 h-4' : 'w-6 h-6'} style={{ color: '#FF5F00' }} />
                    {mobileView ? 'FloodWatch AI' : 'Real-time Multi-Agent Disaster Intelligence'}
                 </h1>
                 {!mobileView && (
                   <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                      FloodWatch AI autonomously monitors municipal infrastructure, fuses computer vision with IoT telemetry, and applies agentic reasoning to detect, verify, and resolve crises instantly.
                   </p>
                 )}
              </div>

              {!state.isDemoMode ? (
                <button
                  onClick={() => toggleDemoMode(true)}
                  className={`flex items-center text-white rounded-lg font-bold shadow-[0_0_20px_rgba(255,95,0,0.4)] transition-all hover:scale-105 ${mobileView ? 'px-3 py-2 text-xs' : 'px-6 py-3'}`}
                  style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00, #F79E1B)' }}
                >
                  <PlayCircle className={mobileView ? 'w-4 h-4 mr-1' : 'w-5 h-5 mr-2'} />
                  {mobileView ? 'Demo' : 'Trigger AI Flood Event Demo'}
                </button>
              ) : (
                <button
                  onClick={() => toggleDemoMode(false)}
                  className={`flex items-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all ${mobileView ? 'px-3 py-2 text-xs' : 'px-6 py-3'}`}
                >
                  <StopCircle className={mobileView ? 'w-4 h-4 mr-1' : 'w-5 h-5 mr-2'} />
                  {mobileView ? 'Stop' : 'End Demo'}
                </button>
              )}
           </div>

           {/* Demo Playback Timeline (Only visible in Demo Mode, hidden on mobile) */}
           {state.isDemoMode && !mobileView && (
             <div className="relative mt-6 pt-4 border-t border-slate-800">
                <div className="absolute top-8 left-0 w-full h-1 bg-slate-800 rounded-full" />
                <div 
                  className="absolute top-8 left-0 h-1 rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(255,95,0,0.5)]"
                  style={{ background: 'linear-gradient(90deg, #EB001B, #FF5F00, #F79E1B)', width: `${getTimelineProgress()}%` }}
                />

                <div className="relative flex justify-between z-10">
                   {timelineStages.map((stage, i) => {
                     const isPast = state.demoTickCount >= stage.tick;
                     const isCurrent = state.demoTickCount >= stage.tick && (i === timelineStages.length - 1 || state.demoTickCount < timelineStages[i+1].tick);
                     
                     return (
                       <div key={stage.tick} className="flex flex-col items-center">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 mb-2 transition-all duration-500",
                            isPast ? "border-[#FF5F00] shadow-[0_0_10px_rgba(255,95,0,0.8)]" : "bg-slate-900 border-slate-700",
                            isPast && !isCurrent && "bg-[#EB001B]",
                            isCurrent && "scale-150 animate-pulse bg-[#FF5F00] border-[#F79E1B] shadow-[0_0_15px_rgba(247,158,27,0.8)]"
                          )} />
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider transition-colors duration-500",
                            isCurrent ? "text-white" : (isPast ? "text-slate-300" : "text-slate-600")
                          )}>
                            {stage.label}
                          </span>
                       </div>
                     );
                   })}
                </div>
             </div>
           )}
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Live Sensor Feed Panel — hidden in mobile */}
          {!mobileView && (
            <div className="w-[280px] bg-slate-900/80 border-r border-slate-800 shrink-0 overflow-hidden">
              <LiveSensorFeed />
            </div>
          )}

          <div className="flex-1 relative border-r border-slate-800 min-h-0">
             <FloodMap 
               onIncidentSelect={setSelectedIncidentId}
               selectedIncidentId={selectedIncidentId}
             />
             
             {/* Gradient fade overlay for map edges */}
             <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_50px_rgba(15,23,42,0.8)] z-10" />
          </div>

          {/* Right panel — hidden in mobile */}
          <div className={`flex flex-col bg-slate-900 z-20 shadow-2xl shrink-0 h-full overflow-hidden ${mobileView ? 'hidden' : 'w-[420px]'}`}>
             {selectedIncident ? (
               <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
                 <div className="flex-1 min-h-0 overflow-hidden">
                    <IncidentDetailPanel 
                      incident={selectedIncident} 
                      sensors={state.sensors}
                      onClose={() => setSelectedIncidentId(null)}
                    />
                 </div>
               </div>
             ) : (
               <div className="flex-1 overflow-hidden p-4">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4" />
                   Active Intel Queue
                 </h2>
                 <IncidentQueue 
                   incidents={state.incidents} 
                   onSelect={setSelectedIncidentId}
                   selectedId={selectedIncidentId}
                 />
                 {state.incidents.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 p-8 text-center space-y-4">
                      <Shield className="w-16 h-16 text-slate-700" />
                      <p>AI Agents are actively securing the perimeter. No critical anomalies detected at this time.</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </main>
  );
}
