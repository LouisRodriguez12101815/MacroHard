"use client";

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Activity, ServerCrash, CheckCircle, Clock } from 'lucide-react';
import { DiagnosticSnapshot } from '@/adapters/BaseAdapter';

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticSnapshot[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchDiag = () => {
      fetch('/api/diagnostics')
        .then(res => res.json())
        .then(data => {
            setDiagnostics(data);
            setLastUpdated(new Date().toLocaleTimeString());
        })
        .catch(console.error);
    };

    fetchDiag();
    const intv = setInterval(fetchDiag, 2000);
    return () => clearInterval(intv);
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ONLINE': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'DEGRADED': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'OFFLINE': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-slate-400 bg-slate-800';
    }
  };

  const getModeLabelColor = (mode: string) => {
    switch(mode) {
      case 'LIVE': return 'bg-purple-500/20 border-purple-500/50 text-purple-400';
      case 'MOCK': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'DEMO': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">Data Plubming Diagnostics</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
             <Clock className="w-3.5 h-3.5" />
             Last Polled: {lastUpdated}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {diagnostics.map((diag) => (
                 <div key={diag.adapterId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                       <div>
                          <h2 className="text-sm font-bold text-white mb-1">{diag.name}</h2>
                          <p className="text-xs text-slate-400 font-mono">{diag.adapterId}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getModeLabelColor(diag.mode)}`}>
                             {diag.mode}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${getStatusColor(diag.status)}`}>
                             {diag.status === 'ONLINE' ? <CheckCircle className="w-3 h-3" /> : <ServerCrash className="w-3 h-3" />}
                             {diag.status}
                          </span>
                       </div>
                    </div>

                    {/* Stats Body */}
                    <div className="p-4 grid grid-cols-2 gap-4 border-b border-slate-800">
                       <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Last Comm</p>
                          <p className="text-xs font-mono text-slate-300">
                             {diag.lastFetchTime ? new Date(diag.lastFetchTime).toLocaleTimeString() : 'Never'}
                          </p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Error Count</p>
                          <p className="text-xs font-mono text-slate-300">{diag.errorCount}</p>
                       </div>
                    </div>

                    {/* Code Snippet Payload */}
                    <div className="bg-slate-950 p-4">
                       <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Payload Fragment</p>
                       <pre className="text-[10px] font-mono text-emerald-400 bg-black/50 p-3 rounded overflow-x-auto max-h-48 border border-slate-800 pointer-events-auto">
                          {JSON.stringify(diag.lastPayloadSample, null, 2)}
                       </pre>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </main>
    </div>
  );
}
