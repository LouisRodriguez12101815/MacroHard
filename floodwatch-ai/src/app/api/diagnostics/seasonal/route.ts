/**
 * GET /api/diagnostics/seasonal
 *
 * Uses Gemini to provide seasonal average context for each sensor type
 * based on the current month in Miami-Dade County.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const FALLBACK = {
  'noaa-tides': 'Avg water level: 0.3-0.8 ft MLLW. March is dry season — lower king tide risk.',
  'noaa-wind': 'Avg wind: 8-12 kts E/SE. Trade wind season — steady, moderate breeze.',
  'noaa-temp': 'Avg air: 76°F, water: 77°F. Comfortable pre-summer temps.',
  'waqi-aqi': 'Avg AQI: 30-45 (Good). Dry season means less particulate washout.',
  'nexrad-rain': 'Avg rainfall: 2-3 inches/month. March is one of the driest months.',
  'mb-pumps': 'Pump demand: Low-moderate. Dry season means less stormwater load.',
  'wasd-sewer': 'Avg SSOs: 5-10/month. Lower during dry season. Moratoriums: ~130 basins.',
  '311-zones': 'Storm surge risk: Low in March. Hurricane season starts June 1.',
};

export async function GET() {
  const month = new Date().toLocaleString('en-US', { month: 'long' });

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ month, seasonal: FALLBACK, model: 'fallback' });
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = [
      `It is ${month} in Miami-Dade County, Florida.`,
      'For each sensor type below, provide the typical seasonal average measurement',
      'for this time of year in one concise sentence (max 15 words each).',
      'Respond with ONLY valid JSON matching this structure:',
      JSON.stringify(FALLBACK),
      '',
      'Sensor types:',
      '- noaa-tides: NOAA tide gauge water level (feet above MLLW)',
      '- noaa-wind: Wind speed and direction at Virginia Key',
      '- noaa-temp: Air and water temperature',
      '- waqi-aqi: Air quality index for Miami',
      '- nexrad-rain: Monthly rainfall from NEXRAD radar',
      '- mb-pumps: Miami Beach stormwater pump station demand',
      '- wasd-sewer: Miami-Dade WASD sewer overflow frequency',
      '- 311-zones: Storm surge / flood zone risk level',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const seasonal = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ month, seasonal, model: 'gemini-2.5-flash' });
    }

    return NextResponse.json({ month, seasonal: FALLBACK, model: 'fallback-parse-error' });
  } catch (err) {
    console.error('[API /diagnostics/seasonal] Error:', err);
    return NextResponse.json({ month, seasonal: FALLBACK, model: 'fallback-error' });
  }
}
