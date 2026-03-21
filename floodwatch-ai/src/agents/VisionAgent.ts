import { Camera, AgentTrace } from '@/types/schemas';

export class VisionAgent {
  
  /**
   * Evaluates a camera's current state/simulated frame.
   * In a real app, this wraps a vision model API call.
   */
  public analyzeFrame(camera: Camera): { confidence: number; findings: string; trace: AgentTrace } {
    const isWaterDetected = camera.aiAnalysisStatus === 'WATER_DETECTED' || camera.waterConfidenceScore > 75;
    
    let findings = "Roadway appears clear. No significant water or blockage detected.";
    let confidence = camera.waterConfidenceScore;
    let reasoning = "Computer vision frame analysis detected standard dry asphalt and normal traffic flow.";

    if (isWaterDetected) {
      findings = "Deep standing water detected spanning multiple lanes. Impassable to standard vehicles.";
      confidence = Math.max(confidence, 90);
      reasoning = "Visual model confirmed pooling > 6 inches covering > 80% of road surface lane boundaries.";
    }

    const trace: AgentTrace = {
      id: `trace-vis-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      agentName: 'VisionAgent',
      timestamp: new Date().toISOString(),
      inputContext: `Frame from camera ${camera.id} (${camera.name})`,
      outputSummary: `Confidence ${confidence}%: ${findings}`,
      reasoning: reasoning
    };

    return { confidence, findings, trace };
  }
}
