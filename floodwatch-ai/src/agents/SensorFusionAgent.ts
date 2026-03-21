import { ZoneRisk, WeatherAlert, SewerSensorReading, TrafficIncident, Camera, AgentTrace } from '@/types/schemas';
import { VisionAgent } from './VisionAgent';

export class SensorFusionAgent {
  private visionAgent = new VisionAgent();

  public evaluateZone(
    zone: ZoneRisk,
    weather: WeatherAlert | null,
    sensors: SewerSensorReading[],
    traffic: TrafficIncident[],
    cameras: Camera[]
  ): { riskScore: number; riskLevel: 'SAFE'|'WARNING'|'DANGER'; explanation: string; trace: AgentTrace } {
    
    let score = 0;
    const reasons: string[] = [];
    const inputsUsed: string[] = [];

    // Weather
    if (weather) {
      inputsUsed.push(`Weather:${weather.type}`);
      if (weather.type === 'FLASH_FLOOD_WARNING') { score += 0.3; reasons.push('Active Flash Flood Warning active.'); }
      else if (weather.rainfallIntensityInchesPerHour > 2) { score += 0.2; reasons.push(`Heavy rainfall driving run-off.`); }
    }

    // Sewer
    const zoneSensors = sensors.filter(s => s.location.zoneId === zone.id);
    for (const sensor of zoneSensors) {
      inputsUsed.push(`Sensor:${sensor.sensorId}`);
      if (sensor.riseRateInchesPerMinute > 1) { score += 0.25; reasons.push('Rapid sewer backflow acceleration.'); }
      if (sensor.waterLevelInches > 6) { score += 0.2; reasons.push('Stormwater system capacity critical.'); }
    }

    // Traffic
    const zoneTraffic = traffic.filter(t => t.location.zoneId === zone.id);
    for (const trf of zoneTraffic) {
      inputsUsed.push(`Traffic:${trf.id}`);
      if (trf.speedMph < (trf.normalSpeedMph * 0.3)) { score += 0.15; reasons.push('Pervasive vehicular slowdown anomalies.'); }
    }

    // Vision (Delegated)
    const zoneCams = cameras.filter(c => c.location.zoneId === zone.id);
    for (const cam of zoneCams) {
      const visionRun = this.visionAgent.analyzeFrame(cam);
      if (visionRun.confidence > 75) {
        inputsUsed.push(`Vision:${cam.id}`);
        score += 0.3; reasons.push('Vision Agent confirmed deep standing water.');
      }
    }

    // Normalize
    score = Math.min(1.0, score);
    let riskLevel: 'SAFE'|'WARNING'|'DANGER' = 'SAFE';
    if (score >= 0.7) riskLevel = 'DANGER';
    else if (score >= 0.4) riskLevel = 'WARNING';

    const explanation = reasons.length > 0 ? `Risk elevated: ${reasons.join(' ')}` : 'All signals nominal.';

    const trace: AgentTrace = {
      id: `trace-fusion-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      agentName: 'SensorFusionAgent',
      timestamp: new Date().toISOString(),
      inputContext: `Merged vectors: [${inputsUsed.join(', ')}]`,
      outputSummary: `Computed Zone Risk: ${riskLevel} (${(score*100).toFixed(0)}%)`,
      reasoning: `Mathematically weighted signals across physical, meteorological, and computer vision arrays. ${explanation}`
    };

    return { riskScore: score, riskLevel, explanation, trace };
  }
}
