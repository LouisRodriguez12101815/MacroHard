import { BaseAdapter } from './BaseAdapter';
import { TrafficIncident } from '../types/schemas';

export class TrafficAdapter extends BaseAdapter<TrafficIncident> {
  
  // Base State for Fluctuations
  private currentSpeeds: Record<string, number> = {
    'trf-b1': 25,
    'trf-mb1': 35
  };

  protected async fetchLive(): Promise<any> {
    // Requires an API Key for FDOT. Returning mock structure to prevent crush.
    // In production: return await fetch(this.config.targetApiUrl).then(r => r.json());
    throw new Error('FDOT SunGuide API keys not configured. Falling back.');
  }

  protected fetchMock(): any {
    // Generate realistic fluctuating speeds based on Gaussians
    this.currentSpeeds['trf-b1'] = Math.max(5, Math.min(30, this.currentSpeeds['trf-b1'] + (Math.random() - 0.4) * 2));
    this.currentSpeeds['trf-mb1'] = Math.max(15, Math.min(45, this.currentSpeeds['trf-mb1'] + (Math.random() - 0.5) * 3));

    return [
      { id: 'trf-b1', loc: { lat: 25.7602, lng: -80.1940, zoneId: 'zone-1' }, spd: this.currentSpeeds['trf-b1'], n_spd: 25 },
      { id: 'trf-mb1', loc: { lat: 25.7907, lng: -80.1300, zoneId: 'zone-2' }, spd: this.currentSpeeds['trf-mb1'], n_spd: 45 }
    ];
  }

  protected fetchDemo(tickCount: number): any {
    let speed = 25;
    let desc = 'Flowing normally.';
    
    if (tickCount >= 4) {
      speed = 10;
      desc = 'Speeds dropped 60% below normal avg.';
    }
    if (tickCount >= 7) {
      speed = 0;
      desc = 'Complete standstill.';
    }

    return [{ id: 'trf-b1', loc: { lat: 25.7602, lng: -80.1940, zoneId: 'zone-1' }, spd: speed, n_spd: 25, d: desc }];
  }

  protected normalize(rawPayload: any): any {
    // Ensures whatever structure comes out of Live/Mock/Demo is uniformly formatted
    if (!Array.isArray(rawPayload)) return [];
    return rawPayload.map(r => ({
      _id: r.id || 'unknown',
      _loc: r.loc,
      _spd: Math.round(r.spd),
      _nspd: r.n_spd,
      _desc: r.d || 'Traffic telemetry processed.'
    }));
  }

  protected mapToDomain(normalizedData: any[]): TrafficIncident[] {
    return normalizedData.map(d => {
      const isAnomalous = d._spd < (d._nspd * 0.5);
      return {
        id: d._id,
        location: d._loc,
        type: isAnomalous ? 'CONGESTION' : 'CONGESTION',
        speedMph: d._spd,
        normalSpeedMph: d._nspd,
        description: d._desc
      };
    });
  }
}
