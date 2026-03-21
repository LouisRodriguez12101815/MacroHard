/**
 * POST /api/vehicle/route-advisory
 *
 * Takes origin/destination coordinates and returns a hazard-aware
 * route advisory powered by live sensor data + Gemini analysis.
 *
 * Designed for Automotive Grade Linux (AGL) integration — the response
 * format is structured for vehicle head unit consumption.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function gatherHazards(origin: string): Promise<string[]> {
  const hazards: string[] = [];

  try {
    const res = await fetch(`${origin}/api/sensors/nexrad-rain`);
    if (res.ok) {
      const d = await res.json();
      for (const a of (d.areas || [])) {
        if (a.avgPrecipitationMmHr > 2.5) {
          hazards.push(`HEAVY_RAIN: ${a.area} — ${a.avgPrecipitationMmHr} mm/hr (${a.intensity})`);
        }
      }
    }
  } catch {}

  try {
    const res = await fetch(`${origin}/api/sensors/noaa-tides`);
    if (res.ok) {
      const d = await res.json();
      if (d.waterLevel?.value > 1.5) {
        hazards.push(`HIGH_TIDE: Virginia Key — ${d.waterLevel.value} ft above MLLW`);
      }
      if (d.wind?.gusts > 20) {
        hazards.push(`HIGH_WIND: ${d.wind.gusts} kt gusts from ${d.wind.directionCardinal}`);
      }
    }
  } catch {}

  try {
    const res = await fetch(`${origin}/api/sensors/miami-beach-pumps`);
    if (res.ok) {
      const d = await res.json();
      if (d.offline > 3) {
        hazards.push(`PUMP_OFFLINE: ${d.offline} of ${d.total} Miami Beach stormwater pumps offline — surface flooding risk`);
      }
    }
  } catch {}

  try {
    const res = await fetch(`${origin}/api/sensors/sewer`);
    if (res.ok) {
      const d = await res.json();
      const ssoCount = (d.features || []).filter((f: any) => f.attributes?.SSO === 'Y').length;
      if (ssoCount > 0) {
        hazards.push(`SEWER_OVERFLOW: ${ssoCount} active SSO events in Miami-Dade — road contamination risk`);
      }
    }
  } catch {}

  return hazards;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination } = body;

    const { origin: hostOrigin } = new URL(req.url);
    const hazards = await gatherHazards(hostOrigin);
    const hazardSummary = hazards.length > 0 ? hazards.join('\n') : 'No active hazards detected.';

    // AGL-formatted response
    const aglResponse: any = {
      protocol: 'AGL-FloodWatch-v1',
      timestamp: new Date().toISOString(),
      origin: origin || 'Current Location',
      destination: destination || 'Not specified',
      hazardCount: hazards.length,
      hazards: hazards.map(h => {
        const [type, ...desc] = h.split(': ');
        return { type, description: desc.join(': '), severity: type.includes('OVERFLOW') || type.includes('HEAVY_RAIN') ? 'HIGH' : 'MODERATE' };
      }),
      routeStatus: hazards.length === 0 ? 'CLEAR' : hazards.length <= 2 ? 'CAUTION' : 'REROUTE_RECOMMENDED',
    };

    // Gemini advisory
    if (GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      const prompt = [
        'You are a vehicle navigation safety AI for the FloodWatch system in Miami-Dade County.',
        `A driver is traveling from "${origin || 'downtown Miami'}" to "${destination || 'Key Biscayne'}".`,
        '',
        'Current hazards detected by live sensors:',
        hazardSummary,
        '',
        'Provide a 2-3 sentence driving advisory. Be specific about:',
        '- Which roads to avoid (use real Miami street names)',
        '- Alternative routes if needed',
        '- Speed recommendations',
        'Keep it concise — this will be read aloud by the vehicle system.',
      ].join('\n');

      const result = await model.generateContent(prompt);
      aglResponse.voiceAdvisory = result.response.text().trim();
    } else {
      aglResponse.voiceAdvisory = hazards.length > 0
        ? `Caution: ${hazards.length} hazard${hazards.length > 1 ? 's' : ''} detected along your route. Reduce speed and avoid low-lying areas. Consider an alternate route.`
        : 'Route is clear. No active flood hazards detected. Drive safely.';
    }

    return NextResponse.json(aglResponse);
  } catch (err) {
    console.error('[API /vehicle/route-advisory] Error:', err);
    return NextResponse.json(
      { error: 'Route advisory failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
