import { 
  Camera, FloodIncident, SewerSensorReading, ZoneRisk, CitizenAlert, 
  ClaimEvidenceEvent, TrafficIncident, WeatherAlert, Location 
} from '../types/schemas';
import { SensorFusionAgent } from '../agents/SensorFusionAgent';
import { VerificationAgent } from '../agents/VerificationAgent';
import { DecisionAgent } from '../agents/DecisionAgent';
import { PublishingAgent } from '../agents/PublishingAgent';

import { TrafficAdapter } from '../adapters/TrafficAdapter';
import { WebcamAdapter } from '../adapters/WebcamAdapter';
import { WeatherAdapter } from '../adapters/WeatherAdapter';
import { SewerAdapter } from '../adapters/SewerAdapter';
import { WaterLevelAdapter } from '../adapters/WaterLevelAdapter';
import { SOURCE_CONFIG } from '../config/sources';

const BRICKELL_UNDERPASS: Location = { lat: 25.7602, lng: -80.1940, zoneId: 'zone-1' };

export class MockDataService {
  private static instance: MockDataService;
  
  public cameras: Camera[] = [];
  public sensors: SewerSensorReading[] = [];
  public zones: ZoneRisk[] = [];
  public incidents: FloodIncident[] = [];
  public alerts: CitizenAlert[] = [];
  public traffic: TrafficIncident[] = [];
  public weather: WeatherAlert | null = null;
  public evidence: ClaimEvidenceEvent[] = [];
  
  public isDemoMode: boolean = false;
  private demoTickCount: number = 0;
  
  // AI Agents
  private fusionAgent = new SensorFusionAgent();
  private verifAgent = new VerificationAgent();
  private decAgent = new DecisionAgent();
  private pubAgent = new PublishingAgent();

  // Adapters
  public trafficAdapter = new TrafficAdapter(SOURCE_CONFIG.traffic);
  public webcamAdapter = new WebcamAdapter(SOURCE_CONFIG.webcams);
  public weatherAdapter = new WeatherAdapter(SOURCE_CONFIG.weather);
  public sewerAdapter = new SewerAdapter(SOURCE_CONFIG.sewer);
  public waterAdapter = new WaterLevelAdapter(SOURCE_CONFIG.waterLevel);
  
  private constructor() {
    this.zones = [
      { id: 'zone-1', name: 'Downtown / Brickell', boundaries: [], riskScore: 0.1, riskLevel: 'SAFE', explanation: 'Conditions are nominal.', traces: [] },
      { id: 'zone-2', name: 'Miami Beach / Coastal', boundaries: [], riskScore: 0.05, riskLevel: 'SAFE', explanation: 'Tide levels and weather are normal.', traces: [] },
    ];
  }

  public static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  public setDemoMode(active: boolean) {
    this.isDemoMode = active;
    
    // Sync adapter modes
    const mode = active ? 'DEMO' : 'MOCK';
    this.trafficAdapter = new TrafficAdapter({ ...SOURCE_CONFIG.traffic, mode });
    this.webcamAdapter = new WebcamAdapter({ ...SOURCE_CONFIG.webcams, mode });
    this.weatherAdapter = new WeatherAdapter({ ...SOURCE_CONFIG.weather, mode });
    this.sewerAdapter = new SewerAdapter({ ...SOURCE_CONFIG.sewer, mode });
    
    if (active) {
      this.demoTickCount = 0;
      this.incidents = [];
      this.alerts = [];
      this.evidence = [];
    }
  }

  // --- ADAPTER PIPELINE ---
  private async ingestData() {
     const [trf, cams, wxArray, sews] = await Promise.all([
       this.trafficAdapter.fetchAndMap(this.demoTickCount),
       this.webcamAdapter.fetchAndMap(this.demoTickCount),
       this.weatherAdapter.fetchAndMap(this.demoTickCount),
       this.sewerAdapter.fetchAndMap(this.demoTickCount)
     ]);

     if (trf.length > 0) this.traffic = trf;
     if (cams.length > 0) this.cameras = cams;
     if (wxArray.length > 0) this.weather = wxArray[0]; else this.weather = null;
     if (sews.length > 0) this.sensors = sews;

     // Hardcode incident injection for the DEMO mode at T=4
     if (this.isDemoMode && this.demoTickCount === 4 && this.incidents.length === 0) {
        const incId = `inc-${Date.now()}`;
        this.incidents.push({
          id: incId,
          title: 'Possible Street Flooding on Brickell Underpass',
          description: 'Sewer flow rate spiking with corresponding localized traffic slowdown anomaly.',
          location: BRICKELL_UNDERPASS,
          severity: 'HIGH',
          status: 'UNVERIFIED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confidenceScore: 45,
          sources: [
            { type: 'WEATHER', id: 'wx-1', description: 'Rainfall 2.5 in/hr', confidence: 'MEDIUM' },
            { type: 'SENSOR', id: 'sen-b1', description: 'Backflow rising > 1.0 in/min', confidence: 'HIGH' },
            { type: 'TRAFFIC', id: 'trf-b1', description: 'Sudden congestion mapped', confidence: 'LOW' }
          ],
          recommendedActions: [],
          agentTraces: [],
          dispatches: []
        });
        this.evidence.push({
          id: `ev-t1`, incidentId: incId, timestamp: new Date().toISOString(), type: 'SENSOR_TELEMETRY', description: 'Initial backflow detected', data: { level: 3.5, riseRate: 1.2 }
        });
     }

     if (this.isDemoMode && this.demoTickCount === 7) {
        const inc = this.incidents.find(i => i.location.zoneId === 'zone-1' && i.status === 'UNVERIFIED');
        if (inc && !inc.sources.some(s => s.type === 'WEBCAM')) {
          inc.title = 'Severe Street Flooding Confirmed on Brickell underpass';
          inc.severity = 'CRITICAL';
          inc.sources.push({ type: 'WEBCAM', id: 'cam-b1', description: 'AI detected pooling water > 6 inches', confidence: 'HIGH' });
          this.evidence.push({
            id: `ev-t2`, incidentId: inc.id, timestamp: new Date().toISOString(), type: 'AI_DETECTION', description: 'Visual confirmation of deep water', data: { confidence: 92 }
          });
        }
     }
  }

  // --- AGENT PIPELINE ORCHESTRATION ---
  private runFusionPipeline() {
    for (const zone of this.zones) {
      const res = this.fusionAgent.evaluateZone(zone, this.weather, this.sensors, this.traffic, this.cameras);
      zone.riskScore = res.riskScore;
      zone.riskLevel = res.riskLevel;
      zone.explanation = res.explanation;
      
      if (!zone.traces) zone.traces = [];
      zone.traces.unshift(res.trace);
      if (zone.traces.length > 5) zone.traces.length = 5;
    }
  }

  private async runVerificationAndDecisionPipeline() {
    for (const incident of this.incidents) {
      if (incident.status === 'UNVERIFIED') {
        const verifRes = this.verifAgent.verifyIncident(incident);
        incident.agentTraces.push(verifRes.trace);

        if (verifRes.isVerified) {
          incident.status = 'VERIFIED';
          incident.confidenceScore = 95;
          incident.updatedAt = new Date().toISOString();
          
          this.evidence.push({
            id: `ev-${Date.now()}`, incidentId: incident.id, timestamp: new Date().toISOString(),
            type: 'VALIDATION_REPORT', description: 'Cross-source consensus achieved.', data: incident.sources
          });

          const decRes = await this.decAgent.generateActionPlan(incident);
          incident.recommendedActions = decRes.actions;
          incident.agentTraces.push(decRes.trace);

          const zoneInfo = this.zones.find(z => z.id === incident.location.zoneId);
          const pubRes = await this.pubAgent.publishIncident(incident, zoneInfo);
          this.alerts.push(...pubRes.newAlerts);
          this.evidence.push(...pubRes.newEvidence);
          incident.agentTraces.push(pubRes.trace);

          // Trigger Multi-Agency Dispatches
          this.triggerServiceDispatches(incident);
        }
      }
      
      // Progress active dispatches
      this.updateDispatches(incident);
    }
  }

  private triggerServiceDispatches(incident: FloodIncident) {
    if (incident.dispatches && incident.dispatches.length > 0) return;

    const services: Array<'911_POLICE' | '311_MUNICIPAL' | 'GOOGLE_MAPS' | 'POWER_UTILITY' | 'CELL_PROVIDERS' | 'INSURANCE'> = [
      '911_POLICE', '311_MUNICIPAL', 'GOOGLE_MAPS', 'POWER_UTILITY', 'CELL_PROVIDERS', 'INSURANCE'
    ];

    incident.dispatches = services.map(service => ({
      id: `ds-${service}-${Date.now()}`,
      serviceName: service,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: this.getDispatchMessage(service, incident)
    }));
  }

  private getDispatchMessage(service: string, incident: FloodIncident): string {
     switch(service) {
        case '911_POLICE': return `CRITICAL: Major flooding at Brickell. Dispatch units for road barricades.`;
        case '311_MUNICIPAL': return `Sewer backup confirmed. Dispatch WASD teams for clean-out.`;
        case 'GOOGLE_MAPS': return `PRIORITY: Reroute all traffic away from Brickell underpass.`;
        case 'POWER_UTILITY': return `Subsurface flooding detected. Assess transformers in zone ${incident.location.zoneId}.`;
        case 'CELL_PROVIDERS': return `Emergency Alert: Notify subscribers of active street flooding.`;
        case 'INSURANCE': return `Factual incident logged. Claims validation telemetry attached.`;
        default: return `Incident reported.`;
     }
  }

  private updateDispatches(incident: FloodIncident) {
    if (!incident.dispatches) return;
    
    incident.dispatches.forEach(d => {
      // Simulate random response delays
      if (d.status === 'SENT' && Math.random() > 0.7) {
        d.status = 'ACKNOWLEDGED';
        d.updatedAt = new Date().toISOString();
        d.responseMessage = `Received. Allocating resources.`;
      } else if (d.status === 'ACKNOWLEDGED' && Math.random() > 0.8) {
        d.status = 'ACTION_IN_PROGRESS';
        d.updatedAt = new Date().toISOString();
        d.actionTaken = this.getServiceAction(d.serviceName);
      }
    });
  }

  private getServiceAction(service: string): string {
     switch(service) {
        case '911_POLICE': return "Police units on site. Barricades deployed.";
        case '311_MUNICIPAL': return "Vacuum trucks clearing stormwater inlets.";
        case 'GOOGLE_MAPS': return "Traffic rerouted via 5th St.";
        case 'POWER_UTILITY': return "Transponders monitored. No faults reported.";
        case 'CELL_PROVIDERS': return "WEA broadcast to active subscribers.";
        case 'INSURANCE': return "Telemetry evidence locked for audit.";
        default: return "Assessment in progress.";
     }
  }

  // Orchestrator loop
  public async tick() {
    if (this.isDemoMode) {
      this.demoTickCount++;
    }

    // 1. Ingest from Adapters
    await this.ingestData();

    // 2. Synthesize with Agents
    this.runFusionPipeline();
    await this.runVerificationAndDecisionPipeline();
  }

  public getSnapshot() {
    return {
      cameras: this.cameras,
      sensors: this.sensors,
      zones: this.zones,
      incidents: this.incidents,
      alerts: this.alerts,
      traffic: this.traffic,
      evidence: this.evidence,
      weather: this.weather,
      isDemoMode: this.isDemoMode,
      demoTickCount: this.demoTickCount
    };
  }

  // Diagnostics Export
  public getAdapterDiagnostics() {
    return [
      this.trafficAdapter.getDiagnostics(),
      this.webcamAdapter.getDiagnostics(),
      this.weatherAdapter.getDiagnostics(),
      this.sewerAdapter.getDiagnostics(),
      this.waterAdapter.getDiagnostics()
    ];
  }
}

