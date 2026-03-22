import { NextResponse } from 'next/server';

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const STATION_ID = '8723170';

async function fetchProduct(product: string) {
  try {
    const params = new URLSearchParams({
      date: 'latest', station: STATION_ID, product, datum: 'MLLW',
      units: 'english', time_zone: 'gmt', format: 'json', application: 'floodwatch_ai',
    });
    const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function GET() {
  const [waterLevel, wind] = await Promise.all([
    fetchProduct('water_level'),
    fetchProduct('wind'),
  ]);
  const wl = waterLevel?.data?.[0];
  const wi = wind?.data?.[0];

  const response = NextResponse.json({
    station: { id: STATION_ID, name: 'Miami Beach', lat: 25.7685, lng: -80.1317 },
    fetchedAt: new Date().toISOString(),
    waterLevel: wl ? { value: parseFloat(wl.v), unit: 'ft', timestamp: wl.t } : null,
    wind: wi ? { speed: parseFloat(wi.s), direction: parseFloat(wi.d), gusts: parseFloat(wi.g), timestamp: wi.t } : null,
  });
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}
