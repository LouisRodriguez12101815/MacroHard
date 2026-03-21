import { NextResponse } from 'next/server';

const STATIONS = ['KMIA', 'KOPF', 'KHWO']; // Miami Intl, Opa-Locka, North Perry

export async function GET() {
  const results = await Promise.all(STATIONS.map(async (id) => {
    try {
      const res = await fetch(
        `https://aviationweather.gov/api/data/metar?ids=${id}&format=json`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) return { stationId: id, status: 'offline' };
      const data = await res.json();
      const obs = data?.[0];
      if (!obs) return { stationId: id, status: 'no-data' };
      return {
        stationId: id,
        name: obs.name || id,
        lat: obs.lat, lng: obs.lon,
        rawObs: obs.rawOb,
        temp: obs.temp, dewpoint: obs.dewp,
        windDir: obs.wdir, windSpeed: obs.wspd, windGust: obs.wgst,
        visibility: obs.visib, altimeter: obs.altim,
        clouds: obs.clouds?.map((c: any) => `${c.cover} ${c.base}ft`).join(', '),
        obsTime: obs.reportTime,
        status: 'online',
      };
    } catch { return { stationId: id, status: 'offline' }; }
  }));

  return NextResponse.json({ source: 'Aviation Weather METAR', fetchedAt: new Date().toISOString(), stations: results });
}
