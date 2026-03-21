import { BaseAdapter } from './BaseAdapter';
import { Camera } from '../types/schemas';

export class WebcamAdapter extends BaseAdapter<Camera> {

  protected async fetchLive(): Promise<any> {
    // Target: Miami-Dade county CCTV RTSP frames parsed to object storage.
    throw new Error('Miami-Dade CCTV RTSP feeds not authorized. Cannot fetch live frames.');
  }

  protected fetchMock(): any {
    return [
      { cid: 'cam-b1', nm: 'Brickell Underpass (SE 10th)', clat: 25.7602, clng: -80.1940, zid: 'zone-1', stat: 'CLEAR', conf: 0 },
      { cid: 'cam-d1', nm: 'Biscayne Blvd', clat: 25.7617, clng: -80.1918, zid: 'zone-1', stat: 'CLEAR', conf: 0 },
      { cid: 'cam-mb1', nm: 'Alton Rd Coastal', clat: 25.7907, clng: -80.1300, zid: 'zone-2', stat: 'CLEAR', conf: 0 }
    ];
  }

  protected fetchDemo(tickCount: number): any {
    const base = this.fetchMock();
    if (tickCount >= 7) {
      base[0].stat = 'WATER_DETECTED';
      base[0].conf = 92;
    }
    return base;
  }

  protected normalize(rawPayload: any): any {
    if (!Array.isArray(rawPayload)) return [];
    return rawPayload;
  }

  protected mapToDomain(normalizedData: any[]): Camera[] {
    return normalizedData.map(d => ({
      id: d.cid,
      name: d.nm,
      location: { lat: d.clat, lng: d.clng, zoneId: d.zid },
      isOnline: true,
      aiAnalysisStatus: d.stat as 'CLEAR' | 'WATER_DETECTED' | 'FLOOD_DETECTED',
      waterConfidenceScore: d.conf
    }));
  }
}
