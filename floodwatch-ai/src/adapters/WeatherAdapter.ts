import { BaseAdapter } from './BaseAdapter';
import { WeatherAlert } from '../types/schemas';

export class WeatherAdapter extends BaseAdapter<WeatherAlert | null> {

  protected async fetchLive(): Promise<any> {
    try {
       // Target FLZ074 (Miami-Dade / Coastal)
       const res = await fetch('https://api.weather.gov/alerts/active/zone/FLZ074');
       if (!res.ok) throw new Error('NWS API restricted or rate limit hit.');
       const data = await res.json();
       return data;
    } catch(err) {
       throw err;
    }
  }

  protected fetchMock(): any {
    // Fluctuate randomly simulating a clear day
    return null;
  }

  protected fetchDemo(tickCount: number): any {
    if (tickCount >= 2 && tickCount < 4) {
      return { id: 'wx-demo-1', event: 'Heavy Rain', desc: 'Approaching storm cell over Downtown.', severity: 'Watch' };
    }
    if (tickCount >= 4) {
      return { id: 'wx-demo-2', event: 'Flash Flood Watch', desc: 'Torrential downpour over Brickell.', severity: 'Warning' };
    }
    return null;
  }

  protected normalize(rawPayload: any): any {
    if (!rawPayload) return null;

    // Is Live NWS GeoJSON?
    if (rawPayload.type === 'FeatureCollection' && rawPayload.features?.length > 0) {
       const alert = rawPayload.features[0].properties;
       return {
         _id: alert.id,
         _type: alert.event, // e.g. "Flood Warning"
         _desc: alert.description || alert.headline,
       };
    }
    // Is Demo/Mock?
    else if (rawPayload.id) {
       return {
         _id: rawPayload.id,
         _type: rawPayload.event,
         _desc: rawPayload.desc
       };
    }

    return null;
  }

  protected mapToDomain(normalizedData: any): (WeatherAlert | null)[] {
    if (!normalizedData) return [null];
    
    let mappedType: 'HEAVY_RAIN' | 'FLASH_FLOOD_WATCH' | 'FLASH_FLOOD_WARNING' = 'HEAVY_RAIN';
    let int = 0.5;

    const eventDesc = (normalizedData._type || '').toUpperCase();
    if (eventDesc.includes('FLASH FLOOD WATCH')) { mappedType = 'FLASH_FLOOD_WATCH'; int = 2.0; }
    if (eventDesc.includes('FLASH FLOOD WARNING')) { mappedType = 'FLASH_FLOOD_WARNING'; int = 3.5; }
    
    return [{
      id: normalizedData._id,
      type: mappedType,
      rainfallIntensityInchesPerHour: int,
      description: normalizedData._desc
    }];
  }
}
