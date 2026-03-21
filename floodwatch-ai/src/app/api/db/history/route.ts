/**
 * GET /api/db/history?hours=72&sensor_type=weather
 *
 * Returns historical sensor readings and detected patterns from SQLite.
 */

import { NextResponse } from 'next/server';
import { getReadingSummary, getRecentPatterns, getDbStats } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const hours = parseInt(url.searchParams.get('hours') || '72');

    const summary = getReadingSummary(hours);
    const patterns = getRecentPatterns(hours);
    const stats = getDbStats();

    return NextResponse.json({
      hoursBack: hours,
      stats,
      summary,
      patterns,
    });
  } catch (err) {
    console.error('[API /db/history] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
