"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Bell, Map, FileSearch, PlayCircle, StopCircle, Activity, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtime } from '@/context/RealtimeContext';
import { useEffect, useState } from 'react';
import { DiagnosticSnapshot } from '@/adapters/BaseAdapter';

export function Sidebar() {
  const pathname = usePathname();
  const { state, toggleDemoMode } = useRealtime();
  const [diagnostics, setDiagnostics] = useState<DiagnosticSnapshot[]>([]);

  useEffect(() => {
    const fetchDiag = () => {
      fetch('/api/diagnostics')
        .then(res => res.json())
        .then(data => setDiagnostics(data))
        .catch(() => {});
    };
    fetchDiag();
    const intv = setInterval(fetchDiag, 5000);
    return () => clearInterval(intv);
  }, []);

  const overallHealth = diagnostics.length === 0 ? 'LOADING' : (diagnostics.every(d => d.status === 'ONLINE') ? 'ONLINE' : 'DEGRADED');

  const navItems = [
    { name: 'Operations Map', href: '/', icon: Map },
    { name: 'Citizen Alerts', href: '/alerts', icon: Bell },
    { name: 'Claims Intel', href: '/claims', icon: FileSearch },
    { name: 'Diagnostics', href: '/diagnostics', icon: Activity },
    { name: 'Vehicle Safety', href: '/vehicle', icon: Car }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 overflow-hidden shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Shield className="w-6 h-6 mr-3 shrink-0" style={{ color: '#FF5F00' }} />
        <span className="text-lg font-bold text-white tracking-tight">FloodWatch AI</span>
      </div>

      {/* Health Status Indicator */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pipeline Health</span>
           <div className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", overallHealth === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : (overallHealth === 'LOADING' ? 'bg-slate-500' : 'bg-yellow-500 shadow-[0_0_5px_#eab308] animate-pulse'))} />
              <span className="text-[10px] font-mono text-slate-400">{overallHealth}</span>
           </div>
        </div>
        <div className="flex gap-1 mt-2 w-full">
           {diagnostics.length === 0 ? (
               <div className="text-[10px] text-slate-600 animate-pulse">Polling Adapters...</div>
           ) : (
               diagnostics.map(d => (
                 <div key={d.adapterId} title={`${d.name} (${d.mode})`} className={cn("flex-1 h-1.5 rounded-full cursor-help transition-all", d.status === 'ONLINE' ? (d.mode === 'LIVE' ? 'bg-purple-500' : 'bg-emerald-500/50') : (d.status === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500'))} />
               ))
           )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-lg transition-colors group",
                isActive 
                  ? "bg-orange-600/10 font-medium" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mr-3 shrink-0",
                isActive ? "text-orange-500" : "text-slate-500 group-hover:text-slate-300"
              )} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => toggleDemoMode(!state.isDemoMode)}
          className={cn(
            "w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
            state.isDemoMode 
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
          )}
        >
          {state.isDemoMode ? (
            <>
              <StopCircle className="w-5 h-5 mr-2" />
              End Simulation
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5 mr-2" />
              Start Demo Mode
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
