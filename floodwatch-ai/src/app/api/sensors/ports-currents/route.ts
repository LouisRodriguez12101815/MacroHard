import { NextResponse } from 'next/server';

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const STATIONS = [
  { id: 'mi0101', name: 'Miami LB M', lat: 25.7685, lng: -80.0834 },
  { id: 'mi0201', name: 'Miami LB1', lat: 25.7629, lng: -80.0913 },
  { id: 'mi0301', name: 'Miami LB3', lat: 25.7613, lng: -80.0970 },
];

async function fetchCurrents(stationId: string) {
  try {
    const params = new URLSearchParams({
      date: 'latest', station: stationId, product: 'currents',
      units: 'english', time_zone: 'gmt', format: 'json', application: 'floodwatch_ai',
    });
    const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] || null;
  } catch { return null; }
}

export async function GET() {
  const results = await Promise.all(STATIONS.map(async (s) => {
    const d = await fetchCurrents(s.id);
    return {
      stationId: s.id, name: s.name, lat: s.lat, lng: s.lng,
      speed: d?.s ? parseFloat(d.s) : null,
      direction: d?.d ? parseFloat(d.d) : null,
      timestamp: d?.t || null,
      status: d ? 'online' : 'offline',
    };
  }));

  const response = NextResponse.json({ source: 'NOAA PORTS Miami Current Meters', fetchedAt: new Date().toISOString(), stations: results });
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}
