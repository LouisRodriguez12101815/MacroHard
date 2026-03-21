import { NextRequest, NextResponse } from 'next/server';
import { MockDataService } from '@/services/MockDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = MockDataService.getInstance();
  const incident = service.incidents.find(i => i.id === id);
  
  if (!incident) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  return NextResponse.json(incident);
}
