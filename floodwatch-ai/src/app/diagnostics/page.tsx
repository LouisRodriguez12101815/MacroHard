"use client";

import { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Clock, Building2, Globe, Sparkles } from 'lucide-react';

// ── Sensor metadata ─────────────────────────────────────────────────────────

interface SensorMeta {
  id: string;
  name: string;
  owner: string;
  ownerType: 'government' | 'public' | 'private';
  measures: string;
  apiEndpoint: string;
  localRoute: string;
  seasonalKey: string;
}

const SENSORS: SensorMeta[] = [
  {
    id: 'noaa-tides',
    name: 'NOAA Tides & Meteorological',
    owner: 'NOAA / National Ocean Service',
    ownerType: 'government',
    measures: 'Water level, wind speed/direction, air temp, water temp, barometric pressure',
    apiEndpoint: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter (Station 8723214)',
    localRoute: '/api/sensors/noaa-tides',
    seasonalKey: 'noaa-tides',
  },
  {
    id: 'waqi-aqi',
    name: 'WAQI Air Quality Index',
    owner: 'World Air Quality Index Project',
    ownerType: 'public',
    measures: 'AQI, PM2.5, PM10, Ozone, NO₂, CO concentrations',
    apiEndpoint: 'https://api.waqi.info/feed/@6298/ (Miami Fire Station #5)',
    localRoute: '/api/sensors/air-quality',
    seasonalKey: 'waqi-aqi',
  },
  {
    id: 'nexrad-rain',
    name: 'SFWMD NEXRAD Radar Rain Grid',
    owner: 'South Florida Water Mgmt District',
    ownerType: 'government',
    measures: 'Real-time precipitation (mm/hr) across 2km grid cells',
    apiEndpoint: 'https://geoweb.sfwmd.gov/.../SFWMD_Rainfall/FeatureServer/4',
    localRoute: '/api/sensors/nexrad-rain',
    seasonalKey: 'nexrad-rain',
  },
  {
    id: 'mb-pumps',
    name: 'Miami Beach Stormwater Pumps',
    owner: 'City of Miami Beach',
    ownerType: 'government',
    measures: 'Pump station online/offline status, kilowatt capacity',
    apiEndpoint: 'https://gis.miamibeachfl.gov/.../cw_PumpStationN/MapServer/1',
    localRoute: '/api/sensors/miami-beach-pumps',
    seasonalKey: 'mb-pumps',
  },
  {
    id: 'wasd-sewer',
    name: 'Miami-Dade WASD Sewer Basins',
    owner: 'Miami-Dade Water & Sewer Dept',
    ownerType: 'government',
    measures: 'SSO overflows, NAPOT pump load, moratorium flags, generator status',
    apiEndpoint: 'https://gisweb.miamidade.gov/.../WASDSewerPumpStationBasins_2_v1/MapServer/0',
    localRoute: '/api/sensors/sewer',
    seasonalKey: 'wasd-sewer',
  },
  {
    id: '311-zones',
    name: 'Miami-Dade 311 Hazard Zones',
    owner: 'Miami-Dade County GIS',
    ownerType: 'government',
    measures: 'Storm surge evacuation zones, FEMA flood zone boundaries',
    apiEndpoint: 'https://giswspro.miamidade.gov/.../311CRM_Display/MapServer (Layers 11-12)',
    localRoute: '/api/sensors/311-zones',
    seasonalKey: '311-zones',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function DiagnosticsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<Record<string, any>>({});
  const [seasonal, setSeasonal] = useState<Record<string, string>>({});
  const [seasonalMonth, setSeasonalMonth] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  // Fetch live data from all sensors
  useEffect(() => {
    const fetchAll = async () => {
      const results: Record<string, any> = {};
      for (const sensor of SENSORS) {
        try {
          const res = await fetch(sensor.localRoute);
          if (res.ok) results[sensor.id] = await res.json();
        } catch { /* skip */ }
      }
      setLiveData(results);
      setLastUpdated(new Date().toLocaleTimeString());
    };
    fetchAll();
    const intv = setInterval(fetchAll, 30000);
    return () => clearInterval(intv);
  }, []);

  // Fetch Gemini seasonal averages once
  useEffect(() => {
    fetch('/api/diagnostics/seasonal')
      .then(r => r.json())
      .then(d => {
        setSeasonal(d.seasonal || {});
        setSeasonalMonth(d.month || '');
      })
      .catch(() => {});
  }, []);

  const getOwnerBadge = (type: string) => {
    switch (type) {
      case 'government': return { label: 'Government', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
      case 'public': return { label: 'Public/NGO', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
      case 'private': return { label: 'Private', color: '#F79E1B', bg: 'rgba(247,158,27,0.1)' };
      default: return { label: 'Unknown', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
    }
  };

  const getCurrentValue = (sensor: SensorMeta): string => {
    const d = liveData[sensor.id];
    if (!d) return 'Loading...';

    switch (sensor.id) {
      case 'noaa-tides':
        return d.waterLevel ? `${d.waterLevel.value} ft | Wind: ${d.wind?.speed ?? '—'} kts ${d.wind?.directionCardinal ?? ''}` : 'No data';
      case 'waqi-aqi':
        return d.aqi ? `AQI: ${d.aqi.value} (${d.aqi.level})` : 'No data';
      case 'nexrad-rain':
        return d.areas ? d.areas.map((a: any) => `${a.area}: ${a.avgPrecipitationMmHr} mm/hr`).join(' | ') : 'No data';
      case 'mb-pumps':
        return d.total ? `${d.online}/${d.total} online, ${d.offline} offline` : 'No data';
      case 'wasd-sewer':
        return d.count ? `${d.count} basins fetched` : 'No data';
      case '311-zones':
        return d.stormSurge ? `Storm surge: ${d.stormSurge.count} zones | Flood: ${d.floodZone?.count ?? 0} zones` : 'No data';
      default:
        return 'No data';
    }
  };

  const toggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" style={{ color: '#FF5F00' }} />
          <h1 className="text-xl font-bold tracking-tight text-white">Sensor Diagnostics</h1>
        </div>
        <div className="flex items-center gap-4">
          {seasonalMonth && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#F79E1B' }} />
              Seasonal context: {seasonalMonth}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {lastUpdated || 'Polling...'}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-3 pb-20">
          {SENSORS.map((sensor) => {
            const isExpanded = expandedId === sensor.id;
            const badge = getOwnerBadge(sensor.ownerType);
            const currentVal = getCurrentValue(sensor);
            const seasonalAvg = seasonal[sensor.seasonalKey] || 'Loading seasonal data...';

            return (
              <div key={sensor.id} className="rounded-xl overflow-hidden shadow-lg border" style={{ background: '#FFFAF5', borderColor: '#FFE0CC' }}>
                {/* Collapsed Tab Header */}
                <button
                  onClick={() => toggle(sensor.id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4 transition-colors hover:bg-orange-50/50"
                >
                  <div className="mt-0.5 shrink-0">
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" style={{ color: '#FF5F00' }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: '#FF5F00' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold" style={{ color: '#1a1a2e' }}>{sensor.name}</h3>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1"
                        style={{ color: badge.color, background: badge.bg, borderColor: badge.color + '30' }}
                      >
                        <Building2 className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-xs mb-2" style={{ color: '#666' }}>{sensor.owner}</p>

                    {/* Live Value */}
                    <div className="flex items-center gap-2 mb-1.5 rounded-md px-2 py-1" style={{ background: 'rgba(16,185,129,0.08)' }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981] shrink-0" />
                      <span className="text-xs font-mono font-semibold" style={{ color: '#065f46' }}>{currentVal}</span>
                    </div>

                    {/* What it measures */}
                    <p className="text-[11px]" style={{ color: '#555' }}>{sensor.measures}</p>

                    {/* Seasonal Average */}
                    <div className="flex items-start gap-1.5 mt-2 rounded-md px-2 py-1" style={{ background: 'rgba(247,158,27,0.08)' }}>
                      <Sparkles className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#F79E1B' }} />
                      <span className="text-[11px] italic" style={{ color: '#92400e' }}>{seasonalAvg}</span>
                    </div>
                  </div>
                </button>

                {/* Expanded API Details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #FFE0CC', background: '#FFF5EB' }}>
                    <div className="p-5 space-y-4">
                      {/* API Endpoint */}
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: '#999' }}>External API Endpoint</p>
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: '#FF5F00' }} />
                          <code className="text-[11px] font-mono break-all" style={{ color: '#EB001B' }}>{sensor.apiEndpoint}</code>
                        </div>
                      </div>

                      {/* Local Proxy Route */}
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: '#999' }}>Local Proxy Route</p>
                        <code className="text-[11px] font-mono font-semibold" style={{ color: '#FF5F00' }}>{sensor.localRoute}</code>
                      </div>

                      {/* Raw JSON Payload */}
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: '#999' }}>Latest Response (truncated)</p>
                        <pre className="text-[10px] font-mono p-3 rounded overflow-x-auto max-h-64 border" style={{ color: '#1a1a2e', background: '#fff', borderColor: '#e5e7eb' }}>
                          {liveData[sensor.id]
                            ? JSON.stringify(liveData[sensor.id], null, 2).substring(0, 2000)
                            : 'No data fetched yet...'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
