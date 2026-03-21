"use client";

import { useState } from "react";
import { Car, Navigation, AlertTriangle, Shield, Loader2, Volume2, Radio, Wifi, MapPin, ChevronRight } from "lucide-react";

interface Hazard {
  type: string;
  description: string;
  severity: 'HIGH' | 'MODERATE' | 'LOW';
}

interface RouteAdvisory {
  protocol: string;
  timestamp: string;
  origin: string;
  destination: string;
  hazardCount: number;
  hazards: Hazard[];
  routeStatus: 'CLEAR' | 'CAUTION' | 'REROUTE_RECOMMENDED';
  voiceAdvisory: string;
}

const PRESET_ROUTES = [
  { origin: 'The LAB Miami, Wynwood', destination: 'Stiltsville, Key Biscayne', label: 'Wynwood → Stiltsville' },
  { origin: 'Downtown Miami, Flagler St', destination: 'Homestead, FL', label: 'Downtown → Homestead (rural)' },
  { origin: 'Miami Beach', destination: 'Everglades City, FL', label: 'Beach → Everglades (rural)' },
  { origin: 'Brickell, Miami', destination: 'Key Largo, FL', label: 'Brickell → Key Largo (US-1)' },
];

export default function VehiclePage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [advisory, setAdvisory] = useState<RouteAdvisory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aglConnected, setAglConnected] = useState(false);

  const fetchAdvisory = async (o?: string, d?: string) => {
    const orig = o || origin;
    const dest = d || destination;
    if (!orig || !dest) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/vehicle/route-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: orig, destination: dest }),
      });
      const data = await res.json();
      setAdvisory(data);
    } catch {
      setAdvisory(null);
    }
    setIsLoading(false);
  };

  const usePreset = (preset: typeof PRESET_ROUTES[0]) => {
    setOrigin(preset.origin);
    setDestination(preset.destination);
    fetchAdvisory(preset.origin, preset.destination);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'CLEAR': return { bg: '#10b981', text: 'Route Clear' };
      case 'CAUTION': return { bg: '#F79E1B', text: 'Proceed with Caution' };
      case 'REROUTE_RECOMMENDED': return { bg: '#EB001B', text: 'Reroute Recommended' };
      default: return { bg: '#6b7280', text: 'Unknown' };
    }
  };

  return (
    <div className="h-full flex bg-slate-950">
      {/* Left: AGL Connection Panel */}
      <div className="w-[300px] border-r border-slate-800 flex flex-col bg-slate-900 shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-5 h-5" style={{ color: '#FF5F00' }} />
            <h2 className="text-lg font-bold text-white">Vehicle Link</h2>
          </div>
          <p className="text-xs text-slate-500">Automotive Grade Linux Integration</p>
        </div>

        {/* AGL Status */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AGL Connection</span>
            <button
              onClick={() => setAglConnected(!aglConnected)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
                aglConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {aglConnected ? 'CONNECTED' : 'SIMULATE'}
            </button>
          </div>

          {aglConnected && (
            <div className="space-y-2 animate-[fadeSlideIn_0.3s_ease-out]">
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Vehicle</p>
                <p className="text-xs text-white font-mono">AGL Demo Unit — IVI Head Unit</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Protocol</p>
                <p className="text-xs font-mono" style={{ color: '#FF5F00' }}>AGL-FloodWatch-v1</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sync Status</p>
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <p className="text-xs text-emerald-400 font-mono">Live sensor feed active</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preset Routes */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Routes</p>
          <div className="space-y-1.5">
            {PRESET_ROUTES.map((preset, i) => (
              <button
                key={i}
                onClick={() => usePreset(preset)}
                className="w-full text-left px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white hover:border-[#FF5F00]/50 transition-all flex items-center gap-2"
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" style={{ color: '#FF5F00' }} />
                <span className="flex-1">{preset.label}</span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Hazard Legend */}
        <div className="p-4 flex-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hazard Types Monitored</p>
          <div className="space-y-2 text-[11px]">
            {[
              { icon: '🌧️', label: 'NEXRAD Radar Rain', desc: 'Real-time precipitation' },
              { icon: '🌊', label: 'Tide Levels', desc: 'Coastal surge risk' },
              { icon: '💨', label: 'Wind Gusts', desc: 'High wind warnings' },
              { icon: '🚰', label: 'Pump Stations', desc: 'Drainage capacity' },
              { icon: '⚠️', label: 'Sewer Overflows', desc: 'Road contamination' },
            ].map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400">
                <span>{h.icon}</span>
                <div>
                  <span className="text-slate-300 font-medium">{h.label}</span>
                  <span className="text-slate-600 ml-1">— {h.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Route Advisory */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#FF5F00' }} />
            <h1 className="text-xl font-bold text-white">Vehicle Safety GPS</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">Hazard-aware navigation powered by live sensor fusion</p>
        </div>

        {/* Route Input */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origin</label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Starting location..."
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF5F00]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destination</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where are you heading..."
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF5F00]"
              />
            </div>
            <button
              onClick={() => fetchAdvisory()}
              disabled={isLoading || !origin || !destination}
              className="px-5 py-2 rounded-lg text-white font-bold flex items-center gap-2 disabled:opacity-30 transition-all hover:scale-105 shrink-0"
              style={{ background: 'linear-gradient(135deg, #EB001B, #FF5F00)' }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Scan Route
            </button>
          </div>
        </div>

        {/* Advisory Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {advisory ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Route Status Banner */}
              <div
                className="rounded-xl p-5 flex items-center gap-4"
                style={{ background: `linear-gradient(135deg, ${statusColor(advisory.routeStatus).bg}22, ${statusColor(advisory.routeStatus).bg}08)`, border: `1px solid ${statusColor(advisory.routeStatus).bg}44` }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: statusColor(advisory.routeStatus).bg }}
                >
                  {advisory.routeStatus === 'CLEAR' ? <Shield className="w-7 h-7 text-white" /> : <AlertTriangle className="w-7 h-7 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{statusColor(advisory.routeStatus).text}</h2>
                  <p className="text-sm text-slate-400">{advisory.origin} → {advisory.destination}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{advisory.hazardCount ?? 0} hazard{(advisory.hazardCount ?? 0) !== 1 ? 's' : ''} detected</p>
                </div>
              </div>

              {/* Voice Advisory (Gemini) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="w-4 h-4" style={{ color: '#FF5F00' }} />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Voice Advisory</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF5F00]/10 text-[#FF5F00] font-bold ml-auto">Gemini</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed italic">&ldquo;{advisory.voiceAdvisory}&rdquo;</p>
              </div>

              {/* Hazard List */}
              {(advisory.hazards?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Hazards</p>
                  {(advisory.hazards || []).map((h, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${h.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-yellow-500 shadow-[0_0_6px_#eab308]'}`} />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-300">{h.type.replace('_', ' ')}</span>
                        <p className="text-xs text-slate-500">{h.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${h.severity === 'HIGH' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {h.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* AGL Protocol Payload */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <Radio className="w-4 h-4" style={{ color: '#FF5F00' }} />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AGL Protocol Payload</span>
                </div>
                <pre className="p-4 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                  {JSON.stringify(advisory, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <Car className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Enter a route or select a preset to scan for hazards</p>
              <p className="text-sm opacity-60 mt-1">Live sensor data will be analyzed for flood risks along your path</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
