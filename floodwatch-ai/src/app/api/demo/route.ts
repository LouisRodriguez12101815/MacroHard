import { NextRequest, NextResponse } from 'next/server';
import { MockDataService } from '@/services/MockDataService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const service = MockDataService.getInstance();
  return NextResponse.json({ isDemoMode: service.isDemoMode });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = MockDataService.getInstance();
  
  if (typeof body.active === 'boolean') {
    service.setDemoMode(body.active);
  } else {
    // default toggle or start
    service.setDemoMode(!service.isDemoMode);
  }
  
  // Tick immediately to apply initial demo state
  await service.tick();

  return NextResponse.json({ success: true, isDemoMode: service.isDemoMode });
}
