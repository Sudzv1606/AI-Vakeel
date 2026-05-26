/**
 * SSE (Server-Sent Events) Emitter for streaming pipeline events to clients.
 * Uses TransformStream and TextEncoder for SSE format compliance.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import type { PipelineEvent } from './types';

// --- Constants ---

/** Maximum allowed length for the summary field in a PipelineEvent */
const MAX_SUMMARY_LENGTH = 200;

// --- SSE Emitter ---

/**
 * SSEEmitter formats PipelineEvents as Server-Sent Events data lines
 * and writes them to a TransformStream for streaming to clients.
 */
export class SSEEmitter {
  private encoder: TextEncoder;
  private controller: TransformStreamDefaultController<Uint8Array> | null = null;
  private stream: TransformStream<Uint8Array, Uint8Array>;
  private connected: boolean = false;

  constructor() {
    this.encoder = new TextEncoder();
    this.stream = new TransformStream<Uint8Array, Uint8Array>({
      start: (controller) => {
        this.controller = controller;
        this.connected = true;
      },
    });
  }

  /**
   * Returns the readable side of the stream for use in HTTP responses.
   */
  get readable(): ReadableStream<Uint8Array> {
    return this.stream.readable;
  }

  /**
   * Returns the writable side of the stream (used internally).
   */
  get writable(): WritableStream<Uint8Array> {
    return this.stream.writable;
  }

  /**
   * Emit a PipelineEvent as an SSE data line.
   * Enforces 200-character limit on the summary field by truncating if necessary.
   *
   * SSE format:
   *   event: <type>\n
   *   data: <JSON payload>\n\n
   */
  emit(event: PipelineEvent): void {
    if (!this.connected || !this.controller) {
      return;
    }

    // Enforce 200-character limit on summary
    const sanitizedEvent = { ...event };
    if (sanitizedEvent.summary && sanitizedEvent.summary.length > MAX_SUMMARY_LENGTH) {
      sanitizedEvent.summary = sanitizedEvent.summary.slice(0, MAX_SUMMARY_LENGTH);
    }

    const eventType = sanitizedEvent.type;
    const data = JSON.stringify(sanitizedEvent);

    const sseMessage = `event: ${eventType}\ndata: ${data}\n\n`;

    try {
      this.controller.enqueue(this.encoder.encode(sseMessage));
    } catch {
      // Stream may have been closed by the client
      this.connected = false;
      this.controller = null;
    }
  }

  /**
   * Close the SSE stream. No more events can be emitted after this.
   */
  close(): void {
    if (this.controller) {
      try {
        this.controller.terminate();
      } catch {
        // Already closed
      }
    }
    this.connected = false;
    this.controller = null;
  }

  /**
   * Returns whether the SSE stream is still connected and writable.
   */
  isConnected(): boolean {
    return this.connected;
  }
}
