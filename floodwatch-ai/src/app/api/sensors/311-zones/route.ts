/**
 * API Route: /api/sensors/311-zones
 *
 * Fetches Storm Surge Zones (Layer 11) and Flood Zones (Layer 12)
 * from Miami-Dade 311 CRM Display MapServer.
 *
 * Public ArcGIS endpoint — no auth required.
 * Filtered to the Stiltsville / Key Biscayne bounding box.
 */

import { NextResponse } from 'next/server';

const BASE = 'https://giswspro.miamidade.gov/ArcGIS/rest/services/311/311CRM_Display/MapServer';

// Bounding box covering Key Biscayne + Stiltsville + Virginia Key
// Using WGS84 (outSR=4326) so we get lat/lng back
const BBOX = '-80.20,25.58,-80.08,25.75';

async function fetchLayer(layerId: number, layerName: string) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    geometry: BBOX,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'true',
    f: 'pjson',
  });

  try {
    const res = await fetch(`${BASE}/${layerId}/query?${params}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour — these boundaries rarely change
    });

    if (!res.ok) return { layer: layerName, error: `HTTP ${res.status}`, features: [] };

    const data = await res.json();
    return {
      layer: layerName,
      layerId,
      count: data.features?.length || 0,
      features: data.features || [],
    };
  } catch (err) {
    return { layer: layerName, error: (err as Error).message, features: [] };
  }
}

export async function GET() {
  try {
    const [stormSurge, floodZone] = await Promise.all([
      fetchLayer(11, 'Storm Surge Zone'),
      fetchLayer(12, 'Flood Zone'),
    ]);

    const response = NextResponse.json({
      source: 'Miami-Dade 311 CRM Display MapServer',
      fetchedAt: new Date().toISOString(),
      bbox: BBOX,
      stormSurge,
      floodZone,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    return response;
  } catch (err) {
    console.error('[API /sensors/311-zones] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch 311 zone data', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
