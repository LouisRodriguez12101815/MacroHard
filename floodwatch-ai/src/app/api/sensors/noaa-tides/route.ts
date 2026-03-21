/**
 * API Route: /api/sensors/noaa-tides
 *
 * Fetches real-time data from NOAA Tides & Currents for Virginia Key (8723214),
 * the closest station to Stiltsville in Biscayne Bay.
 *
 * Returns: water level, wind speed/direction, air temp, water temp, barometric pressure.
 */

import { NextResponse } from 'next/server';

const STATION_ID = '8723214'; // Virginia Key, Biscayne Bay
const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

// Fetch a single NOAA product
async function fetchProduct(product: string): Promise<any> {
  const params = new URLSearchParams({
    date: 'latest',
    station: STATION_ID,
    product,
    datum: 'MLLW',
    units: 'english',
    time_zone: 'gmt',
    format: 'json',
    application: 'floodwatch_ai',
  });

  const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  try {
    // Fetch all products in parallel
    const [waterLevel, wind, airTemp, waterTemp, pressure, predictions] = await Promise.all([
      fetchProduct('water_level'),
      fetchProduct('wind'),
      fetchProduct('air_temperature'),
      fetchProduct('water_temperature'),
      fetchProduct('air_pressure'),
      fetchProduct('predictions'),
    ]);

    // Extract latest readings
    const wl = waterLevel?.data?.[0];
    const wi = wind?.data?.[0];
    const at = airTemp?.data?.[0];
    const wt = waterTemp?.data?.[0];
    const pr = pressure?.data?.[0];
    const pred = predictions?.predictions?.[0];

    return NextResponse.json({
      station: {
        id: STATION_ID,
        name: 'Virginia Key, Biscayne Bay',
        lat: 25.7314,
        lng: -80.1618,
      },
      fetchedAt: new Date().toISOString(),
      waterLevel: wl ? {
        value: parseFloat(wl.v),
        unit: 'ft',
        timestamp: wl.t,
        quality: wl.q,
        datum: 'MLLW',
      } : null,
      wind: wi ? {
        speed: parseFloat(wi.s),
        direction: parseFloat(wi.d),
        directionCardinal: wi.dr,
        gusts: parseFloat(wi.g),
        unit: 'knots',
        timestamp: wi.t,
      } : null,
      airTemp: at ? {
        value: parseFloat(at.v),
        unit: '°F',
        timestamp: at.t,
      } : null,
      waterTemp: wt ? {
        value: parseFloat(wt.v),
        unit: '°F',
        timestamp: wt.t,
      } : null,
      barometricPressure: pr ? {
        value: parseFloat(pr.v),
        unit: 'mb',
        timestamp: pr.t,
      } : null,
      tidePrediction: pred ? {
        value: parseFloat(pred.v),
        timestamp: pred.t,
        type: 'predicted',
      } : null,
    });
  } catch (err) {
    console.error('[API /sensors/noaa-tides] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch NOAA data', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
