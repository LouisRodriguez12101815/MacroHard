/**
 * API Route: /api/sensors/air-quality
 *
 * Fetches real-time Air Quality Index (AQI) and pollutant concentrations
 * from the World Air Quality Index (WAQI) project.
 *
 * Station: Miami Fire Station #5 (sensor ID 6298)
 * Location: ~25.78°N, -80.19°W (central Miami)
 * Updates: Every ~5 minutes
 *
 * Requires WAQI_API_TOKEN in .env.local
 * Get a free token at: https://aqicn.org/data-platform/token/
 */

import { NextResponse } from 'next/server';

const WAQI_STATION_ID = '6298';
const WAQI_TOKEN = process.env.WAQI_API_TOKEN || '';

export async function GET() {
  if (!WAQI_TOKEN) {
    return NextResponse.json(
      {
        error: 'WAQI_API_TOKEN not configured',
        help: 'Get a free token at https://aqicn.org/data-platform/token/ and add WAQI_API_TOKEN to .env.local',
      },
      { status: 503 }
    );
  }

  try {
    const url = `https://api.waqi.info/feed/@${WAQI_STATION_ID}/?token=${WAQI_TOKEN}`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `WAQI API returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();

    if (json.status !== 'ok') {
      return NextResponse.json(
        { error: 'WAQI API error', detail: json.data },
        { status: 502 }
      );
    }

    const d = json.data;
    const iaqi = d.iaqi || {};

    return NextResponse.json({
      station: {
        id: `waqi-${WAQI_STATION_ID}`,
        name: d.city?.name || 'Miami Fire Station #5',
        lat: 25.78,
        lng: -80.19,
      },
      fetchedAt: new Date().toISOString(),
      aqi: {
        value: d.aqi,
        level: getAqiLevel(d.aqi),
        timestamp: d.time?.s,
        timezone: d.time?.tz,
      },
      pollutants: {
        pm25: iaqi.pm25?.v ?? null,
        pm10: iaqi.pm10?.v ?? null,
        o3: iaqi.o3?.v ?? null,
        no2: iaqi.no2?.v ?? null,
        co: iaqi.co?.v ?? null,
        so2: iaqi.so2?.v ?? null,
      },
    });
  } catch (err) {
    console.error('[API /sensors/air-quality] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch WAQI data', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

function getAqiLevel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}
