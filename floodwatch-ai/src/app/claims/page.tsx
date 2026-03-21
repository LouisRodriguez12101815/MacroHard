"use client";

import { useRealtime } from "@/context/RealtimeContext";
import { CheckCircle, Clock, Search, FileText, Camera, Droplets, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Incident } from "@/types/schemas";

export default function ClaimsView() {
  const { state } = useRealtime();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  return (
    <div className="p-0 h-full flex bg-slate-950">
      
      {/* Left panel: Incidents list for validation */}
      <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-slate-800 flex flex-col bg-slate-900 h-full">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white mb-4">Claims Validation</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search past incidents..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {state.incidents.map(incident => (
            <button 
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                selectedIncident?.id === incident.id 
                  ? 'bg-blue-600/10 border-blue-500/50' 
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-mono text-slate-400">{incident.id.split('-').pop()}</span>
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-sm">
                  VALIDATED
                </span>
              </div>
              <p className="text-sm font-medium text-slate-200 line-clamp-1">{incident.title}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(incident.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {state.incidents.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-10">No incidents available for claims validation.</p>
          )}
        </div>
      </div>

      {/* Right panel: Evidence Timeline */}
      <div className="flex-1 overflow-y-auto p-10 flex flex-col">
        {selectedIncident ? (
          <div className="max-w-3xl w-full mx-auto">
            
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl font-bold tracking-tight text-white">Evidence Timeline</h1>
            </div>
            <p className="text-slate-400 mb-10 text-lg">{selectedIncident.title}</p>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
              
              {/* AI Detection Event */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 text-blue-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900 p-5 rounded-xl text-slate-300 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Webcam AI Detection
                    </div>
                    <time className="font-mono text-xs font-semibold text-slate-500">{new Date(selectedIncident.createdAt).toLocaleTimeString()}</time>
                  </div>
                  <p className="text-sm text-slate-400">Computer vision model identified massive water pooling on the roadway matching the incident location.</p>
                  <div className="mt-4 aspect-video bg-slate-800 rounded border border-slate-700 relative overflow-hidden flex items-center justify-center">
                    <span className="text-xs text-slate-500 font-mono absolute top-2 left-2">CAM-1 SNAPSHOT</span>
                    <Camera className="w-8 h-8 text-slate-700" />
                  </div>
                </div>
              </div>

              {/* Sensor Event */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 text-teal-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900 p-5 rounded-xl text-slate-300 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      Sewer Telemetry
                    </div>
                    <time className="font-mono text-xs font-semibold text-slate-500">{new Date(selectedIncident.createdAt).toLocaleTimeString()}</time>
                  </div>
                  <p className="text-sm text-slate-400">Sensor network reported critical backflow (8.5 inches above normal capacity), corroborating the exact street location.</p>
                  <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Peak Flow Rate</span>
                      <span className="text-red-400 font-mono">500 GPM (CRITICAL)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Generation Event */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 text-purple-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900 p-5 rounded-xl text-slate-300 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      AI Validation Report
                    </div>
                    <time className="font-mono text-xs font-semibold text-slate-500">{new Date(selectedIncident.createdAt).toLocaleTimeString()}</time>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Final confidence score locked at 92%. Immutable incident record generated for claims and audit purposes.</p>
                  <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download PDF Report
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="m-auto flex flex-col items-center justify-center text-slate-500">
            <ShieldCheck className="w-16 h-16 opacity-20 mb-4" />
            <p className="text-lg">Select an incident to view its validation timeline.</p>
            <p className="text-sm opacity-60 mt-1">Useful for citizen property damage claims vs city infrastructure.</p>
          </div>
        )}
      </div>
    </div>
  );
}
