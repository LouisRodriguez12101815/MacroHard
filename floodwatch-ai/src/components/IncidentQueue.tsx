import { Incident } from '@/types/schemas';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentQueueProps {
  incidents: Incident[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
}

export function IncidentQueue({ incidents, onSelect, selectedId }: IncidentQueueProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-80 shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Active Incidents
        </h2>
        <span className="bg-red-500/10 text-red-400 text-xs py-0.5 px-2 rounded-full font-medium">
          {incidents.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {incidents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <ShieldAlert className="w-8 h-8 opacity-20" />
            <p className="text-sm">No active incidents</p>
          </div>
        ) : (
          incidents.map((incident) => {
            const isSelected = selectedId === incident.id;
            return (
              <div
                key={incident.id}
                onClick={() => onSelect(incident.id)}
                className={cn(
                  "p-4 rounded-lg cursor-pointer transition-all border text-left",
                  isSelected
                    ? "bg-slate-800 border-blue-500 shadow-md shadow-blue-900/20"
                    : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm",
                    incident.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    incident.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {incident.severity}
                  </span>
                  <div className="flex items-center text-slate-500 text-[10px] gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <h3 className="font-medium text-slate-200 text-sm leading-snug mb-1">
                  {incident.title}
                </h3>
                
                <p className="text-xs text-slate-400 line-clamp-2">
                  {incident.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
