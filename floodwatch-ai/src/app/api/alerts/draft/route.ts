/**
 * POST /api/alerts/draft
 *
 * Pulls current live sensor readings, sends them to Gemini,
 * and returns a drafted citizen alert message.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function fetchSensorSummary(origin: string): Promise<string> {
  const lines: string[] = [];

  try {
    const res = await fetch(`${origin}/api/sensors/noaa-tides`);
    if (res.ok) {
      const d = await res.json();
      if (d.waterLevel) lines.push(`NOAA Virginia Key: Water level ${d.waterLevel.value} ft`);
      if (d.wind) lines.push(`Wind: ${d.wind.speed} kts ${d.wind.directionCardinal}, gusts ${d.wind.gusts} kts`);
    }
  } catch { /* skip */ }

  try {
    const res = await fetch(`${origin}/api/sensors/air-quality`);
    if (res.ok) {
      const d = await res.json();
      if (d.aqi) lines.push(`Air Quality: AQI ${d.aqi.value} (${d.aqi.level})`);
    }
  } catch { /* skip */ }

  try {
    const res = await fetch(`${origin}/api/sensors/nexrad-rain`);
    if (res.ok) {
      const d = await res.json();
      for (const a of (d.areas || [])) {
        if (!a.error) lines.push(`NEXRAD Rain ${a.area}: ${a.avgPrecipitationMmHr} mm/hr (${a.intensity})`);
      }
    }
  } catch { /* skip */ }

  try {
    const res = await fetch(`${origin}/api/sensors/miami-beach-pumps`);
    if (res.ok) {
      const d = await res.json();
      lines.push(`Miami Beach Pumps: ${d.online} online, ${d.offline} offline of ${d.total}`);
    }
  } catch { /* skip */ }

  return lines.length > 0 ? lines.join('\n') : 'No live sensor data available at this time.';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { zone, severity } = body;

    const { origin } = new URL(req.url);
    const sensorSummary = await fetchSensorSummary(origin);

    if (!GEMINI_API_KEY) {
      // Fallback without Gemini
      return NextResponse.json({
        draft: `FLOOD ALERT — ${zone || 'Miami-Dade County'}: Current sensor readings indicate ${severity || 'elevated'} conditions. Residents should exercise caution near low-lying areas and avoid driving through standing water. Monitor local news for updates.`,
        sensorContext: sensorSummary,
        model: 'fallback',
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = [
      'You are the emergency communications AI for Miami-Dade County FloodWatch system.',
      'Draft a citizen emergency alert based on the following live sensor readings.',
      '',
      `Zone: ${zone || 'Miami-Dade County'}`,
      `Severity: ${severity || 'Moderate'}`,
      '',
      'Current sensor readings:',
      sensorSummary,
      '',
      'Write a 3-4 sentence alert that is:',
      '- Urgent but calm in tone',
      '- Specific about what areas are affected',
      '- Clear about what actions citizens should take',
      '- References the actual sensor data where relevant',
      'Do NOT use ALL CAPS for the entire message. Start with "ALERT:" on the first line.',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const draft = result.response.text().trim();

    return NextResponse.json({
      draft,
      sensorContext: sensorSummary,
      model: 'gemini-2.5-flash',
    });
  } catch (err) {
    console.error('[API /alerts/draft] Error:', err);
    return NextResponse.json(
      { error: 'Failed to draft alert', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
