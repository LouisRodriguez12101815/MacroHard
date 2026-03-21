/**
 * Sensor Registry Middleware — Public API
 *
 * To add a new sensor:
 *   1. Create an adapter class extending BaseAdapter
 *   2. Add an entry to src/config/sensors.json
 *   3. Import and register:
 *
 *      import { sensorRegistry } from '@/middleware';
 *      sensorRegistry.register(config, new MyAdapter(adapterConfig));
 *
 * To add custom middleware:
 *
 *      import { sensorPipeline } from '@/middleware';
 *      sensorPipeline.use((reading, next) => {
 *        // transform or filter
 *        next();
 *      });
 */

export { sensorRegistry } from './SensorRegistry';
export type { RegisteredSensor, RegistryEvent, SensorRegistryDiagnostics } from './SensorRegistry';

export { sensorPipeline, SensorMiddlewarePipeline } from './SensorMiddleware';
export { validateReading, geoFilter, zoneEnricher, timestampNormalizer } from './SensorMiddleware';

export type {
  SensorType,
  SensorMode,
  SensorConfig,
  SensorReading,
  GeoPoint,
  MiddlewareFn,
  MiddlewareContext,
  AuthType,
} from './types';
