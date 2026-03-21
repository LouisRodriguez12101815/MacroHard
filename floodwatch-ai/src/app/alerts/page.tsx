"use client";

import { useRealtime } from "@/context/RealtimeContext";
import { AlertTriangle, MapPin, Send, Zap } from "lucide-react";
import { format } from "date-fns";

export default function AlertsView() {
  const { state } = useRealtime();
  
  return (
    <div className="p-8 h-full flex flex-col bg-slate-950">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Citizen Alerts</h1>
          <p className="text-slate-400">Manage and broadcast emergency notifications to the public.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
          <Send className="w-4 h-4" />
          Create Custom Alert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
        {state.alerts.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 rounded-xl border border-slate-800 border-dashed">
            <AlertTriangle className="w-10 h-10 opacity-30 mb-3" />
            <p>No active alerts.</p>
          </div>
        ) : (
          state.alerts.map((alert) => (
            <div key={alert.id} className="bg-slate-900 border border-red-500/30 rounded-xl flex flex-col overflow-hidden shadow-xl shadow-red-900/5">
              <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-red-500 font-bold text-sm tracking-widest uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  Flash Flood Warning
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {new Date(alert.issuedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="p-5 flex-1">
                <p className="text-slate-200 text-lg font-medium leading-snug mb-4">
                  "{alert.message}"
                </p>
                
                <div className="flex flex-wrap gap-2 mt-auto">
                   <div className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium border border-slate-700">
                     <MapPin className="w-3.5 h-3.5 text-blue-400" />
                     Zone Affected
                   </div>
                   <div className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium border border-slate-700">
                     <Zap className="w-3.5 h-3.5 text-yellow-400" />
                     {alert.status}
                   </div>
                </div>
              </div>
              
              {alert.status === 'DRAFT' && (
                <div className="p-3 bg-slate-950 border-t border-slate-800 grid grid-cols-2 gap-3">
                   <button className="py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Edit</button>
                   <button className="py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors">Broadcast</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
