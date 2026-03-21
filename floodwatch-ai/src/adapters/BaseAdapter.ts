import { AdapterConfig, DataSourceMode } from '../config/sources';

export interface DiagnosticSnapshot {
  adapterId: string;
  name: string;
  mode: DataSourceMode;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  lastFetchTime: string | null;
  errorCount: number;
  lastPayloadSample: any;
}

export abstract class BaseAdapter<DomainModel> {
  protected config: AdapterConfig;
  
  // Diagnostic State
  public status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' = 'ONLINE';
  public lastFetchTime: string | null = null;
  public errorCount: number = 0;
  public lastPayloadSample: any = null;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * Main entry point orchestrating retry logic, parsing, and domain mapping.
   */
  public async fetchAndMap(tickCount: number = 0): Promise<DomainModel[]> {
    try {
      this.lastFetchTime = new Date().toISOString();
      const rawPayload = await this.executeFetch(tickCount);
      
      // Store a lightweight sample for the diagnostics page
      this.lastPayloadSample = Array.isArray(rawPayload) 
        ? rawPayload.slice(0, 2) 
        : rawPayload;

      const normalized = this.normalize(rawPayload);
      const mapped = this.mapToDomain(normalized);
      
      this.status = 'ONLINE';
      this.errorCount = 0;
      return mapped;
      
    } catch (err) {
      console.error(`[${this.config.name}] Fetch Error:`, err);
      this.errorCount++;
      this.status = this.errorCount > 3 ? 'OFFLINE' : 'DEGRADED';
      this.lastPayloadSample = { error: (err as Error).message };
      return []; // Return empty on failure to prevent crashing the engine
    }
  }

  /**
   * Router that decides whether to hit an external API, mock a gaussian drift, or run the rigid demo scenario.
   */
  private async executeFetch(tickCount: number): Promise<any> {
    switch (this.config.mode) {
      case 'LIVE':
        return await this.fetchLive();
      case 'DEMO':
        return this.fetchDemo(tickCount);
      case 'MOCK':
      default:
        return this.fetchMock();
    }
  }

  /**
   * Concrete adapters implement these targeted operations.
   */
  protected abstract fetchLive(): Promise<any>;
  protected abstract fetchMock(): any;
  protected abstract fetchDemo(tickCount: number): any;
  protected abstract normalize(rawPayload: any): any;
  protected abstract mapToDomain(normalizedData: any): DomainModel[];

  /**
   * Exposes state for the diagnostic UI.
   */
  public getDiagnostics(): DiagnosticSnapshot {
    return {
      adapterId: this.config.id,
      name: this.config.name,
      mode: this.config.mode,
      status: this.status,
      lastFetchTime: this.lastFetchTime,
      errorCount: this.errorCount,
      lastPayloadSample: this.lastPayloadSample,
    };
  }
}
