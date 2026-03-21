import { FloodIncident, CitizenAlert, ClaimEvidenceEvent, AgentTrace, ZoneRisk } from '@/types/schemas';
import { LLMProvider } from '@/lib/llm-provider';

export class PublishingAgent {

  /**
   * Translates AI decisions into external communications.
   */
  public async publishIncident(
    incident: FloodIncident, 
    zone: ZoneRisk | undefined
  ): Promise<{ newAlerts: CitizenAlert[]; newEvidence: ClaimEvidenceEvent[]; trace: AgentTrace }> {
    
    const newAlerts: CitizenAlert[] = [];
    const newEvidence: ClaimEvidenceEvent[] = [];
    
    // 1. Generate Citizen Alert
    const message = await LLMProvider.generateCitizenAlert(incident.title, zone?.name || 'the area');
    
    const alert: CitizenAlert = {
      id: `alt-${Date.now()}-${Math.floor(Math.random()*100)}`,
      incidentId: incident.id,
      message,
      issuedAt: new Date().toISOString(),
      audience: 'CITIZEN',
      status: 'DRAFT'
    };
    newAlerts.push(alert);

    // 2. Generate Claims Evidence Log
    const reasoningStr = await LLMProvider.generateIncidentExplanation(incident.sources);
    const evidence: ClaimEvidenceEvent = {
        id: `ev-${Date.now()}-${Math.floor(Math.random()*100)}`,
        incidentId: incident.id,
        timestamp: new Date().toISOString(),
        type: 'VALIDATION_REPORT',
        description: 'AI Generated Validation Report',
        data: { reasoning: reasoningStr, sources: incident.sources.map(s => s.type) }
    };
    newEvidence.push(evidence);

    const trace: AgentTrace = {
      id: `trace-pub-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      agentName: 'PublishingAgent',
      timestamp: new Date().toISOString(),
      inputContext: `Decisions for ${incident.id}`,
      outputSummary: 'Compiled 1 Draft Alert and 1 Validation Evidence Packet.',
      reasoning: 'Extracted semantic intent from Decision Agent to form external publishing artifacts.'
    };

    return { newAlerts, newEvidence, trace };
  }
}
