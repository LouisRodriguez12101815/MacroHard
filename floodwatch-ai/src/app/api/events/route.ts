import { NextRequest } from 'next/server';
import { MockDataService } from '@/services/MockDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const service = MockDataService.getInstance();

  const intervalId = setInterval(() => {
    service.tick();
    const data = service.getSnapshot();
    const message = `data: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(message)).catch(() => {
        // Stream closed
    });
  }, 2000); // Send updates every 2 seconds

  request.signal.addEventListener('abort', () => {
    clearInterval(intervalId);
    writer.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

// Simple endpoint to toggle demo mode
export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = MockDataService.getInstance();
  service.setDemoMode(body.active);
  
  // also emit immediately
  service.tick();

  return new Response(JSON.stringify({ success: true, isDemoMode: service.isDemoMode }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
