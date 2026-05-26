'use client';

import { useRef, useState, useCallback } from 'react';
import type { PipelineEvent } from '@/lib/types';

export type SSEStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

interface UseSSEReturn {
  status: SSEStatus;
  lastEvent: PipelineEvent | null;
  error: string | null;
  sessionId: string | null;
  startPipeline: (problemDescription: string) => Promise<void>;
}

/**
 * Hook that starts the pipeline and reads SSE events from the streaming POST response.
 */
export function useSSE(onEvent?: (event: PipelineEvent) => void): UseSSEReturn {
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [lastEvent, setLastEvent] = useState<PipelineEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const startPipeline = useCallback(async (problemDescription: string) => {
    // Abort any existing connection
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('connecting');
    setError(null);
    setLastEvent(null);

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemDescription }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `Server error: ${response.status}`);
        setStatus('error');
        return;
      }

      // Get session ID from header
      const sid = response.headers.get('X-Session-Id');
      if (sid) setSessionId(sid);

      setStatus('connected');

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        setError('No response stream available');
        setStatus('error');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEventData = '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            currentEventData = line.slice(6);
          } else if (line === '' && currentEventData) {
            // Empty line = end of event
            try {
              const pipelineEvent: PipelineEvent = JSON.parse(currentEventData);
              setLastEvent(pipelineEvent);
              onEventRef.current?.(pipelineEvent);

              // Check for terminal events
              if (
                pipelineEvent.type === 'pipeline_complete' ||
                pipelineEvent.type === 'pipeline_error' ||
                pipelineEvent.type === 'timeout'
              ) {
                setStatus('closed');
              }
            } catch {
              // Skip malformed events
            }
            currentEventData = '';
          }
        }
      }

      if (status !== 'closed') {
        setStatus('closed');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Intentional abort
      }
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus('error');
    }
  }, []);

  return { status, lastEvent, error, sessionId, startPipeline };
}
