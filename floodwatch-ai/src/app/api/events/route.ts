import { NextRequest } from 'next/server';
import { MockDataService } from '@/services/MockDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const service = MockDataService.getInstance();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat to keep connection alive in some proxies
      controller.enqueue(encoder.encode(': connected\n\n'));

      const intervalId = setInterval(() => {
        try {
          const data = service.getSnapshot();
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error('[SSE] Error sending data:', err);
        }
      }, 5000); // 5s interval for better stability in dev HMR environments

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
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
