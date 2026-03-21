/**
 * API Route: /api/sensors/nexrad-rain
 *
 * Fetches real-time NEXRAD radar-derived precipitation from SFWMD.
 * Each 2km grid cell returns the most recent rainfall in mm/hr.
 *
 * Source: SFWMD Rainfall FeatureServer Layer 4 (NEXRAD Rain Grid)
 * Auth: None — public endpoint, no key required
 * Updates: Every ~5 minutes (radar refresh cycle)
 *
 * Queries three areas matching our focal points:
 *   - Downtown Miami / Olympia Theater
 *   - Wynwood / The LAB
 *   - Key Biscayne / Stiltsville approach
 */

import { NextResponse } from 'next/server';

const NEXRAD_URL =
  'https://geoweb.sfwmd.gov/agsext1/rest/services/SFWMD_Rainfall/SFWMD_Rainfall/FeatureServer/4/query';

interface RainQuery {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

const QUERY_POINTS: RainQuery[] = [
  { name: 'Downtown Miami', lat: 25.7748, lng: -80.1903, radiusMeters: 2000 },
  { name: 'Wynwood / The LAB', lat: 25.8010, lng: -80.1990, radiusMeters: 2000 },
  { name: 'Key Biscayne', lat: 25.6900, lng: -80.1600, radiusMeters: 3000 },
];

async function fetchRainForPoint(q: RainQuery) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'HYDROID,EXPERT',
    geometry: `${q.lng},${q.lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: q.radiusMeters.toString(),
    units: 'esriSRUnit_Meter',
    f: 'json',
  });

  try {
    const res = await fetch(`${NEXRAD_URL}?${params}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return { area: q.name, error: `HTTP ${res.status}`, cells: [] };

    const data = await res.json();
    const features = data.features || [];

    const cells = features.map((f: any) => ({
      hydroId: f.attributes?.HYDROID,
      precipitationMmHr: f.attributes?.EXPERT ?? 0,
    }));

    // Average precipitation across all cells in the radius
    const avgPrecip = cells.length > 0
      ? cells.reduce((sum: number, c: any) => sum + c.precipitationMmHr, 0) / cells.length
      : 0;

    return {
      area: q.name,
      lat: q.lat,
      lng: q.lng,
      cellCount: cells.length,
      avgPrecipitationMmHr: Math.round(avgPrecip * 100) / 100,
      maxPrecipitationMmHr: cells.length > 0
        ? Math.max(...cells.map((c: any) => c.precipitationMmHr))
        : 0,
      intensity: getIntensity(avgPrecip),
    };
  } catch (err) {
    return { area: q.name, error: (err as Error).message, cells: [] };
  }
}

function getIntensity(mmHr: number): string {
  if (mmHr === 0) return 'None';
  if (mmHr < 2.5) return 'Light';
  if (mmHr < 7.5) return 'Moderate';
  if (mmHr < 50) return 'Heavy';
  return 'Extreme';
}

export async function GET() {
  try {
    const results = await Promise.all(QUERY_POINTS.map(fetchRainForPoint));

    return NextResponse.json({
      source: 'SFWMD NEXRAD Rain Grid (2km resolution)',
      fetchedAt: new Date().toISOString(),
      areas: results,
    });
  } catch (err) {
    console.error('[API /sensors/nexrad-rain] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch NEXRAD rain data', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
