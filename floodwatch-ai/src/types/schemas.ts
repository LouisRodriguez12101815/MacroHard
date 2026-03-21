export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'UNVERIFIED' | 'VERIFIED' | 'RESOLVING' | 'RESOLVED';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  zoneId?: string;
}

export interface Camera {
  id: string;
  name: string;
  location: Location;
  isOnline: boolean;
  latestSnapshotUrl?: string; 
  aiAnalysisStatus: 'CLEAR' | 'WATER_DETECTED' | 'FLOOD_DETECTED';
  waterConfidenceScore: number;
}

export interface TrafficIncident {
  id: string;
  location: Location;
  type: 'CONGESTION' | 'ACCIDENT' | 'ROAD_CLOSURE';
  speedMph: number;
  normalSpeedMph: number;
  description: string;
}

export interface WeatherAlert {
  id: string;
  type: 'HEAVY_RAIN' | 'FLASH_FLOOD_WATCH' | 'FLASH_FLOOD_WARNING';
  rainfallIntensityInchesPerHour: number;
  description: string;
}

export interface WaterLevelReading { 
  cameraId: string;
  timestamp: string;
  depthInches: number;
}

export interface SewerSensorReading {
  sensorId: string;
  location: Location;
  timestamp: string;
  waterLevelInches: number;
  riseRateInchesPerMinute: number;
  flowRateGPM: number;
}

// [NEW] Agent Trace Model
export interface AgentTrace {
  id: string;
  agentName: 'VisionAgent' | 'SensorFusionAgent' | 'VerificationAgent' | 'DecisionAgent' | 'PublishingAgent';
  timestamp: string;
  inputContext: string;
  outputSummary: string;
  reasoning: string;
}

export interface ZoneRisk {
  id: string;
  name: string;
  boundaries: Location[]; 
  riskScore: number;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  explanation: string;
  // Globally tracking traces related to this zone
  traces?: AgentTrace[];
}

export interface RecommendedAction {
  action: string;
  explanation: string;
}

export interface FloodIncident {
  id: string;
  title: string;
  description: string;
  location: Location;
  severity: Severity;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  confidenceScore: number;
  sources: {
    type: 'WEBCAM' | 'SENSOR' | 'WEATHER' | 'TRAFFIC';
    id: string;
    description: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  recommendedActions: RecommendedAction[];
  agentTraces: AgentTrace[]; // [NEW] Track AI logic footprint
}

export interface CitizenAlert {
  id: string;
  incidentId: string;
  message: string;
  issuedAt: string;
  audience?: 'CITIZEN' | 'OPERATIONS';
  status: 'DRAFT' | 'PUBLISHED';
}

export interface ClaimEvidenceEvent {
  id: string;
  incidentId: string;
  timestamp: string;
  type: 'AI_DETECTION' | 'SENSOR_TELEMETRY' | 'WEATHER_REPORT' | 'VALIDATION_REPORT' | 'TRAFFIC_ANOMALY';
  description: string;
  url?: string;
  data: any; 
}

export type Incident = FloodIncident;
export type Alert = CitizenAlert;
export type ClaimEvidence = ClaimEvidenceEvent;
export type SensorReading = SewerSensorReading;
