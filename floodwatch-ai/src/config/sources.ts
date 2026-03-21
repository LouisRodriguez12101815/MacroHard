export type DataSourceMode = 'LIVE' | 'MOCK' | 'DEMO';

export interface AdapterConfig {
  id: string;
  name: string;
  mode: DataSourceMode;
  targetApiUrl?: string;
  pollingIntervalMs: number;
}

/**
 * Central Configuration for Data Pipelines
 * Allows switching individually per data stream.
 */
export const SOURCE_CONFIG = {
  traffic: {
    id: 'fdot-sunguide',
    name: 'FDOT SunGuide Traffic API',
    mode: 'MOCK' as DataSourceMode, // Default to mock, change to LIVE when keys are inserted
    targetApiUrl: 'https://api.fdot.gov/traffic/v1/sensors', // Placeholder for actual implementation
    pollingIntervalMs: 5000
  },
  webcams: {
    id: 'mdc-cameras',
    name: 'Miami-Dade Public Webcams',
    mode: 'MOCK' as DataSourceMode,
    targetApiUrl: 'https://miamidade.gov/transit/api/cameras',
    pollingIntervalMs: 10000
  },
  weather: {
    id: 'nws-weather',
    name: 'National Weather Service API',
    mode: 'MOCK' as DataSourceMode,
    targetApiUrl: 'https://api.weather.gov/alerts/active/zone/FLZ074', // FLZ074 is Miami-Dade
    pollingIntervalMs: 60000
  },
  waterLevel: {
    id: 'usgs-water',
    name: 'USGS / NOAA Coastal Gauges',
    mode: 'MOCK' as DataSourceMode,
    targetApiUrl: 'https://waterservices.usgs.gov/nwis/iv/?site=02290749', 
    pollingIntervalMs: 15000
  },
  sewer: {
    id: 'county-sewer',
    name: 'County Internal Sewer Telemetry',
    mode: 'MOCK' as DataSourceMode, // Not publicly available, usually stays MOCK
    targetApiUrl: 'internal://scada-core.miamidade.local',
    pollingIntervalMs: 2000
  }
};

let currentConfig = { ...SOURCE_CONFIG };

export function updateSourceMode(source: keyof typeof SOURCE_CONFIG, mode: DataSourceMode) {
  currentConfig[source].mode = mode;
}

export function getSourceConfig() {
  return currentConfig;
}

export function setAllModes(mode: DataSourceMode) {
  for (const key of Object.keys(currentConfig)) {
    currentConfig[key as keyof typeof SOURCE_CONFIG].mode = mode;
  }
}
