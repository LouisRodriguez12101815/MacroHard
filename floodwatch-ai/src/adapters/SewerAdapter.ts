import { BaseAdapter } from './BaseAdapter';
import { SewerSensorReading } from '../types/schemas';

export class SewerAdapter extends BaseAdapter<SewerSensorReading> {
  // Base State for Fluctuations
  private currentLevels: Record<string, number> = {
    'sen-b1': 0,
    'sen-mb1': 1
  };
  private previousLevels: Record<string, number> = {
    'sen-b1': 0,
    'sen-mb1': 1
  };

  protected async fetchLive(): Promise<any> {
    // There are rarely public APIs for municipal telemetry.
    throw new Error('Sewer Telemetry API restricted to AirGapped Internal Network (SCADA-CORE).');
  }

  protected fetchMock(): any {
    const timestamp = new Date().toISOString();
    
    // Gaussian mock step
    for (const key of ['sen-b1', 'sen-mb1']) {
       this.previousLevels[key] = this.currentLevels[key];
       const drift = (Math.random() - 0.5) * 0.2;
       this.currentLevels[key] = Math.max(0, this.currentLevels[key] + drift);
    }

    return [
      { id: 'sen-b1', loc: { lat: 25.7602, lng: -80.1940, zoneId: 'zone-1' }, ts: timestamp, lvl: this.currentLevels['sen-b1'], flow: 100 },
      { id: 'sen-mb1', loc: { lat: 25.7907, lng: -80.1300, zoneId: 'zone-2' }, ts: timestamp, lvl: this.currentLevels['sen-mb1'], flow: 110 }
    ];
  }

  protected fetchDemo(tickCount: number): any {
    const ts = new Date().toISOString();
    let lvl = 0;
    
    if (tickCount >= 4) {
      lvl = 3.5;
      this.currentLevels['sen-b1'] = lvl;
      this.previousLevels['sen-b1'] = 0; // Create massive rise rate
    }
    if (tickCount >= 7) {
      this.previousLevels['sen-b1'] = this.currentLevels['sen-b1'];
      lvl = 8.5;
      this.currentLevels['sen-b1'] = lvl;
    }

    return [
       { id: 'sen-b1', loc: { lat: 25.7602, lng: -80.1940, zoneId: 'zone-1' }, ts: ts, lvl: lvl, flow: tickCount >= 4 ? 300 : 100 },
       { id: 'sen-mb1', loc: { lat: 25.7907, lng: -80.1300, zoneId: 'zone-2' }, ts: ts, lvl: 1, flow: 110 }
    ];
  }

  protected normalize(rawPayload: any): any {
    if (!Array.isArray(rawPayload)) return [];
    return rawPayload.map(r => {
      // Calculate realistic rise rate locally before domain mapping
      const riseRate = Math.max(0, r.lvl - (this.previousLevels[r.id] || 0));
      return { _id: r.id, _loc: r.loc, _ts: r.ts, _lvl: r.lvl, _rr: riseRate, _flow: r.flow };
    });
  }

  protected mapToDomain(normalizedData: any[]): SewerSensorReading[] {
    return normalizedData.map(d => ({
      sensorId: d._id,
      location: d._loc,
      timestamp: d._ts,
      waterLevelInches: d._lvl,
      riseRateInchesPerMinute: d._rr,
      flowRateGPM: d._flow
    }));
  }
}
