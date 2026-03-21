/**
 * POST /api/claims/chat
 *
 * AGENTIC citizen claims assistant.
 *
 * This is the core differentiator: when a citizen describes an issue and
 * provides a location, the AI doesn't just chat — it TAKES ACTION by
 * autonomously querying every relevant sensor API, gathering real-time
 * evidence, and producing a grounded evidence report.
 *
 * Flow:
 *   1. Citizen describes issue ("flooding at NW 26th and 2nd Ave")
 *   2. Gemini extracts location + category
 *   3. System queries: NEXRAD rain, WASD sewer, MB pumps, NOAA tides,
 *      311 flood zones, METAR weather, air quality
 *   4. Gemini analyzes sensor data against the claim
 *   5. Returns: conversational reply + structured evidence report
 *
 * This bridges the gap between scattered government sensor data and
 * the citizen who just sees water on the street.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getReadingSummary, getRecentPatterns, getDbStats } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ── Sensor Evidence Gathering ───────────────────────────────────────────────

async function gatherSensorEvidence(origin: string): Promise<Record<string, any>> {
  const evidence: Record<string, any> = {};

  const fetches = [
    { key: 'noaa_tides', url: `${origin}/api/sensors/noaa-tides` },
    { key: 'nexrad_rain', url: `${origin}/api/sensors/nexrad-rain` },
    { key: 'miami_beach_pumps', url: `${origin}/api/sensors/miami-beach-pumps` },
    { key: 'wasd_sewer', url: `${origin}/api/sensors/sewer` },
    { key: 'air_quality', url: `${origin}/api/sensors/air-quality` },
    { key: 'metar', url: `${origin}/api/sensors/metar` },
    { key: 'flood_zones', url: `${origin}/api/sensors/311-zones` },
    { key: 'ndbc_coastal', url: `${origin}/api/sensors/ndbc-coastal` },
    { key: 'ports_currents', url: `${origin}/api/sensors/ports-currents` },
    { key: 'miami_beach_tides', url: `${origin}/api/sensors/miami-beach-tides` },
  ];

  await Promise.all(fetches.map(async ({ key, url }) => {
    try {
      const res = await fetch(url);
      if (res.ok) evidence[key] = await res.json();
    } catch { /* skip */ }
  }));

  return evidence;
}

function formatEvidenceSummary(evidence: Record<string, any>): string {
  const lines: string[] = [];

  const tides = evidence.noaa_tides;
  if (tides?.waterLevel) lines.push(`NOAA Virginia Key: Water level ${tides.waterLevel.value} ft MLLW`);
  if (tides?.wind) lines.push(`Wind: ${tides.wind.speed} kts ${tides.wind.directionCardinal}, gusts ${tides.wind.gusts} kts`);
  if (tides?.barometricPressure) lines.push(`Barometric pressure: ${tides.barometricPressure.value} mb`);

  const mbTides = evidence.miami_beach_tides;
  if (mbTides?.waterLevel) lines.push(`Miami Beach tide: ${mbTides.waterLevel.value} ft MLLW`);

  const rain = evidence.nexrad_rain;
  if (rain?.areas) {
    for (const a of rain.areas) {
      if (!a.error) lines.push(`NEXRAD rain at ${a.area}: ${a.avgPrecipitationMmHr} mm/hr (${a.intensity})`);
    }
  }

  const pumps = evidence.miami_beach_pumps;
  if (pumps?.total) lines.push(`Miami Beach pumps: ${pumps.online} online, ${pumps.offline} offline of ${pumps.total}`);

  const sewer = evidence.wasd_sewer;
  if (sewer?.features) {
    const sso = sewer.features.filter((f: any) => f.attributes?.SSO === 'Y').length;
    const morat = sewer.features.filter((f: any) => f.attributes?.MORATFLAG === 'Yes').length;
    lines.push(`WASD Sewer: ${sewer.count} basins, ${sso} active SSO overflows, ${morat} moratoriums`);
  }

  const aqi = evidence.air_quality;
  if (aqi?.aqi) lines.push(`Air quality: AQI ${aqi.aqi.value} (${aqi.aqi.level})`);

  const metar = evidence.metar;
  if (metar?.stations) {
    for (const s of metar.stations.filter((s: any) => s.status === 'online')) {
      lines.push(`METAR ${s.stationId}: wind ${s.windSpeed}kt, vis ${s.visibility}mi, temp ${s.temp}°C`);
    }
  }

  const ndbc = evidence.ndbc_coastal;
  if (ndbc?.stations) {
    for (const s of ndbc.stations.filter((s: any) => s.status === 'online')) {
      lines.push(`NDBC ${s.name}: wind ${s.windSpeed ?? '—'}m/s, waves ${s.waveHeight ?? '—'}m`);
    }
  }

  const zones = evidence.flood_zones;
  if (zones?.stormSurge) lines.push(`311 GIS: ${zones.stormSurge.count} storm surge zones, ${zones.floodZone?.count ?? 0} FEMA flood zones in area`);

  return lines.join('\n');
}

// ── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AGENTIC citizen assistance AI for Miami-Dade County's FloodWatch platform.

You do THREE things that no other 311 system can do:
1. Help citizens describe and report issues (flooding, downed trees, accidents, storm drains, etc.)
2. AUTOMATICALLY VERIFY AND ENRICH their claims using live sensor data
3. LOOK BACK IN TIME using a historical sensor database to verify past events

When a citizen describes an issue:
- Ask for the EXACT location (street intersection, landmark, neighborhood) — 1 question max
- Ask about severity — 1 question max
- Then STOP ASKING and produce the evidence report

When you receive SENSOR_EVIDENCE data, you must:
- Analyze it against the citizen's claim
- State whether sensors SUPPORT, PARTIALLY SUPPORT, or CANNOT CONFIRM the claim
- Cite specific sensor readings that are relevant
- Explain what the data means in plain language
- Note any additional risks the citizen may not be aware of

When you receive HISTORICAL_EVIDENCE data:
- This shows sensor min/max/avg over the past 72 hours from our database
- Use it to verify claims about PAST events ("trees blew down while I was away")
- If wind_gust max was 45kts 2 days ago, that supports a downed tree claim
- If rain peaked at 20mm/hr yesterday, that supports a flooding claim
- Always cite the specific historical peaks and when they occurred
- If DETECTED_PATTERNS exist, mention them — they show Gemini-identified weather events

Format your evidence analysis like this:
📊 SENSOR EVIDENCE REPORT
Claim: [what citizen reported]
Location: [where]
Verdict: [SUPPORTED / PARTIALLY SUPPORTED / INSUFFICIENT DATA]

Then list each relevant sensor finding as a bullet point.

When you have enough info to file, include:
\`\`\`json
{"ready": true, "category": "FLOODING", "location": "NW 26th St & NW 2nd Ave, Wynwood", "severity": "HIGH", "summary": "...", "sensorVerdict": "SUPPORTED", "evidenceCount": 5}
\`\`\`

Keep conversational responses concise (2-3 sentences). The evidence report can be longer.
If someone is in danger, remind them to call 911.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: "I'm ready to help you report an issue. What are you seeing and where? I'll check our sensor network to verify conditions in your area.",
        model: 'fallback',
      });
    }

    // Gather sensor evidence on every request (they're cached server-side)
    const { origin } = new URL(req.url);
    const evidence = await gatherSensorEvidence(origin);
    const evidenceSummary = formatEvidenceSummary(evidence);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build chat with sensor evidence injected
    const chatHistory = [
      { role: 'user' as const, parts: [{ text: 'System context: ' + SYSTEM_PROMPT }] },
      { role: 'model' as const, parts: [{ text: 'Understood. I am the FloodWatch agentic assistant. I will help citizens report issues AND automatically verify their claims against live sensor data. I will cite specific readings and provide an evidence verdict.' }] },
    ];

    // Add conversation history
    if (messages?.length > 0) {
      for (const m of messages.slice(0, -1)) {
        chatHistory.push({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.text }],
        });
      }
    }

    const chat = model.startChat({ history: chatHistory });

    // Build the message with sensor context
    const lastUserMsg = messages?.[messages.length - 1]?.text || 'Hello, I need to report an issue.';

    // After the first user message (they've described something), inject sensor data
    const hasLocation = messages?.length >= 2; // At least one exchange happened

    // Gather historical evidence from SQLite
    let historicalSection = '';
    try {
      const summary = getReadingSummary(72);
      const patterns = getRecentPatterns(72);
      const stats = getDbStats();

      if (summary.length > 0) {
        const histLines = summary.map(s =>
          `${s.sensor_id} ${s.metric}: min=${s.min_value?.toFixed(2)}, max=${s.max_value?.toFixed(2)}, avg=${s.avg_value?.toFixed(2)} ${s.unit || ''} (${s.reading_count} readings, ${s.earliest} to ${s.latest})`
        ).join('\n');

        historicalSection = `\n\nHISTORICAL_EVIDENCE (past 72 hours from database, ${stats.totalReadings} total readings across ${stats.distinctSensors} sensors):\n${histLines}`;

        if (patterns.length > 0) {
          const patternLines = patterns.map(p => `[${p.severity}] ${p.pattern_type}: ${p.description} (detected ${p.timestamp})`).join('\n');
          historicalSection += `\n\nDETECTED_PATTERNS (Gemini-identified anomalies):\n${patternLines}`;
        }
      }
    } catch { /* DB not available yet */ }

    let enrichedMsg = lastUserMsg;
    if (hasLocation) {
      enrichedMsg = `${lastUserMsg}

SENSOR_EVIDENCE (live data just pulled from ${Object.keys(evidence).length} sensor APIs):
${evidenceSummary}${historicalSection}

Based on the citizen's description, the live sensor data, and any historical evidence, provide your evidence analysis. If the citizen is describing past damage, use the HISTORICAL_EVIDENCE to verify what conditions were like when it happened.`;
    }

    const result = await chat.sendMessage(enrichedMsg);
    const reply = result.response.text().trim();

    // Extract structured claim if present
    let claim = null;
    const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try { claim = JSON.parse(jsonMatch[1]); } catch {}
    }

    return NextResponse.json({
      reply: reply.replace(/```json[\s\S]*?```/, '').trim(),
      claim,
      sensorEvidence: hasLocation ? {
        queriedApis: Object.keys(evidence).length,
        summary: evidenceSummary,
        raw: evidence,
      } : null,
      model: 'gemini-1.5-flash',
    });
  } catch (err) {
    console.error('[API /claims/chat] Error:', err);
    return NextResponse.json(
      { error: 'Chat failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
