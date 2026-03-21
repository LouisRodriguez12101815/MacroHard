/**
 * Sensor Middleware Pipeline
 *
 * Express-style middleware chain that each SensorReading passes through.
 * Middleware functions can validate, filter, enrich, or transform readings
 * before they reach the agent pipeline.
 *
 * Built-in middleware:
 *   - validateReading: ensures required fields are present
 *   - geoFilter: drops readings outside the downtown Miami bounding box
 *   - zoneEnricher: attaches a zoneId based on coordinates
 *   - timestampNormalizer: ensures ISO-8601 timestamps
 *
 * Custom middleware:
 *   pipeline.use((reading, next) => {
 *     // do something with reading
 *     next(); // pass to next middleware (or don't, to drop it)
 *   });
 */

import { SensorReading, MiddlewareFn, GeoPoint } from './types';

// ── Downtown Miami Bounding Box ─────────────────────────────────────────────

const DOWNTOWN_MIAMI_BBOX = {
  minLat: 25.750,
  maxLat: 25.800,
  minLng: -80.210,
  maxLng: -80.170,
};

// ── Zone Definitions (simplified for downtown) ──────────────────────────────

const ZONES = [
  { id: 'zone-brickell', name: 'Brickell', minLat: 25.750, maxLat: 25.763, minLng: -80.200, maxLng: -80.185 },
  { id: 'zone-downtown', name: 'Downtown Core', minLat: 25.763, maxLat: 25.780, minLng: -80.200, maxLng: -80.185 },
  { id: 'zone-edgewater', name: 'Edgewater', minLat: 25.780, maxLat: 25.800, minLng: -80.200, maxLng: -80.185 },
  { id: 'zone-miami-beach', name: 'Miami Beach', minLat: 25.770, maxLat: 25.800, minLng: -80.145, maxLng: -80.120 },
];

function resolveZone(point: GeoPoint): string | null {
  for (const zone of ZONES) {
    if (
      point.lat >= zone.minLat && point.lat <= zone.maxLat &&
      point.lng >= zone.minLng && point.lng <= zone.maxLng
    ) {
      return zone.id;
    }
  }
  return null;
}

// ── Built-in Middleware Functions ────────────────────────────────────────────

/**
 * Validates that a reading has all required fields.
 * Drops invalid readings silently (logs a warning).
 */
export const validateReading: MiddlewareFn = (reading, next) => {
  if (!reading.sensorId || !reading.type || !reading.timestamp) {
    console.warn(`[Middleware:validate] Dropping invalid reading — missing required fields`, {
      sensorId: reading.sensorId,
      type: reading.type,
    });
    return; // drop
  }
  next();
};

/**
 * Filters readings to only those within the downtown Miami bounding box.
 * Readings without a location pass through (they might be non-geographic, like weather alerts).
 */
export const geoFilter: MiddlewareFn = (reading, next) => {
  if (!reading.location || (!reading.location.lat && !reading.location.lng)) {
    next(); // no location — pass through
    return;
  }

  const { lat, lng } = reading.location;
  const bbox = DOWNTOWN_MIAMI_BBOX;

  if (lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng) {
    next();
  }
  // else: outside bounding box — drop silently
};

/**
 * Attaches a zoneId enrichment based on the reading's geographic coordinates.
 */
export const zoneEnricher: MiddlewareFn = (reading, next) => {
  if (reading.location) {
    const zone = resolveZone(reading.location);
    if (zone) {
      reading.enrichments.zoneId = zone;
    }
  }
  next();
};

/**
 * Ensures the timestamp is a valid ISO-8601 string.
 * If it's a Unix timestamp (number), converts it.
 */
export const timestampNormalizer: MiddlewareFn = (reading, next) => {
  if (typeof reading.timestamp === 'number') {
    reading.timestamp = new Date(reading.timestamp).toISOString();
  }
  next();
};

// ── Pipeline Class ──────────────────────────────────────────────────────────

export class SensorMiddlewarePipeline {
  private middlewares: MiddlewareFn[] = [];
  private outputBuffer: SensorReading[] = [];

  constructor() {
    // Register built-in middleware in default order
    this.middlewares = [
      validateReading,
      timestampNormalizer,
      geoFilter,
      zoneEnricher,
    ];
  }

  /**
   * Add a custom middleware to the end of the chain.
   */
  use(fn: MiddlewareFn): this {
    this.middlewares.push(fn);
    return this;
  }

  /**
   * Insert a middleware at a specific position in the chain.
   * 0 = before validation, 1 = after validation, etc.
   */
  useAt(index: number, fn: MiddlewareFn): this {
    this.middlewares.splice(index, 0, fn);
    return this;
  }

  /**
   * Process a single reading through the full middleware chain.
   * Returns the reading if it passed all middleware, or null if it was dropped.
   */
  async process(reading: SensorReading): Promise<SensorReading | null> {
    let dropped = false;
    let currentIndex = 0;

    const next = () => {
      currentIndex++;
    };

    for (currentIndex = 0; currentIndex < this.middlewares.length; currentIndex++) {
      const beforeIndex = currentIndex;
      await this.middlewares[currentIndex](reading, next);

      // If next() wasn't called, the reading was dropped
      if (currentIndex === beforeIndex) {
        dropped = true;
        break;
      }
    }

    return dropped ? null : reading;
  }

  /**
   * Process a batch of readings. Returns only the readings that survived the chain.
   */
  async processBatch(readings: SensorReading[]): Promise<SensorReading[]> {
    const results: SensorReading[] = [];
    for (const reading of readings) {
      const result = await this.process(reading);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  /**
   * Get the current middleware stack (for diagnostics / debugging).
   */
  getStack(): string[] {
    return this.middlewares.map(fn => fn.name || '(anonymous)');
  }
}

// ── Singleton Export ─────────────────────────────────────────────────────────

export const sensorPipeline = new SensorMiddlewarePipeline();
