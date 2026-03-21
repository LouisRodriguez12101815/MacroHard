"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Camera, SewerSensorReading, ZoneRisk, FloodIncident, TrafficIncident } from '@/types/schemas';
import { AlertCircle } from 'lucide-react';
import { useRealtime } from '@/context/RealtimeContext';

interface FusionZone {
  zone: string;
  name: string;
  score: number;
  level: string;
  color: string;
  breakdown: Record<string, { value: number; contribution: number; detail: string }>;
}

interface MapClientProps {
  cameras: Camera[];
  sensors: SewerSensorReading[];
  zones: ZoneRisk[];
  incidents: FloodIncident[];
  traffic: TrafficIncident[];
  onIncidentSelect?: (id: string) => void;
  selectedIncidentId?: string | null;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// ── Three Focal Points ────────────────────────────────────────────────────────

interface FocalPoint {
  id: string;
  name: string;
  subtitle: string;
  center: { lat: number; lng: number };
  zoom: number;
  sensors: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    description: string;
  }>;
}

const FOCAL_POINTS: FocalPoint[] = [
  {
    id: 'stiltsville',
    name: 'Stiltsville',
    subtitle: 'Biscayne Bay — Coastal Flood Monitoring',
    center: { lat: 25.6500, lng: -80.1300 },
    zoom: 12,
    sensors: [
      { id: 'noaa-8723214', name: 'NOAA Virginia Key — Tide & Met', lat: 25.7314, lng: -80.1618, type: 'tide_met', description: 'Real-time water level, wind, air/water temp, pressure' },
      { id: 'noaa-8723232', name: 'NOAA Key Biscayne — Tides', lat: 25.6652, lng: -80.1628, type: 'tide', description: 'Tide predictions for Key Biscayne' },
      { id: 'stiltsville-ref', name: 'Stiltsville Historic District', lat: 25.6167, lng: -80.1167, type: 'poi', description: '7 remaining stilt houses — 1 mile south of Cape Florida' },
      { id: 'cape-florida', name: 'Cape Florida / Bill Baggs State Park', lat: 25.6654, lng: -80.1586, type: 'poi', description: 'Southernmost tip of Key Biscayne — storm surge exposure' },
      { id: 'mdc-311-storm-surge', name: '311 Storm Surge Zones', lat: 25.6900, lng: -80.1600, type: 'hazard_zone', description: 'Hurricane evacuation zones from Miami-Dade 311 GIS' },
      { id: 'mdc-311-flood-zone', name: '311 FEMA Flood Zones', lat: 25.6400, lng: -80.1300, type: 'hazard_zone', description: 'FEMA flood zones \u2014 VE coastal high hazard zone' },
      { id: 'mb-pumps-1', name: 'Miami Beach Stormwater Pumps', lat: 25.7907, lng: -80.1300, type: 'sewer', description: 'Live pump online/offline status \u2014 first line of defense against surface flooding' },
      { id: 'nexrad-kb', name: 'NEXRAD Rain Radar \u2014 Key Biscayne', lat: 25.6900, lng: -80.1500, type: 'weather', description: 'SFWMD 2km radar rain grid \u2014 real-time precipitation mm/hr' },
    ],
  },
  {
    id: 'the-lab',
    name: 'The LAB Miami',
    subtitle: 'Wynwood — Air Quality & Sewer Infrastructure',
    center: { lat: 25.8010, lng: -80.1990 },
    zoom: 15,
    sensors: [
      { id: 'the-lab-venue', name: 'The LAB Miami — Hackathon Venue', lat: 25.8010, lng: -80.1990, type: 'poi', description: '400 NW 26th St — Google AI Hackathon HQ' },
      { id: 'waqi-6298', name: 'WAQI Air Quality — Fire Station #5', lat: 25.78, lng: -80.19, type: 'air_quality', description: 'Live AQI + PM2.5, PM10, O3, NO2, CO — updates every 5 min' },
      { id: 'wasd-wynwood-1', name: 'WASD Sewer — Wynwood North', lat: 25.8050, lng: -80.1985, type: 'sewer', description: 'Live pump station status: SSO, NAPOT, moratorium flags' },
      { id: 'wasd-wynwood-2', name: 'WASD Sewer — Midtown', lat: 25.7950, lng: -80.1910, type: 'sewer', description: 'Live pump station status: generator backup, capacity load' },
      { id: 'nws-wynwood', name: 'NWS Weather Alerts \u2014 Miami-Dade', lat: 25.8020, lng: -80.2050, type: 'weather', description: 'Zone FLZ074 \u2014 active severe weather alerts' },
      { id: 'wasd-moratorium', name: 'WASD Moratorium Basins \u2014 Wynwood', lat: 25.7980, lng: -80.1960, type: 'sewer', description: 'Basins under pumping moratorium \u2014 high backup flood risk' },
      { id: 'nexrad-wyn', name: 'NEXRAD Rain Radar \u2014 Wynwood', lat: 25.8000, lng: -80.2020, type: 'weather', description: 'SFWMD 2km radar rain grid \u2014 real-time precipitation mm/hr' },
    ],
  },
  {
    id: 'olympia',
    name: 'Olympia Theater',
    subtitle: 'Flagler St, Downtown — Urban Flood Risk',
    center: { lat: 25.7748, lng: -80.1903 },
    zoom: 16,
    sensors: [
      { id: 'olympia-theater', name: 'Olympia Theater at Gusman Center', lat: 25.7748, lng: -80.1903, type: 'poi', description: '174 E Flagler St — historic 1926 theater, flood-prone zone' },
      { id: 'wasd-downtown-1', name: 'WASD Sewer — Brickell/Downtown', lat: 25.7720, lng: -80.1940, type: 'sewer', description: 'Live pump station: SSO overflows, NAPOT load hours' },
      { id: 'wasd-downtown-2', name: 'WASD Sewer — Flagler District', lat: 25.7760, lng: -80.1880, type: 'sewer', description: 'Live pump station: moratorium flags, generator status' },
      { id: 'mdc-311-downtown', name: '311 Flood Zone — Downtown', lat: 25.7740, lng: -80.1920, type: 'hazard_zone', description: 'FEMA AE flood zone — urban flood risk area' },
      { id: 'waqi-downtown', name: 'WAQI Air Quality — Downtown', lat: 25.7750, lng: -80.1870, type: 'air_quality', description: 'Live AQI from nearest monitoring station' },
      { id: 'nws-downtown', name: 'NWS Weather \u2014 Downtown Miami', lat: 25.7770, lng: -80.1950, type: 'weather', description: 'Zone FLZ074 \u2014 flash flood watches & warnings' },
      { id: 'nexrad-dt', name: 'NEXRAD Rain Radar \u2014 Downtown', lat: 25.7730, lng: -80.1870, type: 'weather', description: 'SFWMD 2km radar rain grid \u2014 real-time precipitation mm/hr' },
      { id: 'ports-mi0201', name: 'PORTS Current Meter \u2014 Government Cut', lat: 25.7629, lng: -80.0913, type: 'current', description: 'NOAA PORTS 6-min current speed/direction at Miami inlet' },
      { id: 'metar-kmia', name: 'METAR \u2014 Miami Intl Airport', lat: 25.7959, lng: -80.2870, type: 'aviation', description: 'Aviation weather: wind, visibility, pressure, temp' },
    ],
  },
  {
    id: 'roberts',
    name: "Robert Is Here",
    subtitle: 'Homestead \u2014 Rural Flood Evacuation Corridor',
    center: { lat: 25.4464, lng: -80.4995 },
    zoom: 12,
    sensors: [
      { id: 'roberts-poi', name: "Robert Is Here Fruit Stand", lat: 25.4464, lng: -80.4995, type: 'poi', description: '19200 SW 344th St, Homestead \u2014 iconic rural landmark on US-1 corridor' },
      { id: 'nexrad-homestead', name: 'NEXRAD Rain Radar \u2014 Homestead', lat: 25.4500, lng: -80.5000, type: 'weather', description: 'SFWMD 2km radar rain grid \u2014 critical for rural flash flood detection' },
      { id: 'ndbc-fwyf1', name: 'NDBC Fowey Rocks \u2014 Offshore', lat: 25.591, lng: -80.097, type: 'buoy', description: 'C-MAN station: wind, pressure, waves, SST \u2014 hurricane approach indicator' },
      { id: 'ndbc-mlrf1', name: 'NDBC Molasses Reef \u2014 Keys', lat: 25.012, lng: -80.376, type: 'buoy', description: 'C-MAN station: marine winds/pressure upstream of Biscayne Bay' },
      { id: 'nws-homestead', name: 'NWS Weather \u2014 South Dade', lat: 25.4700, lng: -80.4800, type: 'weather', description: 'Zone FLZ074 \u2014 flash flood & tornado warnings for rural corridor' },
      { id: 'wasd-homestead', name: 'WASD Sewer \u2014 South Dade', lat: 25.4600, lng: -80.4700, type: 'sewer', description: 'Pump stations along US-1: SSO overflows, moratorium flags' },
      { id: 'metar-khst', name: 'METAR \u2014 Homestead ARB', lat: 25.4886, lng: -80.3837, type: 'aviation', description: 'Aviation weather: wind, visibility \u2014 rural evacuation corridor conditions' },
      { id: 'kamx-radar', name: 'NEXRAD KAMX \u2014 Miami Doppler Radar', lat: 25.6111, lng: -80.4127, type: 'radar', description: 'Primary radar for severe storms, tornadoes, rainfall estimation' },
    ],
  },
];

// ── Marker Pin Components ───────────────────────────────────────────────────

function MarkerPin({ color, pulse, children }: { color: string; pulse?: boolean; children?: React.ReactNode }) {
  return (
    <div
      className={`rounded-full bg-slate-900 border-2 p-1 text-white flex items-center justify-center shadow-lg ${pulse ? 'animate-pulse' : ''}`}
      style={{ width: 32, height: 32, borderColor: color }}
    >
      {children}
    </div>
  );
}

function CameraMarkerIcon({ isAlert }: { isAlert: boolean }) {
  const color = isAlert ? '#ef4444' : '#3b82f6';
  return (
    <MarkerPin color={color} pulse={isAlert}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    </MarkerPin>
  );
}

function SensorMarkerIcon({ isDanger }: { isDanger: boolean }) {
  const color = isDanger ? '#ef4444' : '#10b981';
  return (
    <MarkerPin color={color} pulse={isDanger}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    </MarkerPin>
  );
}

function TrafficMarkerIcon() {
  return (
    <MarkerPin color="#f97316">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </MarkerPin>
  );
}

function IncidentMarkerIcon() {
  return (
    <MarkerPin color="#ef4444" pulse>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </MarkerPin>
  );
}

// ── Main Map Component ──────────────────────────────────────────────────────

export default function MapClient({ cameras, sensors, zones, incidents, traffic, onIncidentSelect }: MapClientProps) {
  const { state } = useRealtime();
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const [activeFocalIdx, setActiveFocalIdx] = useState(0);
  const activeFocal = FOCAL_POINTS[activeFocalIdx];
  const [fusionScores, setFusionScores] = useState<FusionZone[]>([]);
  const [demoProgress, setDemoProgress] = useState(0); // 0-100 flood progression
  const [demoZoneIdx, setDemoZoneIdx] = useState(0);
  const [floodFlash, setFloodFlash] = useState(false);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flash flood demo — escalates over ~50 seconds
  useEffect(() => {
    if (state.isDemoMode) {
      // Pick a random zone to flood
      const randomIdx = Math.floor(Math.random() * FOCAL_POINTS.length);
      setDemoZoneIdx(randomIdx);
      setActiveFocalIdx(randomIdx);
      setDemoProgress(0);

      // Escalate: 0→100 over 50 seconds (every 500ms, +1)
      let progress = 0;
      demoTimerRef.current = setInterval(() => {
        progress += 1;
        setDemoProgress(Math.min(progress, 100));

        // Flash effect when crossing thresholds
        if (progress === 25 || progress === 50 || progress === 75 || progress >= 90) {
          setFloodFlash(true);
          setTimeout(() => setFloodFlash(false), 300);
        }

        if (progress >= 100 && demoTimerRef.current) {
          clearInterval(demoTimerRef.current);
        }
      }, 500);
    } else {
      setDemoProgress(0);
      setFloodFlash(false);
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    }
    return () => { if (demoTimerRef.current) clearInterval(demoTimerRef.current); };
  }, [state.isDemoMode]);

  // Generate simulated fusion scores during demo
  useEffect(() => {
    if (state.isDemoMode && demoProgress > 0) {
      const demoZone = FOCAL_POINTS[demoZoneIdx];
      setFusionScores(FOCAL_POINTS.map((fp, idx) => {
        const isTarget = idx === demoZoneIdx;
        const score = isTarget ? demoProgress : Math.min(15 + Math.floor(demoProgress * 0.2), 30);
        const level = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW';
        const color = score >= 75 ? '#EB001B' : score >= 50 ? '#FF5F00' : score >= 25 ? '#F79E1B' : '#10b981';
        return {
          zone: fp.id, name: fp.name, score, level, color,
          breakdown: {
            rain: { value: isTarget ? demoProgress * 0.3 : 0, contribution: isTarget ? Math.round(demoProgress * 0.3) : 0, detail: `${(isTarget ? demoProgress * 0.3 : 0).toFixed(1)} mm/hr` },
            pumps: { value: isTarget ? demoProgress * 0.4 : 0, contribution: isTarget ? Math.round(demoProgress * 0.2) : 1, detail: isTarget ? `${Math.floor(demoProgress * 0.2)}/52 offline` : '0/52 offline' },
            tide: { value: isTarget ? 0.5 + demoProgress * 0.03 : 0.5, contribution: isTarget ? Math.round(demoProgress * 0.15) : 2, detail: `${(0.5 + (isTarget ? demoProgress * 0.03 : 0)).toFixed(2)} ft` },
            wind: { value: isTarget ? demoProgress * 0.5 : 3, contribution: isTarget ? Math.round(demoProgress * 0.1) : 1, detail: `${(isTarget ? demoProgress * 0.5 : 3).toFixed(0)} kts` },
            sewer: { value: isTarget ? demoProgress * 0.2 : 5, contribution: isTarget ? Math.round(demoProgress * 0.15) : 2, detail: isTarget ? `${Math.floor(demoProgress * 0.15)} SSOs` : '0 SSOs' },
            pressure: { value: isTarget ? 1015 - demoProgress * 0.15 : 1015, contribution: isTarget ? Math.round(demoProgress * 0.1) : 0, detail: `${(1015 - (isTarget ? demoProgress * 0.15 : 0)).toFixed(1)} mb` },
          },
        };
      }));
    } else if (!state.isDemoMode) {
      // Fetch real scores when not in demo
      fetch('/api/fusion').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.zones) setFusionScores(d.zones);
      }).catch(() => {});
    }
  }, [demoProgress, state.isDemoMode, demoZoneIdx]);

  // Fetch real fusion scores when not in demo mode
  useEffect(() => {
    if (state.isDemoMode) return;
    const fetchFusion = () => {
      fetch('/api/fusion').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.zones) setFusionScores(d.zones);
      }).catch(() => {});
    };
    fetchFusion();
    const intv = setInterval(fetchFusion, 30000);
    return () => clearInterval(intv);
  }, [state.isDemoMode]);

  const handleMarkerClick = useCallback((id: string) => {
    setActiveInfoWindow(prev => (prev === id ? null : id));
  }, []);

  // If no API key is set, show a placeholder with instructions
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <div>
          <p className="font-semibold text-slate-300">Google Maps API Key Required</p>
          <p className="text-sm mt-2">
            Set <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs">.env.local</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full rounded-lg overflow-hidden relative z-0 transition-all duration-500 ${floodFlash ? 'ring-4 ring-red-500/60' : ''}`}
      style={{ border: state.isDemoMode && demoProgress > 25 ? `2px solid ${demoProgress >= 75 ? '#EB001B' : demoProgress >= 50 ? '#FF5F00' : '#F79E1B'}` : '1px solid rgb(30 41 59)' }}
    >
      {/* Flood overlay that grows with demo progress */}
      {state.isDemoMode && demoProgress > 10 && (
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${demoProgress >= 75 ? 'rgba(235,0,27,0.15)' : demoProgress >= 50 ? 'rgba(255,95,0,0.12)' : 'rgba(247,158,27,0.08)'} ${demoProgress}%, transparent ${demoProgress + 20}%)`,
          }}
        />
      )}
      {/* Focal Point Selector with Fusion Scores */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-slate-900/90 backdrop-blur-sm rounded-lg p-1 border border-slate-700 shadow-xl">
        {FOCAL_POINTS.map((fp, idx) => {
          const fusion = fusionScores.find(f => f.zone === fp.id);
          return (
            <button
              key={fp.id}
              onClick={() => { setActiveFocalIdx(idx); setActiveInfoWindow(null); }}
              className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${
                idx === activeFocalIdx
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              style={idx === activeFocalIdx ? { background: 'linear-gradient(135deg, #EB001B, #FF5F00)' } : undefined}
            >
              <div className="flex items-center gap-2">
                <span>{fp.name}</span>
                {fusion && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: fusion.color, color: '#fff' }}
                  >
                    {fusion.score}
                  </span>
                )}
              </div>
              <div className={`text-[9px] font-normal mt-0.5 ${idx === activeFocalIdx ? 'text-orange-200' : 'text-slate-500'}`}>
                {fusion ? `${fusion.level} • ${fp.sensors.length} sensors` : `${fp.sensors.length} sensors`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fusion Score Detail for active zone */}
      {(() => {
        const fusion = fusionScores.find(f => f.zone === activeFocal.id);
        return fusion ? (
          <div className="absolute top-[70px] left-1/2 -translate-x-1/2 z-20">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border shadow-xl" style={{ borderColor: fusion.color + '44' }}>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: fusion.color }}>{fusion.score}</div>
                  <div className="text-[8px] uppercase tracking-widest text-slate-500">Flood Index</div>
                </div>
                <div className="h-8 w-px bg-slate-700" />
                <div className="flex gap-2">
                  {Object.entries(fusion.breakdown).map(([key, b]) => (
                    <div key={key} className="text-center">
                      <div className="text-[10px] font-bold" style={{ color: b.contribution > 5 ? fusion.color : '#64748b' }}>{b.contribution}</div>
                      <div className="text-[8px] text-slate-500">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-slate-500 text-center mt-1">{activeFocal.subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-1 border border-slate-700">
              <p className="text-[10px] text-slate-400 text-center">{activeFocal.subtitle}</p>
            </div>
          </div>
        );
      })()}

      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          key={activeFocal.id}
          mapId="8e0a97af9386fef" // Required for AdvancedMarker
          defaultCenter={activeFocal.center}
          defaultZoom={activeFocal.zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          colorScheme="DARK"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Sensor Station Markers for active focal point */}
          {activeFocal.sensors.map((station) => (
            <AdvancedMarker
              key={station.id}
              position={{ lat: station.lat, lng: station.lng }}
              onClick={() => handleMarkerClick(station.id)}
            >
              <SensorMarkerIcon isDanger={fusionScores.find(f => f.zone === activeFocal.id)?.level === 'CRITICAL'} />
            </AdvancedMarker>
          ))}
          {activeFocal.sensors.map((station) => activeInfoWindow === station.id && (
            <InfoWindow
              key={`info-${station.id}`}
              position={{ lat: station.lat, lng: station.lng }}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="p-2 min-w-[200px] bg-slate-900 border border-slate-800 rounded">
                <p className="font-bold text-sm text-white">{station.name}</p>
                <p className="text-xs text-slate-400 mt-1">{station.description}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">{station.lat.toFixed(4)}, {station.lng.toFixed(4)}</p>
              </div>
            </InfoWindow>
          ))}

          {/* Camera Markers */}
          {cameras.map((camera) => (
            <AdvancedMarker
              key={camera.id}
              position={{ lat: camera.location.lat, lng: camera.location.lng }}
              onClick={() => handleMarkerClick(camera.id)}
            >
              <CameraMarkerIcon isAlert={camera.aiAnalysisStatus === 'WATER_DETECTED'} />
            </AdvancedMarker>
          ))}
          {cameras.map((camera) => activeInfoWindow === camera.id && (
            <InfoWindow
              key={`info-${camera.id}`}
              position={{ lat: camera.location.lat, lng: camera.location.lng }}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="space-y-1 p-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded">
                <p className="font-semibold text-sm text-white">{camera.name}</p>
                <div className="text-xs text-slate-400">AI Status: <span className={camera.aiAnalysisStatus === 'WATER_DETECTED' ? 'text-red-400 font-bold' : 'text-slate-300'}>{camera.aiAnalysisStatus}</span></div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1">
                  <div className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" style={{ width: `${Math.max(camera.waterConfidenceScore, 5)}%` }} />
                </div>
                <div className="text-[10px] text-right text-slate-500 mt-0.5 font-mono">Confidence: {camera.waterConfidenceScore}%</div>
              </div>
            </InfoWindow>
          ))}

          {/* Sensor Markers */}
          {sensors.map((sensor) => (
            <AdvancedMarker
              key={sensor.sensorId}
              position={{ lat: sensor.location.lat, lng: sensor.location.lng }}
              onClick={() => handleMarkerClick(sensor.sensorId)}
            >
              <SensorMarkerIcon isDanger={sensor.riseRateInchesPerMinute > 0.5} />
            </AdvancedMarker>
          ))}
          {sensors.map((sensor) => activeInfoWindow === sensor.sensorId && (
            <InfoWindow
              key={`info-${sensor.sensorId}`}
              position={{ lat: sensor.location.lat, lng: sensor.location.lng }}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="p-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded">
                <p className="font-semibold text-sm text-white">Sewer: {sensor.sensorId}</p>
                <p className="text-xs text-slate-400 mt-1">Water Depth: <span className="text-emerald-400 font-bold">{sensor.waterLevelInches.toFixed(1)} in</span></p>
                <p className="text-xs text-slate-400">Rise Rate: <span className={sensor.riseRateInchesPerMinute > 0.5 ? 'text-red-400 font-bold' : 'text-slate-500'}>{sensor.riseRateInchesPerMinute.toFixed(1)} in/min</span></p>
                <p className="text-xs text-slate-500">Flow: {sensor.flowRateGPM} GPM</p>
              </div>
            </InfoWindow>
          ))}

          {/* Traffic Markers */}
          {traffic.map((trf) => (
            <AdvancedMarker
              key={trf.id}
              position={{ lat: trf.location.lat, lng: trf.location.lng + 0.002 }}
              onClick={() => handleMarkerClick(trf.id)}
            >
              <TrafficMarkerIcon />
            </AdvancedMarker>
          ))}
          {traffic.map((trf) => activeInfoWindow === trf.id && (
            <InfoWindow
              key={`info-${trf.id}`}
              position={{ lat: trf.location.lat, lng: trf.location.lng + 0.002 }}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="p-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded">
                <p className="font-semibold text-sm text-white">Traffic Anomaly</p>
                <p className="text-xs text-slate-400 mt-1">{trf.description}</p>
                <p className="text-xs font-mono mt-1 text-orange-400">{trf.speedMph} MPH / {trf.normalSpeedMph} Normal</p>
              </div>
            </InfoWindow>
          ))}

          {/* Incident Markers */}
          {incidents.map((incident) => (
            <AdvancedMarker
              key={incident.id}
              position={{ lat: incident.location.lat + 0.002, lng: incident.location.lng }}
              onClick={() => {
                handleMarkerClick(incident.id);
                onIncidentSelect?.(incident.id);
              }}
            >
              <IncidentMarkerIcon />
            </AdvancedMarker>
          ))}
          {incidents.map((incident) => activeInfoWindow === incident.id && (
            <InfoWindow
              key={`info-${incident.id}`}
              position={{ lat: incident.location.lat + 0.002, lng: incident.location.lng }}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div className="space-y-2 p-1 max-w-xs min-w-[200px] bg-slate-900 border border-slate-800 rounded shadow-2xl">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                  <p className="font-semibold text-red-400 shrink-0">Active Incident</p>
                </div>
                <p className="text-sm font-medium text-white">{incident.title}</p>
                <p className="text-xs text-slate-400 leading-snug">{incident.description.substring(0, 100)}...</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">Status: {incident.status}</span>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">{incident.confidenceScore}% Acc.</span>
                </div>
              </div>
            </InfoWindow>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
