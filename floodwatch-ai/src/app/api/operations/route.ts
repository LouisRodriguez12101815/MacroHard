import { NextResponse } from 'next/server';
import { MockDataService } from '@/services/MockDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const service = MockDataService.getInstance();
  return NextResponse.json(service.getSnapshot());
}
