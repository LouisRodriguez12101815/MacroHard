/**
 * Sensor Bootstrap
 *
 * Loads the sensor config from sensors.json and registers each adapter
 * with the SensorRegistry. This is called once at app startup.
 *
 * The existing SOURCE_CONFIG and adapters continue to work as before —
 * this bridges them into the new registry so the middleware pipeline
 * can discover and process their output.
 */

import { sensorRegistry } from '@/middleware/SensorRegistry';
import { SensorConfig, SensorMode } from '@/middleware/types';
import { AdapterConfig, DataSourceMode } from './sources';
import { SewerAdapter } from '@/adapters/SewerAdapter';
import { TrafficAdapter } from '@/adapters/TrafficAdapter';
import { WeatherAdapter } from '@/adapters/WeatherAdapter';
import { WaterLevelAdapter } from '@/adapters/WaterLevelAdapter';
import { WebcamAdapter } from '@/adapters/WebcamAdapter';
import sensorsJson from './sensors.json';

// ── Map sensor config IDs to adapter constructors ───────────────────────────

type AdapterFactory = (config: AdapterConfig) => InstanceType<typeof SewerAdapter | typeof TrafficAdapter | typeof WeatherAdapter | typeof WaterLevelAdapter | typeof WebcamAdapter>;

const ADAPTER_MAP: Record<string, AdapterFactory> = {
  'wasd-sewer': (c) => new SewerAdapter(c),
  'fdot-traffic': (c) => new TrafficAdapter(c),
  'nws-weather': (c) => new WeatherAdapter(c),
  'noaa-tides': (c) => new WaterLevelAdapter(c),
  'fdot-cameras': (c) => new WebcamAdapter(c),
};

// ── Convert SensorConfig → AdapterConfig (bridge between old and new) ───────

function toAdapterConfig(sensor: SensorConfig): AdapterConfig {
  return {
    id: sensor.id,
    name: sensor.name,
    mode: sensor.mode as DataSourceMode,
    targetApiUrl: sensor.endpoint,
    pollingIntervalMs: sensor.pollingMs,
  };
}

// ── Bootstrap ───────────────────────────────────────────────────────────────

export function bootstrapSensors(): void {
  const configs = sensorsJson.sensors as SensorConfig[];

  console.log(`[Bootstrap] Loading ${configs.length} sensor configs...`);

  for (const sensorConfig of configs) {
    const factory = ADAPTER_MAP[sensorConfig.id];

    if (!factory) {
      // No built-in adapter for this sensor — skip (future sensors will add their own)
      console.log(`[Bootstrap] Skipping ${sensorConfig.id} — no adapter registered yet`);
      continue;
    }

    if (!sensorConfig.enabled) {
      console.log(`[Bootstrap] Skipping ${sensorConfig.id} — disabled`);
      continue;
    }

    const adapterConfig = toAdapterConfig(sensorConfig);
    const adapter = factory(adapterConfig);

    // Register with the middleware registry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sensorRegistry.register(sensorConfig, adapter as any);
  }

  const diag = sensorRegistry.getDiagnostics();
  console.log(`[Bootstrap] Done. ${diag.totalRegistered} sensors registered (${diag.enabledCount} enabled).`);
}
