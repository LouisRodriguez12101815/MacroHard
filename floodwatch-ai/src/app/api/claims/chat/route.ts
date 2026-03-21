/**
 * POST /api/claims/chat
 *
 * Gemini-powered conversational endpoint for citizen claims.
 * Helps citizens describe issues (flooding, downed trees, accidents,
 * storm drains, etc.) and clarifies them into actionable reports
 * connected to live sensor data.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const SYSTEM_PROMPT = `You are a helpful Miami-Dade County citizen assistance AI for the FloodWatch platform.
Your job is to help citizens report issues they've observed — flooding, downed trees, car accidents,
clogged storm drains, power outages, road hazards, sewer backups, or anything that affects public safety.

When a citizen describes an issue:
1. Ask clarifying questions to understand the EXACT location (street intersection, landmark, neighborhood)
2. Ask about severity and urgency (is anyone in danger? is the road blocked?)
3. Categorize the issue into one of: FLOODING, DOWNED_TREE, VEHICLE_ACCIDENT, STORM_DRAIN, SEWER_BACKUP, POWER_OUTAGE, ROAD_HAZARD, OTHER
4. When you have enough info, summarize the claim as a structured report

Keep responses concise (2-3 sentences max per turn). Be empathetic but efficient.
If the citizen seems distressed, remind them to call 911 for immediate emergencies.

When you have enough information to file the claim, end your message with a JSON block:
\`\`\`json
{"ready": true, "category": "FLOODING", "location": "NW 26th St & NW 2nd Ave, Wynwood", "severity": "HIGH", "summary": "..."}
\`\`\``;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body; // Array of { role: 'user'|'model', text: string }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: "I'm ready to help you report an issue. What are you seeing? Please describe the problem and where you are (nearest intersection or address).",
        model: 'fallback',
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'System context: ' + SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I am ready to assist Miami-Dade citizens with reporting issues. I will ask clarifying questions about location, severity, and category, then produce a structured claim report.' }] },
        ...(messages || []).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
      ],
    });

    // Get the latest user message
    const lastUserMsg = messages?.[messages.length - 1]?.text || 'Hello, I need to report an issue.';

    const result = await chat.sendMessage(lastUserMsg);
    const reply = result.response.text().trim();

    // Check if Gemini included a structured claim JSON
    let claim = null;
    const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        claim = JSON.parse(jsonMatch[1]);
      } catch { /* ignore parse errors */ }
    }

    return NextResponse.json({
      reply: reply.replace(/```json[\s\S]*?```/, '').trim(), // Remove JSON block from displayed text
      claim,
      model: 'gemini-2.5-flash',
    });
  } catch (err) {
    console.error('[API /claims/chat] Error:', err);
    return NextResponse.json(
      { error: 'Chat failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
