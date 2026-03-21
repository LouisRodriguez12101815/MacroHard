"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useRealtime } from '@/context/RealtimeContext';
import { IncidentQueue } from '@/components/IncidentQueue';
import { IncidentDetailPanel } from '@/components/IncidentDetailPanel';
import { FloodMap } from '@/components/FloodMap';
import { Shield, PlayCircle, Activity, ChevronRight, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { state, toggleDemoMode } = useRealtime();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Value Proposition Header */}
        <header className="px-6 py-5 border-b border-slate-800 bg-slate-900/40 shrink-0 relative overflow-hidden">
           {/* Glow Effect */}
           {state.isDemoMode && (
             <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent animate-pulse" />
           )}
           <div className="relative z-10 flex items-center justify-between">
              <div>
                 <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-500" />
                    Real-time Multi-Agent Disaster Intelligence
                 </h1>
                 <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                    FloodWatch AI autonomously monitors municipal infrastructure, fuses computer vision with IoT telemetry, and applies agentic reasoning to detect, verify, and resolve crises instantly.
                 </p>
              </div>

              {!state.isDemoMode ? (
                <button
                  onClick={() => toggleDemoMode(true)}
                  className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Trigger AI Flood Event Demo
                </button>
              ) : (
                <button
                  onClick={() => toggleDemoMode(false)}
                  className="flex items-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all"
                >
                  <StopCircle className="w-5 h-5 mr-2" />
                  End Demo
                </button>
              )}
           </div>

           {/* Demo Playback Timeline (Only visible in Demo Mode) */}
           {state.isDemoMode && (
             <div className="relative mt-6 pt-4 border-t border-slate-800">
                <div className="absolute top-8 left-0 w-full h-1 bg-slate-800 rounded-full" />
                <div 
                  className="absolute top-8 left-0 h-1 bg-gradient-to-r from-blue-500 to-red-500 rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  style={{ width: `${getTimelineProgress()}%` }}
                />

                <div className="relative flex justify-between z-10">
                   {timelineStages.map((stage, i) => {
                     const isPast = state.demoTickCount >= stage.tick;
                     const isCurrent = state.demoTickCount >= stage.tick && (i === timelineStages.length - 1 || state.demoTickCount < timelineStages[i+1].tick);
                     
                     return (
                       <div key={stage.tick} className="flex flex-col items-center">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 mb-2 transition-all duration-500",
                            isPast ? "bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-slate-900 border-slate-700",
                            isCurrent && "scale-150 animate-pulse bg-blue-500 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
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

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative border-r border-slate-800">
             <FloodMap 
               onIncidentSelect={setSelectedIncidentId}
               selectedIncidentId={selectedIncidentId}
             />
             
             {/* Gradient fade overlay for map edges */}
             <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_0_50px_rgba(15,23,42,0.8)] z-10" />
          </div>

          <div className="w-[380px] flex flex-col bg-slate-900 z-20 shadow-2xl shrink-0">
             {selectedIncident ? (
               <IncidentDetailPanel 
                 incident={selectedIncident} 
                 sensors={state.sensors}
                 onClose={() => setSelectedIncidentId(null)}
               />
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
    </div>
  );
}
