/**
 * SQLite Database Layer
 *
 * Persists sensor readings over time so the claims chat can:
 * 1. Look back at historical conditions ("was there bad weather 3 days ago?")
 * 2. Detect patterns (rising water + dropping pressure + increasing rain = storm)
 * 3. Provide evidence for claims about past events
 *
 * The DB file lives at floodwatch-ai/data/floodwatch.db (auto-created).
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'floodwatch.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL'); // Better concurrent read performance
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      sensor_id TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL,
      unit TEXT,
      location TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_readings_sensor_time
      ON sensor_readings (sensor_id, timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_readings_type_time
      ON sensor_readings (sensor_type, timestamp DESC);

    CREATE TABLE IF NOT EXISTS detected_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      pattern_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      sensors_involved TEXT,
      gemini_analysis TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_patterns_time
      ON detected_patterns (timestamp DESC);
  `);
}

// ── Write Operations ────────────────────────────────────────────────────────

export interface SensorReadingInsert {
  sensor_id: string;
  sensor_type: string;
  metric: string;
  value: number | null;
  unit?: string;
  location?: string;
  raw_json?: string;
}

export function insertReading(reading: SensorReadingInsert): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sensor_readings (sensor_id, sensor_type, metric, value, unit, location, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    reading.sensor_id,
    reading.sensor_type,
    reading.metric,
    reading.value,
    reading.unit || null,
    reading.location || null,
    reading.raw_json || null
  );
}

export function insertManyReadings(readings: SensorReadingInsert[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sensor_readings (sensor_id, sensor_type, metric, value, unit, location, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const r of readings) {
      stmt.run(r.sensor_id, r.sensor_type, r.metric, r.value, r.unit || null, r.location || null, r.raw_json || null);
    }
  });
  tx();
}

export function insertPattern(pattern: {
  pattern_type: string;
  severity: string;
  description: string;
  sensors_involved?: string;
  gemini_analysis?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO detected_patterns (pattern_type, severity, description, sensors_involved, gemini_analysis)
    VALUES (?, ?, ?, ?, ?)
  `).run(pattern.pattern_type, pattern.severity, pattern.description, pattern.sensors_involved || null, pattern.gemini_analysis || null);
}

// ── Read Operations ─────────────────────────────────────────────────────────

export function getReadingHistory(params: {
  sensor_id?: string;
  sensor_type?: string;
  hours_back?: number;
  limit?: number;
}): any[] {
  const db = getDb();
  const hoursBack = params.hours_back || 72;
  const limit = params.limit || 500;

  let query = `SELECT * FROM sensor_readings WHERE timestamp >= datetime('now', ?)`;
  const args: any[] = [`-${hoursBack} hours`];

  if (params.sensor_id) {
    query += ` AND sensor_id = ?`;
    args.push(params.sensor_id);
  }
  if (params.sensor_type) {
    query += ` AND sensor_type = ?`;
    args.push(params.sensor_type);
  }

  query += ` ORDER BY timestamp DESC LIMIT ?`;
  args.push(limit);

  return db.prepare(query).all(...args);
}

export function getReadingSummary(hours_back: number = 72): any[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      sensor_id,
      sensor_type,
      metric,
      COUNT(*) as reading_count,
      MIN(value) as min_value,
      MAX(value) as max_value,
      AVG(value) as avg_value,
      MIN(timestamp) as earliest,
      MAX(timestamp) as latest,
      unit
    FROM sensor_readings
    WHERE timestamp >= datetime('now', ?)
    GROUP BY sensor_id, metric
    ORDER BY sensor_type, sensor_id
  `).all(`-${hours_back} hours`);
}

export function getRecentPatterns(hours_back: number = 72): any[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM detected_patterns
    WHERE timestamp >= datetime('now', ?)
    ORDER BY timestamp DESC
  `).all(`-${hours_back} hours`);
}

export function getDbStats(): any {
  const db = getDb();
  const totalReadings = db.prepare(`SELECT COUNT(*) as count FROM sensor_readings`).get() as any;
  const totalPatterns = db.prepare(`SELECT COUNT(*) as count FROM detected_patterns`).get() as any;
  const oldestReading = db.prepare(`SELECT MIN(timestamp) as oldest FROM sensor_readings`).get() as any;
  const newestReading = db.prepare(`SELECT MAX(timestamp) as newest FROM sensor_readings`).get() as any;
  const sensorCount = db.prepare(`SELECT COUNT(DISTINCT sensor_id) as count FROM sensor_readings`).get() as any;

  return {
    totalReadings: totalReadings?.count || 0,
    totalPatterns: totalPatterns?.count || 0,
    oldestReading: oldestReading?.oldest || null,
    newestReading: newestReading?.newest || null,
    distinctSensors: sensorCount?.count || 0,
  };
}
