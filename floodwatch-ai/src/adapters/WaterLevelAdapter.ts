import { BaseAdapter } from './BaseAdapter';
import { Location } from '../types/schemas';

// Note: Using a generic mock water level interface since we reuse sewer mostly for the map
// but this adapter represents NOAA tide gauges if enabled.
export interface CoastalWaterLevel {
  stationId: string;
  location: Location;
  tideLevelFeet: number;
  surgeAnomalyFeet: number;
}

export class WaterLevelAdapter extends BaseAdapter<CoastalWaterLevel> {

  protected async fetchLive(): Promise<any> {
    throw new Error('USGS / NOAA Water API keys missing. Fallback initialized.');
  }

  protected fetchMock(): any {
    return [
      { sid: 'usgs-b1', clat: 25.7602, clng: -80.1940, zid: 'zone-1', t: 1.2, sa: 0.1 },
      { sid: 'noaa-mb1', clat: 25.7907, clng: -80.1300, zid: 'zone-2', t: 3.1, sa: 0.2 }
    ];
  }

  protected fetchDemo(tickCount: number): any {
    return this.fetchMock(); 
  }

  protected normalize(rawPayload: any): any {
    if (!Array.isArray(rawPayload)) return [];
    return rawPayload;
  }

  protected mapToDomain(normalizedData: any[]): CoastalWaterLevel[] {
    return normalizedData.map(d => ({
      stationId: d.sid,
      location: { lat: d.clat, lng: d.clng, zoneId: d.zid },
      tideLevelFeet: d.t,
      surgeAnomalyFeet: d.sa
    }));
  }
}
