/**
 * LLM Provider — Gemini Integration
 *
 * Uses Google's Generative AI SDK (@google/generative-ai) with Gemini models.
 * Falls back to deterministic templates when GEMINI_API_KEY is not set,
 * so the app remains fully functional without an API key.
 *
 * Set GEMINI_API_KEY in .env.local to enable live AI responses.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash';

function getModel() {
  if (!GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

export class LLMProvider {

  /**
   * Generate a natural-language explanation of a flood incident from multiple sources.
   */
  static async generateIncidentExplanation(sources: any[]): Promise<string> {
    const model = getModel();
    if (!model) {
      // Fallback: deterministic template
      const descriptions = sources.map(s => s.description).join(' Also, ');
      return `Cross-referencing telemetry confirms event: ${descriptions}.`;
    }

    try {
      const prompt = [
        'You are an emergency operations AI analyst for Miami-Dade County flood monitoring.',
        'Given the following sensor and data source readings, produce a concise 2-3 sentence',
        'incident explanation suitable for an operations dashboard. Be factual and precise.',
        '',
        'Sources:',
        ...sources.map((s, i) => `${i + 1}. [${s.type}] ${s.description} (confidence: ${s.confidence})`),
        '',
        'Incident explanation:',
      ].join('\n');

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      console.error('[LLMProvider] Gemini incident explanation error:', err);
      const descriptions = sources.map(s => s.description).join(' Also, ');
      return `Cross-referencing telemetry confirms event: ${descriptions}.`;
    }
  }

  /**
   * Generate action wording for an emergency response intent.
   */
  static async generateActionWording(intent: string, reasoning: string): Promise<{ action: string; explanation: string }> {
    const model = getModel();
    if (!model) {
      return { action: intent, explanation: reasoning };
    }

    try {
      const prompt = [
        'You are an emergency response action planner for a municipal flood monitoring system.',
        `Intent: ${intent}`,
        `Context: ${reasoning}`,
        '',
        'Produce a JSON object with two fields:',
        '- "action": a clear, actionable directive (1 sentence)',
        '- "explanation": why this action is necessary (1-2 sentences)',
        '',
        'Respond with ONLY valid JSON, no markdown.',
      ].join('\n');

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Parse JSON response from Gemini
      const parsed = JSON.parse(text);
      return {
        action: parsed.action || intent,
        explanation: parsed.explanation || reasoning,
      };
    } catch (err) {
      console.error('[LLMProvider] Gemini action wording error:', err);
      return { action: intent, explanation: reasoning };
    }
  }

  /**
   * Generate a citizen-facing emergency alert message.
   */
  static async generateCitizenAlert(incidentTitle: string, zoneName: string): Promise<string> {
    const model = getModel();
    if (!model) {
      return `EMERGENCY ALERT: ${incidentTitle} in ${zoneName}. Please exercise extreme caution and avoid flooded roadways. Do not drive through standing water.`;
    }

    try {
      const prompt = [
        'You are a public safety communications AI for Miami-Dade County.',
        `A flood incident "${incidentTitle}" has been confirmed in the ${zoneName} area.`,
        '',
        'Write a brief, clear emergency alert message (2-3 sentences) for citizens.',
        'Tone: urgent but calm. Include specific safety guidance.',
        'Do NOT use ALL CAPS for the entire message.',
      ].join('\n');

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      console.error('[LLMProvider] Gemini citizen alert error:', err);
      return `EMERGENCY ALERT: ${incidentTitle} in ${zoneName}. Please exercise extreme caution and avoid flooded roadways. Do not drive through standing water.`;
    }
  }

  /**
   * Analyze a camera frame image for flood/water detection using Gemini Vision.
   * Pass a base64-encoded image or a URL.
   */
  static async analyzeFrameForWater(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<{ detected: boolean; confidence: number; description: string }> {
    const model = getModel();
    if (!model) {
      return { detected: false, confidence: 0, description: 'Gemini API key not configured — vision analysis unavailable.' };
    }

    try {
      const prompt = [
        'Analyze this traffic camera image for signs of flooding or standing water on roadways.',
        'Respond with ONLY valid JSON:',
        '{"detected": true/false, "confidence": 0-100, "description": "brief description"}',
      ].join('\n');

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageBase64, mimeType } },
      ]);

      const text = result.response.text().trim();
      return JSON.parse(text);
    } catch (err) {
      console.error('[LLMProvider] Gemini vision analysis error:', err);
      return { detected: false, confidence: 0, description: 'Vision analysis failed.' };
    }
  }
}
