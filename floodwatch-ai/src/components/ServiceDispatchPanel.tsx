"use client";

import { FloodIncident, ServiceDispatch, DispatchStatus } from '@/types/schemas';
import { 
  Shield, 
  Truck, 
  MapPin, 
  Zap, 
  Radio, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceDispatchPanelProps {
  incident: FloodIncident;
}

export function ServiceDispatchPanel({ incident }: ServiceDispatchPanelProps) {
  if (!incident.dispatches || incident.dispatches.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center space-y-2 h-[120px]">
        <Activity className="w-6 h-6 text-slate-700 animate-pulse" />
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          Awaiting Verification
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-500" />
          Multi-Agency Service Dispatch
        </h3>
        <span className="text-[10px] font-mono text-slate-500">
          {incident.dispatches.filter(d => d.status !== 'SENT').length} / {incident.dispatches.length} ACKNOWLEDGED
        </span>
      </div>

      <div className="p-2 grid grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
        {incident.dispatches.map((dispatch) => (
          <ServiceCard key={dispatch.id} dispatch={dispatch} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ dispatch }: { dispatch: ServiceDispatch }) {
  const config = getServiceConfig(dispatch.serviceName);
  const statusConfig = getStatusConfig(dispatch.status);

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all duration-500",
      statusConfig.bgClass,
      statusConfig.borderClass
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-md shadow-inner", config.iconBg)}>
            <config.icon className={cn("w-4 h-4", config.iconColor)} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-200 uppercase tracking-tight">
              {config.label}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {dispatch.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <statusConfig.statusIcon className={cn("w-4 h-4 mt-1", statusConfig.iconColor, statusConfig.animate && "animate-pulse")} />
      </div>

      <div className="mt-2 space-y-1.5">
        <p className="text-[10px] text-slate-400 leading-tight italic">
          "{dispatch.message}"
        </p>
        
        {dispatch.responseMessage && (
          <div className="flex items-start gap-2 bg-slate-950/50 p-2 rounded border border-slate-800/50">
            <ArrowRight className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-[10px] text-emerald-400 font-bold leading-tight">
                {dispatch.responseMessage}
              </p>
              {dispatch.actionTaken && (
                <p className="text-[10px] text-slate-300 font-medium leading-tight">
                  <span className="text-slate-500">Action:</span> {dispatch.actionTaken}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getServiceConfig(name: ServiceDispatch['serviceName']) {
  switch (name) {
    case '911_POLICE': return { label: 'Police (911)', icon: Shield, iconColor: 'text-rose-400', iconBg: 'bg-rose-500/10' };
    case '311_MUNICIPAL': return { label: 'Municipal (311)', icon: Truck, iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10' };
    case 'GOOGLE_MAPS': return { label: 'Google Maps', icon: MapPin, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' };
    case 'POWER_UTILITY': return { label: 'FPL / Utility', icon: Zap, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/10' };
    case 'CELL_PROVIDERS': return { label: 'Wireless Alerts', icon: Radio, iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10' };
    case 'INSURANCE': return { label: 'Insurance Fed', icon: FileText, iconColor: 'text-slate-400', iconBg: 'bg-slate-500/10' };
  }
}

function getStatusConfig(status: DispatchStatus) {
  switch (status) {
    case 'SENT': return { 
      bgClass: 'bg-slate-900', borderClass: 'border-slate-800', 
      iconColor: 'text-blue-500', statusIcon: Clock, animate: true 
    };
    case 'ACKNOWLEDGED': return { 
      bgClass: 'bg-blue-500/5', borderClass: 'border-blue-500/20', 
      iconColor: 'text-blue-400', statusIcon: CheckCircle2, animate: false 
    };
    case 'ACTION_IN_PROGRESS': return { 
      bgClass: 'bg-emerald-500/5', borderClass: 'border-emerald-500/30', 
      iconColor: 'text-emerald-400', statusIcon: Activity, animate: true 
    };
    case 'COMPLETED': return { 
      bgClass: 'bg-emerald-950/20', borderClass: 'border-emerald-500/50', 
      iconColor: 'text-emerald-500', statusIcon: CheckCircle2, animate: false 
    };
    case 'FAILED': return { 
      bgClass: 'bg-rose-500/5', borderClass: 'border-rose-500/30', 
      iconColor: 'text-rose-500', statusIcon: AlertCircle, animate: false 
    };
  }
}
