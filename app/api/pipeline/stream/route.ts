import { NextRequest } from 'next/server';
import {
  subscribeToPipeline,
  unsubscribeFromPipeline,
  hasPipeline,
  isPipelineCompleted,
} from '@/lib/pipeline-store';
import type { PipelineEvent } from '@/lib/types';

/**
 * GET /api/pipeline/stream?sessionId=<uuid>
 * Establishes an SSE connection for a given session ID and streams PipelineEvents.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'sessionId query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!hasPipeline(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'No active pipeline found for this session ID.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Listener for new events
      const listener = (event: PipelineEvent) => {
        try {
          const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Close stream on terminal events
          if (event.type === 'pipeline_complete' || event.type === 'pipeline_error' || event.type === 'timeout') {
            setTimeout(() => {
              try {
                unsubscribeFromPipeline(sessionId, listener);
                controller.close();
              } catch {
                // Already closed
              }
            }, 100);
          }
        } catch {
          // Stream closed by client
          unsubscribeFromPipeline(sessionId, listener);
        }
      };

      // Subscribe and get buffered events
      const bufferedEvents = subscribeToPipeline(sessionId, listener);

      if (bufferedEvents) {
        // Send all buffered events first
        for (const event of bufferedEvents) {
          const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        // If pipeline already completed, close after sending buffered events
        if (isPipelineCompleted(sessionId)) {
          setTimeout(() => {
            try {
              unsubscribeFromPipeline(sessionId, listener);
              controller.close();
            } catch {
              // Already closed
            }
          }, 100);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
