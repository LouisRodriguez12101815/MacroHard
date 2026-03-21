/**
 * GET /api/fusion
 *
 * The FloodWatch Fusion Index — computes a 0-100 risk score for each
 * focal zone by fusing ALL live sensor readings into one number.
 *
 * Like FPL uses cameras + temperature + radar together to detect arcs,
 * we use: rain + tide + wind + pump status + sewer load + pressure
 * together to detect flooding risk before anyone calls 311.
 *
 * Weights are calibrated for South Florida flood risk:
 *   - Rain intensity: 30% (primary driver)
 *   - Pump capacity: 20% (drainage failure = flood)
 *   - Tide level: 15% (coastal compound flooding)
 *   - Wind speed: 10% (storm indicator + downed trees)
 *   - Sewer load: 15% (SSO overflows = road flooding)
 *   - Pressure drop: 10% (storm approach indicator)
 */

import { NextResponse } from 'next/server';

const BASE = 'http://localhost:3000';

interface ZoneScore {
  zone: string;
  name: string;
  score: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  color: string;
  breakdown: Record<string, { value: number; contribution: number; detail: string }>;
}

// Normalize a value to 0-1 scale given expected min/max for South Florida
function normalize(val: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function scoreToLevel(score: number): { level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'; color: string } {
  if (score >= 75) return { level: 'CRITICAL', color: '#EB001B' };  // Mastercard red
  if (score >= 50) return { level: 'HIGH', color: '#FF5F00' };      // Mastercard orange
  if (score >= 25) return { level: 'MODERATE', color: '#F79E1B' };   // Mastercard yellow
  return { level: 'LOW', color: '#10b981' };                         // Green
}

export async function GET() {
  try {
    // Fetch all sensors in parallel
    const [tides, rain, pumps, sewer, metar] = await Promise.all([
      fetch(`${BASE}/api/sensors/noaa-tides`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}/api/sensors/nexrad-rain`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}/api/sensors/miami-beach-pumps`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}/api/sensors/sewer`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}/api/sensors/metar`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // Extract global sensor values
    const waterLevel = tides?.waterLevel?.value ?? 0;         // ft MLLW
    const windSpeed = tides?.wind?.speed ?? 0;                // kts
    const windGusts = tides?.wind?.gusts ?? 0;                // kts
    const pressure = tides?.barometricPressure?.value ?? 1015; // mb

    const pumpsOffline = pumps?.offline ?? 0;
    const pumpsTotal = pumps?.total ?? 52;
    const pumpFailRate = pumpsTotal > 0 ? pumpsOffline / pumpsTotal : 0;

    const ssoCount = (sewer?.features || []).filter((f: any) => f.attributes?.SSO === 'Y').length;
    const moratCount = (sewer?.features || []).filter((f: any) => f.attributes?.MORATFLAG === 'Yes').length;
    const sewerStress = Math.min(1, (ssoCount * 0.15) + (moratCount * 0.003));

    // Rain per zone from NEXRAD
    const rainByArea: Record<string, number> = {};
    for (const a of (rain?.areas || [])) {
      if (!a.error) rainByArea[a.area] = a.avgPrecipitationMmHr;
    }

    // Compute score for each zone
    const zones: ZoneScore[] = [
      { zoneId: 'stiltsville', name: 'Stiltsville', rainKey: 'Key Biscayne', tideWeight: 0.25 },
      { zoneId: 'the-lab', name: 'The LAB Miami', rainKey: 'Wynwood / The LAB', tideWeight: 0.10 },
      { zoneId: 'olympia', name: 'Olympia Theater', rainKey: 'Downtown Miami', tideWeight: 0.15 },
      { zoneId: 'roberts', name: 'Robert Is Here', rainKey: 'Key Biscayne', tideWeight: 0.05 },
    ].map(z => {
      const zoneRain = rainByArea[z.rainKey] ?? 0;

      // Component scores (0-1)
      const rainScore = normalize(zoneRain, 0, 25);         // 25mm/hr = extreme
      const tideScore = normalize(waterLevel, 0, 3.5);      // 3.5ft = storm surge
      const windScore = normalize(windGusts, 0, 60);         // 60kts = hurricane force
      const pumpScore = pumpFailRate;                         // % offline
      const sewerScore = sewerStress;                         // SSO + moratorium combo
      const pressureScore = normalize(1015 - pressure, 0, 20); // 20mb drop = major storm

      // Weighted fusion (adjust tide weight per zone — Stiltsville cares more about tides)
      const baseTideWeight = 0.15;
      const adjustedTideWeight = z.tideWeight;
      const adjustedRainWeight = 0.30 + (baseTideWeight - adjustedTideWeight); // Redistribute

      const fusedScore = Math.round(
        (rainScore * adjustedRainWeight +
         pumpScore * 0.20 +
         tideScore * adjustedTideWeight +
         windScore * 0.10 +
         sewerScore * 0.15 +
         pressureScore * 0.10) * 100
      );

      const { level, color } = scoreToLevel(fusedScore);

      return {
        zone: z.zoneId,
        name: z.name,
        score: fusedScore,
        level,
        color,
        breakdown: {
          rain: { value: zoneRain, contribution: Math.round(rainScore * adjustedRainWeight * 100), detail: `${zoneRain.toFixed(1)} mm/hr` },
          pumps: { value: pumpFailRate * 100, contribution: Math.round(pumpScore * 0.20 * 100), detail: `${pumpsOffline}/${pumpsTotal} offline` },
          tide: { value: waterLevel, contribution: Math.round(tideScore * adjustedTideWeight * 100), detail: `${waterLevel.toFixed(2)} ft MLLW` },
          wind: { value: windGusts, contribution: Math.round(windScore * 0.10 * 100), detail: `${windGusts.toFixed(0)} kts gusts` },
          sewer: { value: sewerStress * 100, contribution: Math.round(sewerScore * 0.15 * 100), detail: `${ssoCount} SSOs, ${moratCount} moratoriums` },
          pressure: { value: pressure, contribution: Math.round(pressureScore * 0.10 * 100), detail: `${pressure.toFixed(1)} mb` },
        },
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      zones,
    });
  } catch (err) {
    console.error('[API /fusion] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
