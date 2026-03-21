/**
 * Sensor Registry
 *
 * Central registry for all data source adapters. Sensors self-register with
 * their config, and the pipeline discovers them automatically.
 *
 * Usage:
 *   import { sensorRegistry } from '@/middleware/SensorRegistry';
 *   sensorRegistry.register(config, adapterInstance);
 *
 * To add a new sensor API:
 *   1. Create an adapter class extending BaseAdapter
 *   2. Add an entry to sensors.json
 *   3. Call sensorRegistry.register() — the pipeline picks it up
 */

import { SensorConfig, SensorMode } from './types';
import { BaseAdapter } from '@/adapters/BaseAdapter';

// ── Registration Entry ──────────────────────────────────────────────────────

export interface RegisteredSensor {
  config: SensorConfig;
  adapter: BaseAdapter<unknown>;
  registeredAt: string;
}

// ── Registry ────────────────────────────────────────────────────────────────

class SensorRegistryImpl {
  private sensors: Map<string, RegisteredSensor> = new Map();
  private listeners: Array<(event: RegistryEvent) => void> = [];

  /**
   * Register a sensor adapter with its config.
   * If an adapter with the same ID already exists, it is replaced.
   */
  register(config: SensorConfig, adapter: BaseAdapter<unknown>): void {
    const entry: RegisteredSensor = {
      config,
      adapter,
      registeredAt: new Date().toISOString(),
    };
    this.sensors.set(config.id, entry);
    this.emit({ type: 'REGISTERED', sensorId: config.id, config });
    console.log(`[SensorRegistry] Registered: ${config.id} (${config.name}) [${config.mode}]`);
  }

  /**
   * Unregister a sensor by ID.
   */
  unregister(sensorId: string): boolean {
    const existed = this.sensors.delete(sensorId);
    if (existed) {
      this.emit({ type: 'UNREGISTERED', sensorId });
      console.log(`[SensorRegistry] Unregistered: ${sensorId}`);
    }
    return existed;
  }

  /**
   * Get a single registered sensor by ID.
   */
  get(sensorId: string): RegisteredSensor | undefined {
    return this.sensors.get(sensorId);
  }

  /**
   * Get all registered sensors.
   */
  getAll(): RegisteredSensor[] {
    return Array.from(this.sensors.values());
  }

  /**
   * Get all sensors of a specific type.
   */
  getByType(type: string): RegisteredSensor[] {
    return this.getAll().filter(s => s.config.type === type);
  }

  /**
   * Get all enabled sensors.
   */
  getEnabled(): RegisteredSensor[] {
    return this.getAll().filter(s => s.config.enabled);
  }

  /**
   * Update the mode (LIVE/MOCK/DEMO) for a specific sensor.
   */
  setMode(sensorId: string, mode: SensorMode): void {
    const entry = this.sensors.get(sensorId);
    if (entry) {
      entry.config.mode = mode;
      this.emit({ type: 'MODE_CHANGED', sensorId, mode });
      console.log(`[SensorRegistry] ${sensorId} mode → ${mode}`);
    }
  }

  /**
   * Enable or disable a sensor.
   */
  setEnabled(sensorId: string, enabled: boolean): void {
    const entry = this.sensors.get(sensorId);
    if (entry) {
      entry.config.enabled = enabled;
      this.emit({ type: enabled ? 'ENABLED' : 'DISABLED', sensorId });
    }
  }

  /**
   * Set all sensors to a given mode.
   */
  setAllModes(mode: SensorMode): void {
    for (const entry of this.sensors.values()) {
      entry.config.mode = mode;
    }
    this.emit({ type: 'ALL_MODES_CHANGED', mode });
    console.log(`[SensorRegistry] All sensors → ${mode}`);
  }

  /**
   * Get a diagnostic summary of all registered sensors.
   */
  getDiagnostics(): SensorRegistryDiagnostics {
    const entries = this.getAll();
    return {
      totalRegistered: entries.length,
      enabledCount: entries.filter(e => e.config.enabled).length,
      byType: entries.reduce((acc, e) => {
        acc[e.config.type] = (acc[e.config.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byMode: entries.reduce((acc, e) => {
        acc[e.config.mode] = (acc[e.config.mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sensors: entries.map(e => ({
        id: e.config.id,
        name: e.config.name,
        type: e.config.type,
        mode: e.config.mode,
        enabled: e.config.enabled,
        adapterStatus: e.adapter.status,
        registeredAt: e.registeredAt,
      })),
    };
  }

  // ── Event System ──────────────────────────────────────────────────────────

  /**
   * Subscribe to registry events (sensor added, removed, mode changed, etc.)
   */
  onEvent(listener: (event: RegistryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[SensorRegistry] Event listener error:', err);
      }
    }
  }
}

// ── Event Types ─────────────────────────────────────────────────────────────

export type RegistryEvent =
  | { type: 'REGISTERED'; sensorId: string; config: SensorConfig }
  | { type: 'UNREGISTERED'; sensorId: string }
  | { type: 'MODE_CHANGED'; sensorId: string; mode: SensorMode }
  | { type: 'ENABLED'; sensorId: string }
  | { type: 'DISABLED'; sensorId: string }
  | { type: 'ALL_MODES_CHANGED'; mode: SensorMode };

export interface SensorRegistryDiagnostics {
  totalRegistered: number;
  enabledCount: number;
  byType: Record<string, number>;
  byMode: Record<string, number>;
  sensors: Array<{
    id: string;
    name: string;
    type: string;
    mode: string;
    enabled: boolean;
    adapterStatus: string;
    registeredAt: string;
  }>;
}

// ── Singleton Export ─────────────────────────────────────────────────────────

export const sensorRegistry = new SensorRegistryImpl();
