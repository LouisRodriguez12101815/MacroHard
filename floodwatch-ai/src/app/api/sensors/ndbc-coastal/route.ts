import { NextResponse } from 'next/server';

const STATIONS = [
  { id: 'FWYF1', name: 'Fowey Rocks, FL', lat: 25.591, lng: -80.097 },
  { id: 'MLRF1', name: 'Molasses Reef, FL', lat: 25.012, lng: -80.376 },
  { id: 'LONF1', name: 'Long Key, FL', lat: 24.844, lng: -80.864 },
];

async function fetchStation(stationId: string) {
  try {
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length < 1) return null;
    const headers = lines[0].split(/\s+/);
    const values = lines[1]?.split(/\s+/);
    if (!values) return null;
    const data: Record<string, string> = {};
    headers.forEach((h, i) => { data[h] = values[i] || 'N/A'; });
    return data;
  } catch { return null; }
}

export async function GET() {
  const results = await Promise.all(STATIONS.map(async (s) => {
    const data = await fetchStation(s.id);
    return {
      stationId: s.id, name: s.name, lat: s.lat, lng: s.lng,
      windSpeed: data?.WSPD !== 'MM' ? data?.WSPD : null,
      windDir: data?.WDIR !== 'MM' ? data?.WDIR : null,
      gust: data?.GST !== 'MM' ? data?.GST : null,
      pressure: data?.PRES !== 'MM' ? data?.PRES : null,
      airTemp: data?.ATMP !== 'MM' ? data?.ATMP : null,
      waterTemp: data?.WTMP !== 'MM' ? data?.WTMP : null,
      waveHeight: data?.WVHT !== 'MM' ? data?.WVHT : null,
      status: data ? 'online' : 'offline',
    };
  }));

  const response = NextResponse.json({ source: 'NDBC Coastal C-MAN Stations', fetchedAt: new Date().toISOString(), stations: results });
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  return response;
}
