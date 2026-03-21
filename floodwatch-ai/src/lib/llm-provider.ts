/**
 * LLM Provider Abstraction
 * 
 * Future plugin point for Gemini or Nemotron.
 * Currently uses deterministic templated fallbacks to keep UI playable without API keys.
 */

export class LLMProvider {
  
  static async generateIncidentExplanation(sources: any[]): Promise<string> {
    // Stub for LLM call: Combine strings intelligently
    const descriptions = sources.map(s => s.description).join(' Also, ');
    return `Cross-referencing telemetry confirms event: ${descriptions}.`;
  }

  static async generateActionWording(intent: string, reasoning: string): Promise<{ action: string, explanation: string }> {
     // Stub for LLM action planner mapping raw intents to formatted text
     return {
       action: intent,
       explanation: reasoning
     };
  }

  static async generateCitizenAlert(incidentTitle: string, zoneName: string): Promise<string> {
    // LLM mapping prompt turning severity to public safety tones
    return `EMERGENCY ALERT: ${incidentTitle} in ${zoneName}. Please exercise extreme caution and avoid flooded roadways. Do not drive through standing water.`;
  }
}
