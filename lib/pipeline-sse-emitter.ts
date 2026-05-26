/**
 * Pipeline-aware SSE Emitter that writes events to the pipeline store.
 * This allows the stream route to pick up events even if it connects
 * after the pipeline has started emitting.
 */

import type { PipelineEvent } from './types';
import { emitPipelineEvent } from './pipeline-store';
import type { SSEEmitter as SSEEmitterInterface } from './sse-emitter';

const MAX_SUMMARY_LENGTH = 200;

export class PipelineSSEEmitter implements Pick<SSEEmitterInterface, 'emit' | 'close' | 'isConnected'> {
  private sessionId: string;
  private connected: boolean = true;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  emit(event: PipelineEvent): void {
    if (!this.connected) return;

    // Enforce 200-character limit on summary
    const sanitizedEvent = { ...event };
    if (sanitizedEvent.summary && sanitizedEvent.summary.length > MAX_SUMMARY_LENGTH) {
      sanitizedEvent.summary = sanitizedEvent.summary.slice(0, MAX_SUMMARY_LENGTH);
    }

    emitPipelineEvent(this.sessionId, sanitizedEvent);
  }

  close(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
