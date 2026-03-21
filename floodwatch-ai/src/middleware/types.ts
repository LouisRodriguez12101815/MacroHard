/**
 * Sensor Registry Middleware — Shared Types
 *
 * Every sensor adapter normalizes its output into a `SensorReading`.
 * The middleware pipeline processes readings through a chain of
 * MiddlewareFn handlers before they reach the core agent pipeline.
 */

// ── Sensor Reading (unified output format) ──────────────────────────────────

export type SensorType =
  | 'sewer'
  | 'camera'
  | 'weather'
  | 'water_level'
  | 'traffic'
  | 'air_quality'
  | 'custom';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SensorReading {
  /** Unique ID for this reading (e.g. "wasd-sewer:sen-b1:1711000000000") */
  readingId: string;

  /** Which registered sensor produced this */
  sensorId: string;

  /** Broad category — used for routing to the right agent */
  type: SensorType;

  /** Where the reading came from geographically */
  location: GeoPoint;

  /** ISO-8601 timestamp of the reading */
  timestamp: string;

  /** The actual payload — schema varies by sensor type */
  data: Record<string, unknown>;

  /** Metadata attached by middleware (zone ID, nearest camera, etc.) */
  enrichments: Record<string, unknown>;
}

// ── Sensor Config (one entry per registered sensor) ─────────────────────────

export type SensorMode = 'LIVE' | 'MOCK' | 'DEMO';
export type AuthType = 'none' | 'api_key' | 'oauth' | 'custom';

export interface SensorConfig {
  /** Unique identifier (e.g. "wasd-sewer") */
  id: string;

  /** Human-readable name */
  name: string;

  /** Sensor category */
  type: SensorType;

  /** Current operating mode */
  mode: SensorMode;

  /** Target API endpoint */
  endpoint: string;

  /** Polling interval in milliseconds */
  pollingMs: number;

  /** Authentication method */
  auth: AuthType;

  /** Optional API key env var name (never the key itself) */
  authEnvVar?: string;

  /** Optional geographic bounding box to scope this sensor */
  geoBounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };

  /** Whether this sensor is currently enabled */
  enabled: boolean;
}

// ── Middleware Function Signature ────────────────────────────────────────────

/**
 * A middleware function receives a reading, optionally mutates/enriches it,
 * and calls `next()` to pass it down the chain. Returning without calling
 * next() drops the reading (e.g. for filtering).
 */
export type MiddlewareFn = (
  reading: SensorReading,
  next: () => void
) => void | Promise<void>;

// ── Middleware Context (passed through the chain) ───────────────────────────

export interface MiddlewareContext {
  /** All currently registered sensor configs — useful for cross-referencing */
  registeredSensors: SensorConfig[];

  /** Downtown Miami bounding box for geo-filtering */
  downtownMiamiBbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}
