/**
 * API Route: /api/sensors/sewer
 *
 * Server-side proxy to the Miami-Dade WASD Sewer Pump Station GIS feed.
 * This avoids CORS restrictions since the fetch happens from the Next.js
 * server, not the browser.
 *
 * Returns the raw ArcGIS pJSON response with pump station basin data.
 */

import { NextResponse } from 'next/server';

const WASD_URL =
  'https://gisweb.miamidade.gov/arcgis/rest/services/' +
  'Wasd/WASDSewerPumpStationBasins_2_v1/MapServer/0/query' +
  '?where=1%3D1' +
  '&outFields=PS,BASINID,NAME,ADDRESS,DISTRICT,SSO,SSOHAMA,SSOHAMADTE,' +
  'MORATFLAG,MORATSTAT,MORATDATE,NAPOT,PROJNAPOT,GNRTRFLAG,' +
  'STATYPCODE,STACLSCODE,TLMFLAG,STACTGY' +
  '&returnGeometry=true' +
  '&outSR=4326' +
  '&f=pjson';

export async function GET() {
  try {
    // Node.js server-side fetch — no CORS restrictions
    const res = await fetch(WASD_URL, {
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `WASD GIS returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const features = data.features || [];

    return NextResponse.json({
      source: 'Miami-Dade WASD GIS',
      fetchedAt: new Date().toISOString(),
      count: features.length,
      features: features,
    });
  } catch (err) {
    console.error('[API /sensors/sewer] Fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch WASD sewer data', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
