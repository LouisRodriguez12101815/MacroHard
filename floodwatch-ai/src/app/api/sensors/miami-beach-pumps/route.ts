/**
 * API Route: /api/sensors/miami-beach-pumps
 *
 * Fetches live stormwater pump station status from Miami Beach's public GIS.
 * Shows which pumps are online/offline — critical for predicting surface flooding.
 *
 * Source: Miami Beach GIS — cw_PumpStationN MapServer Layer 1
 * Fields: facilityid, location, kw (kilowatt rating), status_1 (Yes = online)
 * Auth: None — public endpoint
 */

import { NextResponse } from 'next/server';

const PUMP_URL =
  'https://gis.miamibeachfl.gov/servicespublic/rest/services/Public/cw_PumpStationN/MapServer/1/query';

export async function GET() {
  try {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'facilityid,location,kw,status_1',
      outSR: '4326',
      returnGeometry: 'true',
      f: 'json',
    });

    const res = await fetch(`${PUMP_URL}?${params}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Miami Beach GIS returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const features = data.features || [];

    const pumps = features.map((f: any) => {
      const a = f.attributes || {};
      const g = f.geometry || {};
      return {
        facilityId: a.facilityid,
        location: a.location,
        kilowatts: a.kw,
        isOnline: a.status_1 === 'Yes',
        status: a.status_1,
        lat: g.y ?? null,
        lng: g.x ?? null,
      };
    });

    const onlineCount = pumps.filter((p: any) => p.isOnline).length;
    const offlineCount = pumps.filter((p: any) => !p.isOnline).length;

    const response = NextResponse.json({
      source: 'Miami Beach GIS — Stormwater Pump Stations',
      fetchedAt: new Date().toISOString(),
      total: pumps.length,
      online: onlineCount,
      offline: offlineCount,
      pumps,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (err) {
    console.error('[API /sensors/miami-beach-pumps] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Miami Beach pump data', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
