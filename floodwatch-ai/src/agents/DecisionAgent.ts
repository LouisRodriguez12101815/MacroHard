import { FloodIncident, RecommendedAction, AgentTrace } from '@/types/schemas';
import { LLMProvider } from '@/lib/llm-provider';

export class DecisionAgent {
  
  /**
   * Converts verified incidents into prioritized action plans.
   */
  public async generateActionPlan(incident: FloodIncident): Promise<{ actions: RecommendedAction[]; trace: AgentTrace }> {
    const actions: RecommendedAction[] = [];
    const intents: string[] = [];

    // Triage heuristics
    if (incident.severity === 'CRITICAL') {
      intents.push('Issue Immediate Citizen Alert');
      intents.push('Dispatch Heavy Barricades');
      intents.push('Reroute Commercial Traffic');
      
      const a1 = await LLMProvider.generateActionWording(intents[0], "Public safety is paramount; area impassable.");
      const a2 = await LLMProvider.generateActionWording(intents[1], "Physical barriers required to prevent submersions.");
      const a3 = await LLMProvider.generateActionWording(intents[2], "Congestion vectors cascading negatively.");
      
      actions.push(a1, a2, a3);
    } else {
      intents.push('Monitor Telemetry Closely');
      intents.push('Prep Public Works Team');
      const a1 = await LLMProvider.generateActionWording(intents[0], "Thresholds nearing escalation but not yet critical.");
      const a2 = await LLMProvider.generateActionWording(intents[1], "Proactive deployment scheduling advised.");
      actions.push(a1, a2);
    }

    const trace: AgentTrace = {
      id: `trace-dec-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      agentName: 'DecisionAgent',
      timestamp: new Date().toISOString(),
      inputContext: `Verified Incident ${incident.id} [Severity: ${incident.severity}]`,
      outputSummary: `Generated ${actions.length} action imperatives.`,
      reasoning: `Based on urgency context mapping, requested [${intents.join(', ')}] prioritized for citizen safety.`
    };

    return { actions, trace };
  }
}
