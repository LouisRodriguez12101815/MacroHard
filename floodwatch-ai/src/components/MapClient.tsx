"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, SewerSensorReading, ZoneRisk, FloodIncident, TrafficIncident } from '@/types/schemas';
import { AlertCircle, Camera as CameraIcon, Activity, AlertTriangle } from 'lucide-react';

interface MapClientProps {
  cameras: Camera[];
  sensors: SewerSensorReading[];
  zones: ZoneRisk[];
  incidents: FloodIncident[];
  traffic: TrafficIncident[];
  onIncidentSelect?: (id: string) => void;
  selectedIncidentId?: string | null;
}

// Custom icons
function createHtmlIcon(htmlCode: string, colorClass: string, isPulsing: boolean = false) {
  return L.divIcon({
    html: `<div class="rounded-full bg-slate-900 border-2 ${colorClass} p-1 text-white flex items-center justify-center shadow-lg ${isPulsing ? 'animate-pulse' : ''}" style="width: 32px; height: 32px;">${htmlCode}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const cameraIcon = createHtmlIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>', 'border-blue-500');
const cameraWaterIcon = createHtmlIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>', 'border-red-500 bg-red-500/20 text-red-500', true);
const sensorIcon = createHtmlIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', 'border-emerald-500');
const sensorDangerIcon = createHtmlIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', 'border-red-500 text-red-500', true);

const trafficIcon = createHtmlIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', 'border-orange-500');

const incidentIcon = createHtmlIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', 'border-red-500 bg-red-500/20 text-red-500', true);

// Pre-defined zone polygons for Miami-Dade just for aesthetic purpose
const downtownZonePoly: [number, number][] = [
  [25.77, -80.20], [25.77, -80.18], [25.75, -80.18], [25.75, -80.20]
];
const beachZonePoly: [number, number][] = [
  [25.80, -80.14], [25.80, -80.12], [25.78, -80.12], [25.78, -80.14]
];

export default function MapClient({ cameras, sensors, zones, incidents, traffic, onIncidentSelect, selectedIncidentId }: MapClientProps) {
  const MIAMI_DADE_CENTER = { lat: 25.7617, lng: -80.1918 };

  const getZoneColor = (level: string) => {
    switch (level) {
      case 'DANGER': return '#ef4444';
      case 'WARNING': return '#eab308';
      case 'SAFE': default: return '#3b82f6';
    }
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-800 relative z-0">
      <MapContainer
        center={MIAMI_DADE_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        {/* Zones */}
        {zones.map(zone => {
           const poly = zone.id === 'zone-1' ? downtownZonePoly : beachZonePoly;
           return (
             <Polygon key={zone.id} positions={poly} pathOptions={{ color: getZoneColor(zone.riskLevel), fillColor: getZoneColor(zone.riskLevel), weight: 2, fillOpacity: 0.1 }}>
               <Popup>
                 <div className="p-1 max-w-[200px]">
                    <h3 className="font-bold border-b border-slate-700 pb-1 mb-1">{zone.name}</h3>
                    <p className="text-xs text-slate-300 mb-1">Risk Score: {(zone.riskScore * 100).toFixed(0)}/100</p>
                    <p className="text-[10px] text-slate-400 font-mono italic">{zone.explanation}</p>
                 </div>
               </Popup>
             </Polygon>
           )
        })}

        {/* Cameras */}
        {cameras.map((camera) => (
          <Marker key={camera.id} position={camera.location} icon={camera.aiAnalysisStatus === 'WATER_DETECTED' ? cameraWaterIcon : cameraIcon}>
            <Popup>
              <div className="space-y-1 p-1">
                <p className="font-semibold text-sm">{camera.name}</p>
                <div className="text-xs text-slate-400">AI Status: {camera.aiAnalysisStatus}</div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(camera.waterConfidenceScore, 5)}%` }} />
                </div>
                <div className="text-[10px] text-right text-slate-500 mt-0.5">Confidence: {camera.waterConfidenceScore}%</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Sensors */}
        {sensors.map((sensor) => (
          <Marker key={sensor.sensorId} position={sensor.location} icon={sensor.waterLevelInches > 5 ? sensorDangerIcon : sensorIcon}>
            <Popup>
              <div className="p-1">
                 <p className="font-semibold text-sm">Sewer: {sensor.sensorId}</p>
                 <p className="text-xs text-slate-300 mt-1">Water Depth: <span className="text-emerald-400">{sensor.waterLevelInches.toFixed(1)} in</span></p>
                 <p className="text-xs text-slate-300">Rise Rate: <span className={sensor.riseRateInchesPerMinute > 0.5 ? 'text-red-400 font-bold' : 'text-slate-400'}>{sensor.riseRateInchesPerMinute.toFixed(1)} in/min</span></p>
                 <p className="text-xs text-slate-300">Flow: {sensor.flowRateGPM} GPM</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Traffic */}
        {traffic.map((trf) => (
          <Marker key={trf.id} position={{...trf.location, lng: trf.location.lng + 0.002}} icon={trafficIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-sm">Traffic Anomaly</p>
                <p className="text-xs text-slate-400 mt-1">{trf.description}</p>
                <p className="text-xs font-mono mt-1 text-orange-400">{trf.speedMph} MPH / {trf.normalSpeedMph} Normal</p>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Incidents */}
        {incidents.map((incident) => (
          <Marker 
            key={incident.id} 
            position={{...incident.location, lat: incident.location.lat + 0.002}} 
            icon={incidentIcon}
            eventHandlers={{ click: () => onIncidentSelect?.(incident.id) }}
          >
            <Popup>
              <div className="space-y-2 p-1 max-w-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="font-semibold text-red-400">Active Incident</p>
                </div>
                <p className="text-sm font-medium">{incident.title}</p>
                <p className="text-xs text-slate-400">{incident.description.substring(0, 100)}...</p>
                <p className="text-[10px] font-mono bg-slate-800 p-1 rounded border border-slate-700">Status: {incident.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
