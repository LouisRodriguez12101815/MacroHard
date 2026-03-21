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
    // Fetch live data from Miami-Dade WASD GIS via our server-side proxy
    // (avoids CORS — the proxy route is at /api/sensors/sewer)
    const baseUrl = typeof window !== 'undefined'
      ? '' // Client-side: relative URL
      : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');

    const res = await fetch(`${baseUrl}/api/sensors/sewer`);
    if (!res.ok) throw new Error(`WASD proxy returned ${res.status}`);

    const json = await res.json();
    const features = json.features || [];

    // Transform ArcGIS features into the format our normalize() expects
    return features
      .filter((f: any) => f.attributes && f.geometry)
      .slice(0, 50) // Limit to 50 nearest for performance
      .map((f: any) => {
        const a = f.attributes;
        const g = f.geometry;
        // ArcGIS point geometry — rings for polygons, x/y for points
        const lat = g.y ?? (g.rings?.[0]?.[0]?.[1]) ?? 25.76;
        const lng = g.x ?? (g.rings?.[0]?.[0]?.[0]) ?? -80.19;

        return {
          id: `wasd-${a.BASINID || a.PS}`,
          loc: { lat, lng, zoneId: 'zone-1' },
          ts: new Date().toISOString(),
          lvl: a.NAPOT ?? 0,       // Use NAPOT as a proxy for system stress
          flow: a.PROJNAPOT ?? 0,
          // Preserve raw WASD fields for enrichment
          _raw: {
            ps: a.PS,
            basinId: a.BASINID,
            address: a.ADDRESS,
            district: a.DISTRICT,
            sso: a.SSO,
            moratFlag: a.MORATFLAG,
            napot: a.NAPOT,
            projNapot: a.PROJNAPOT,
            generator: a.GNRTRFLAG,
          },
        };
      });
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
