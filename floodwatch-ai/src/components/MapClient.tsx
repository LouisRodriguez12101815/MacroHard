"use client";

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, SewerSensorReading, ZoneRisk, FloodIncident, TrafficIncident } from '@/types/schemas';
import { useRealtime } from '@/context/RealtimeContext';

// Fix default marker icons (Leaflet + webpack/Next.js issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

// ── Focal Points ────────────────────────────────────────────────────────

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
    subtitle: 'Biscayne Bay \u2014 Coastal Flood Monitoring',
    center: { lat: 25.6500, lng: -80.1300 },
    zoom: 12,
    sensors: [
      { id: 'noaa-8723214', name: 'NOAA Virginia Key \u2014 Tide & Met', lat: 25.7314, lng: -80.1618, type: 'tide_met', description: 'Real-time water level, wind, air/water temp, pressure' },
      { id: 'noaa-8723232', name: 'NOAA Key Biscayne \u2014 Tides', lat: 25.6652, lng: -80.1628, type: 'tide', description: 'Tide predictions for Key Biscayne' },
      { id: 'stiltsville-ref', name: 'Stiltsville Historic District', lat: 25.6167, lng: -80.1167, type: 'poi', description: '7 remaining stilt houses \u2014 1 mile south of Cape Florida' },
      { id: 'cape-florida', name: 'Cape Florida / Bill Baggs State Park', lat: 25.6654, lng: -80.1586, type: 'poi', description: 'Southernmost tip of Key Biscayne \u2014 storm surge exposure' },
      { id: 'mdc-311-storm-surge', name: '311 Storm Surge Zones', lat: 25.6900, lng: -80.1600, type: 'hazard_zone', description: 'Hurricane evacuation zones from Miami-Dade 311 GIS' },
      { id: 'mdc-311-flood-zone', name: '311 FEMA Flood Zones', lat: 25.6400, lng: -80.1300, type: 'hazard_zone', description: 'FEMA flood zones \u2014 VE coastal high hazard zone' },
      { id: 'mb-pumps-1', name: 'Miami Beach Stormwater Pumps', lat: 25.7907, lng: -80.1300, type: 'sewer', description: 'Live pump online/offline status \u2014 first line of defense against surface flooding' },
      { id: 'nexrad-kb', name: 'NEXRAD Rain Radar \u2014 Key Biscayne', lat: 25.6900, lng: -80.1500, type: 'weather', description: 'SFWMD 2km radar rain grid \u2014 real-time precipitation mm/hr' },
    ],
  },
  {
    id: 'the-lab',
    name: 'The LAB Miami',
    subtitle: 'Wynwood \u2014 Air Quality & Sewer Infrastructure',
    center: { lat: 25.8010, lng: -80.1990 },
    zoom: 15,
    sensors: [
      { id: 'the-lab-venue', name: 'The LAB Miami \u2014 Hackathon Venue', lat: 25.8010, lng: -80.1990, type: 'poi', description: '400 NW 26th St \u2014 Google AI Hackathon HQ' },
      { id: 'waqi-6298', name: 'WAQI Air Quality \u2014 Fire Station #5', lat: 25.78, lng: -80.19, type: 'air_quality', description: 'Live AQI + PM2.5, PM10, O3, NO2, CO \u2014 updates every 5 min' },
      { id: 'wasd-wynwood-1', name: 'WASD Sewer \u2014 Wynwood North', lat: 25.8050, lng: -80.1985, type: 'sewer', description: 'Live pump station status: SSO, NAPOT, moratorium flags' },
      { id: 'wasd-wynwood-2', name: 'WASD Sewer \u2014 Midtown', lat: 25.7950, lng: -80.1910, type: 'sewer', description: 'Live pump station status: generator backup, capacity load' },
      { id: 'nws-wynwood', name: 'NWS Weather Alerts \u2014 Miami-Dade', lat: 25.8020, lng: -80.2050, type: 'weather', description: 'Zone FLZ074 \u2014 active severe weather alerts' },
      { id: 'wasd-moratorium', name: 'WASD Moratorium Basins \u2014 Wynwood', lat: 25.7980, lng: -80.1960, type: 'sewer', description: 'Basins under pumping moratorium \u2014 high backup flood risk' },
      { id: 'nexrad-wyn', name: 'NEXRAD Rain Radar \u2014 Wynwood', lat: 25.8000, lng: -80.2020, type: 'weather', description: 'SFWMD 2km radar rain grid \u2014 real-time precipitation mm/hr' },
    ],
  },
  {
    id: 'olympia',
    name: 'Olympia Theater',
    subtitle: 'Flagler St, Downtown \u2014 Urban Flood Risk',
    center: { lat: 25.7748, lng: -80.1903 },
    zoom: 16,
    sensors: [
      { id: 'olympia-theater', name: 'Olympia Theater at Gusman Center', lat: 25.7748, lng: -80.1903, type: 'poi', description: '174 E Flagler St \u2014 historic 1926 theater, flood-prone zone' },
      { id: 'wasd-downtown-1', name: 'WASD Sewer \u2014 Brickell/Downtown', lat: 25.7720, lng: -80.1940, type: 'sewer', description: 'Live pump station: SSO overflows, NAPOT load hours' },
      { id: 'wasd-downtown-2', name: 'WASD Sewer \u2014 Flagler District', lat: 25.7760, lng: -80.1880, type: 'sewer', description: 'Live pump station: moratorium flags, generator status' },
      { id: 'mdc-311-downtown', name: '311 Flood Zone \u2014 Downtown', lat: 25.7740, lng: -80.1920, type: 'hazard_zone', description: 'FEMA AE flood zone \u2014 urban flood risk area' },
      { id: 'waqi-downtown', name: 'WAQI Air Quality \u2014 Downtown', lat: 25.7750, lng: -80.1870, type: 'air_quality', description: 'Live AQI from nearest monitoring station' },
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

// ── Custom marker icons ─────────────────────────────────────────────────

function createIcon(color: string, pulse: boolean = false): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#0f172a;border:2px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)${pulse ? ';animation:pulse 1.5s infinite' : ''}">
      <div style="width:8px;height:8px;border-radius:50%;background:${color}"></div>
    </div>`,
  });
}

const SENSOR_TYPE_COLORS: Record<string, string> = {
  tide_met: '#3b82f6', tide: '#3b82f6', poi: '#FF5F00', hazard_zone: '#ef4444',
  sewer: '#10b981', weather: '#8b5cf6', air_quality: '#F79E1B', current: '#06b6d4',
  aviation: '#64748b', buoy: '#0ea5e9', radar: '#a855f7',
};

// ── Map view controller (flyTo on focal point change) ───────────────────

function MapViewController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom, { duration: 1.2 });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

// ── Main Map Component ──────────────────────────────────────────────────

export default function MapClient({ cameras, sensors, zones, incidents, traffic, onIncidentSelect }: MapClientProps) {
  const { state } = useRealtime();
  const [activeFocalIdx, setActiveFocalIdx] = useState(0);
  const activeFocal = FOCAL_POINTS[activeFocalIdx];
  const [fusionScores, setFusionScores] = useState<FusionZone[]>([]);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoZoneIdx, setDemoZoneIdx] = useState(0);
  const [floodFlash, setFloodFlash] = useState(false);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flash flood demo
  useEffect(() => {
    if (state.isDemoMode) {
      const randomIdx = Math.floor(Math.random() * FOCAL_POINTS.length);
      setDemoZoneIdx(randomIdx);
      setActiveFocalIdx(randomIdx);
      setDemoProgress(0);
      let progress = 0;
      demoTimerRef.current = setInterval(() => {
        progress += 1;
        setDemoProgress(Math.min(progress, 100));
        if (progress === 25 || progress === 50 || progress === 75 || progress >= 90) {
          setFloodFlash(true);
          setTimeout(() => setFloodFlash(false), 300);
        }
        if (progress >= 100 && demoTimerRef.current) clearInterval(demoTimerRef.current);
      }, 500);
    } else {
      setDemoProgress(0);
      setFloodFlash(false);
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    }
    return () => { if (demoTimerRef.current) clearInterval(demoTimerRef.current); };
  }, [state.isDemoMode]);

  // Demo fusion scores
  useEffect(() => {
    if (state.isDemoMode && demoProgress > 0) {
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
      fetch('/api/fusion').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.zones) setFusionScores(d.zones);
      }).catch(() => {});
    }
  }, [demoProgress, state.isDemoMode, demoZoneIdx]);

  // Real fusion scores
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

  return (
    <div className={`w-full h-full rounded-lg overflow-hidden relative z-0 transition-all duration-500 ${floodFlash ? 'ring-4 ring-red-500/60' : ''}`}
      style={{ border: state.isDemoMode && demoProgress > 25 ? `2px solid ${demoProgress >= 75 ? '#EB001B' : demoProgress >= 50 ? '#FF5F00' : '#F79E1B'}` : '1px solid rgb(30 41 59)' }}
    >
      {/* Flood overlay during demo */}
      {state.isDemoMode && demoProgress > 10 && (
        <div
          className="absolute inset-0 z-[1000] pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${demoProgress >= 75 ? 'rgba(235,0,27,0.15)' : demoProgress >= 50 ? 'rgba(255,95,0,0.12)' : 'rgba(247,158,27,0.08)'} ${demoProgress}%, transparent ${demoProgress + 20}%)`,
          }}
        />
      )}

      {/* Focal Point Selector with Fusion Scores */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 bg-slate-900/90 backdrop-blur-sm rounded-lg p-1 border border-slate-700 shadow-xl">
        {FOCAL_POINTS.map((fp, idx) => {
          const fusion = fusionScores.find(f => f.zone === fp.id);
          return (
            <button
              key={fp.id}
              onClick={() => setActiveFocalIdx(idx)}
              className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${
                idx === activeFocalIdx ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              style={idx === activeFocalIdx ? { background: 'linear-gradient(135deg, #EB001B, #FF5F00)' } : undefined}
            >
              <div className="flex items-center gap-2">
                <span>{fp.name}</span>
                {fusion && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: fusion.color, color: '#fff' }}>
                    {fusion.score}
                  </span>
                )}
              </div>
              <div className={`text-[9px] font-normal mt-0.5 ${idx === activeFocalIdx ? 'text-orange-200' : 'text-slate-500'}`}>
                {fusion ? `${fusion.level} \u2022 ${fp.sensors.length} sensors` : `${fp.sensors.length} sensors`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fusion Score Detail */}
      {(() => {
        const fusion = fusionScores.find(f => f.zone === activeFocal.id);
        return fusion ? (
          <div className="absolute top-[70px] left-1/2 -translate-x-1/2 z-[1000]">
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
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-1 border border-slate-700">
              <p className="text-[10px] text-slate-400 text-center">{activeFocal.subtitle}</p>
            </div>
          </div>
        );
      })()}

      {/* Leaflet Map — CartoDB Dark Matter tiles (free, no API key) */}
      <MapContainer
        center={[activeFocal.center.lat, activeFocal.center.lng]}
        zoom={activeFocal.zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapViewController center={activeFocal.center} zoom={activeFocal.zoom} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {/* Sensor Station Markers */}
        {activeFocal.sensors.map((station) => (
          <Marker key={station.id} position={[station.lat, station.lng]} icon={createIcon(SENSOR_TYPE_COLORS[station.type] || '#FF5F00')}>
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-bold text-sm text-slate-900">{station.name}</p>
                <p className="text-xs text-slate-500 mt-1">{station.description}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-1">{station.lat.toFixed(4)}, {station.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Camera Markers */}
        {cameras.map((cam) => (
          <Marker key={cam.id} position={[cam.location.lat, cam.location.lng]} icon={createIcon(cam.aiAnalysisStatus === 'WATER_DETECTED' ? '#ef4444' : '#3b82f6', cam.aiAnalysisStatus === 'WATER_DETECTED')}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold text-sm text-slate-900">{cam.name}</p>
                <div className="text-xs text-slate-600">AI: <span className={cam.aiAnalysisStatus === 'WATER_DETECTED' ? 'text-red-600 font-bold' : ''}>{cam.aiAnalysisStatus}</span></div>
                <div className="text-[10px] text-slate-500">Confidence: {cam.waterConfidenceScore}%</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident Markers */}
        {incidents.map((inc) => (
          <Marker key={inc.id} position={[inc.location.lat + 0.002, inc.location.lng]} icon={createIcon('#ef4444', true)} eventHandlers={{ click: () => onIncidentSelect?.(inc.id) }}>
            <Popup>
              <div className="max-w-xs min-w-[200px]">
                <p className="font-semibold text-red-600">Active Incident</p>
                <p className="text-sm font-medium text-slate-900">{inc.title}</p>
                <p className="text-xs text-slate-500">{inc.description.substring(0, 100)}...</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
