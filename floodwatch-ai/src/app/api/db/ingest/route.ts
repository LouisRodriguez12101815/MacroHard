/**
 * POST /api/db/ingest
 *
 * Pulls current readings from all live sensor APIs and persists them
 * to SQLite. Call this on a timer (e.g. every 5 min) to build history.
 *
 * Also runs Gemini pattern detection if enough data has accumulated.
 */

import { NextResponse } from 'next/server';
import { insertManyReadings, insertPattern, getReadingSummary, getDbStats, SensorReadingInsert } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BASE = 'http://localhost:3000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function collectReadings(): Promise<SensorReadingInsert[]> {
  const readings: SensorReadingInsert[] = [];

  try {
    const res = await fetch(`${BASE}/api/sensors/noaa-tides`);
    if (res.ok) {
      const d = await res.json();
      if (d.waterLevel) readings.push({ sensor_id: 'noaa-8723214', sensor_type: 'tide', metric: 'water_level', value: d.waterLevel.value, unit: 'ft', location: 'Virginia Key' });
      if (d.wind) {
        readings.push({ sensor_id: 'noaa-8723214', sensor_type: 'weather', metric: 'wind_speed', value: d.wind.speed, unit: 'kts', location: 'Virginia Key' });
        readings.push({ sensor_id: 'noaa-8723214', sensor_type: 'weather', metric: 'wind_gust', value: d.wind.gusts, unit: 'kts', location: 'Virginia Key' });
      }
      if (d.barometricPressure) readings.push({ sensor_id: 'noaa-8723214', sensor_type: 'weather', metric: 'pressure', value: d.barometricPressure.value, unit: 'mb', location: 'Virginia Key' });
      if (d.waterTemp) readings.push({ sensor_id: 'noaa-8723214', sensor_type: 'weather', metric: 'water_temp', value: d.waterTemp.value, unit: '°F', location: 'Virginia Key' });
    }
  } catch {}

  try {
    const res = await fetch(`${BASE}/api/sensors/nexrad-rain`);
    if (res.ok) {
      const d = await res.json();
      for (const a of (d.areas || [])) {
        if (!a.error) readings.push({ sensor_id: `nexrad-${a.area.replace(/\s+/g, '-').toLowerCase()}`, sensor_type: 'rain', metric: 'precipitation', value: a.avgPrecipitationMmHr, unit: 'mm/hr', location: a.area });
      }
    }
  } catch {}

  try {
    const res = await fetch(`${BASE}/api/sensors/miami-beach-pumps`);
    if (res.ok) {
      const d = await res.json();
      readings.push({ sensor_id: 'mb-pumps', sensor_type: 'infrastructure', metric: 'pumps_online', value: d.online, unit: 'count', location: 'Miami Beach' });
      readings.push({ sensor_id: 'mb-pumps', sensor_type: 'infrastructure', metric: 'pumps_offline', value: d.offline, unit: 'count', location: 'Miami Beach' });
    }
  } catch {}

  try {
    const res = await fetch(`${BASE}/api/sensors/air-quality`);
    if (res.ok) {
      const d = await res.json();
      if (d.aqi) readings.push({ sensor_id: 'waqi-6298', sensor_type: 'air_quality', metric: 'aqi', value: d.aqi.value, unit: 'AQI', location: 'Miami Fire Station #5' });
      if (d.pollutants?.pm25) readings.push({ sensor_id: 'waqi-6298', sensor_type: 'air_quality', metric: 'pm25', value: d.pollutants.pm25, unit: 'µg/m³', location: 'Miami Fire Station #5' });
    }
  } catch {}

  try {
    const res = await fetch(`${BASE}/api/sensors/metar`);
    if (res.ok) {
      const d = await res.json();
      for (const s of (d.stations || []).filter((s: any) => s.status === 'online')) {
        if (s.windSpeed != null) readings.push({ sensor_id: `metar-${s.stationId}`, sensor_type: 'aviation', metric: 'wind_speed', value: s.windSpeed, unit: 'kts', location: s.stationId });
        if (s.visibility != null) readings.push({ sensor_id: `metar-${s.stationId}`, sensor_type: 'aviation', metric: 'visibility', value: s.visibility, unit: 'mi', location: s.stationId });
      }
    }
  } catch {}

  return readings;
}

async function detectPatterns(): Promise<void> {
  if (!GEMINI_API_KEY) return;

  const summary = getReadingSummary(6); // Last 6 hours
  if (summary.length < 5) return; // Not enough data yet

  const summaryText = summary.map(s =>
    `${s.sensor_id} ${s.metric}: min=${s.min_value?.toFixed(2)}, max=${s.max_value?.toFixed(2)}, avg=${s.avg_value?.toFixed(2)} ${s.unit || ''} (${s.reading_count} readings over ${s.earliest} to ${s.latest})`
  ).join('\n');

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      'You are a weather pattern detection AI for Miami-Dade County.',
      'Analyze these sensor reading summaries from the past 6 hours and identify any concerning patterns.',
      'Look for: rising water levels + dropping pressure (storm approach), increasing rain + pump failures (flood risk),',
      'sustained high winds + high tides (surge risk), or any combination that suggests worsening conditions.',
      '',
      'Sensor summaries:',
      summaryText,
      '',
      'If you detect a pattern, respond with JSON: {"detected": true, "type": "STORM_APPROACH|FLOOD_RISK|SURGE_RISK|COMPOUND_EVENT", "severity": "LOW|MODERATE|HIGH|CRITICAL", "description": "1-2 sentences"}',
      'If conditions are normal, respond: {"detected": false}',
      'Respond with ONLY JSON.',
    ].join('\n'));

    const text = result.response.text().trim();
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{"detected": false}');

    if (parsed.detected) {
      insertPattern({
        pattern_type: parsed.type,
        severity: parsed.severity,
        description: parsed.description,
        sensors_involved: summaryText.substring(0, 500),
        gemini_analysis: text,
      });
    }
  } catch {}
}

export async function POST() {
  try {
    const readings = await collectReadings();
    if (readings.length > 0) insertManyReadings(readings);

    // Run pattern detection every ingest cycle
    await detectPatterns();

    const stats = getDbStats();

    return NextResponse.json({
      ingested: readings.length,
      timestamp: new Date().toISOString(),
      dbStats: stats,
    });
  } catch (err) {
    console.error('[API /db/ingest] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
