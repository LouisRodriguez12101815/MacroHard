import { FloodIncident, AgentTrace } from '@/types/schemas';

export class VerificationAgent {
  
  /**
   * Cross-checks evidence across sources.
   * Modifies the incident state mathematically if consensus is reached bounding the confidence score.
   */
  public verifyIncident(incident: FloodIncident): { isVerified: boolean; trace: AgentTrace } {
    const strongSources = incident.sources.filter(s => s.confidence === 'HIGH').length;
    const mediumSources = incident.sources.filter(s => s.confidence === 'MEDIUM').length;
    
    // Core consensus logic
    const isVerified = strongSources >= 2 || (strongSources >= 1 && mediumSources >= 1);
    
    let reasoning = `Analyzed ${incident.sources.length} discrete data sources. `;
    if (isVerified) {
      reasoning += `Consensus threshold met (Required: 2 HIGH or 1 HIGH/1 MEDIUM). Found ${strongSources} HIGH and ${mediumSources} MEDIUM signals in vector space. Status upgraded.`;
    } else {
      reasoning += `Incident remains UNVERIFIED. Awaiting further strong visual or physical telemetry. Found ${strongSources} HIGH and ${mediumSources} MEDIUM signals.`;
    }

    const trace: AgentTrace = {
      id: `trace-verif-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      agentName: 'VerificationAgent',
      timestamp: new Date().toISOString(),
      inputContext: `Sources: ${incident.sources.map(s => s.type).join(', ')}`,
      outputSummary: `Verified: ${isVerified.toString().toUpperCase()}`,
      reasoning: reasoning
    };

    return { isVerified, trace };
  }
}
