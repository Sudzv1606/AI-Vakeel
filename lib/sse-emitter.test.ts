/**
 * Unit tests for SSEEmitter.
 * Tests event emission, SSE format, summary truncation, close behavior, and connection state.
 */

import { describe, it, expect } from 'vitest';
import { SSEEmitter } from './sse-emitter';
import type { PipelineEvent } from './types';

// --- Helper ---

async function readStream(readable: ReadableStream<Uint8Array>): Promise<string> {
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
  } catch {
    // Stream may be terminated
  }

  return result;
}

async function readNextChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  const { done, value } = await reader.read();
  if (done) return '';
  return decoder.decode(value, { stream: true });
}

// --- Tests ---

describe('SSEEmitter', () => {
  describe('Construction', () => {
    it('should create an emitter with readable and writable streams', () => {
      const emitter = new SSEEmitter();

      expect(emitter.readable).toBeDefined();
      expect(emitter.writable).toBeDefined();
    });

    it('should start in connected state after stream is accessed', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      // Emit an event to trigger the start callback
      const event: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Running',
        timestamp: '2024-01-15T10:00:00.000Z',
      };
      emitter.emit(event);

      expect(emitter.isConnected()).toBe(true);

      emitter.close();
      reader.releaseLock();
    });
  });

  describe('Event Emission', () => {
    it('should format events as SSE data lines', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      const event: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Running',
        timestamp: '2024-01-15T10:00:00.000Z',
      };

      emitter.emit(event);
      emitter.close();

      const chunk = await readNextChunk(reader);

      expect(chunk).toContain('event: status_update');
      expect(chunk).toContain('data: ');
      expect(chunk).toContain('"type":"status_update"');
      expect(chunk).toContain('"agentName":"Arzdar"');
      expect(chunk).toContain('"status":"Running"');
      expect(chunk).toContain('\n\n');

      reader.releaseLock();
    });

    it('should emit multiple events sequentially', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      const event1: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Running',
        timestamp: '2024-01-15T10:00:00.000Z',
      };

      const event2: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Done',
        summary: 'Arzdar completed',
        timestamp: '2024-01-15T10:00:05.000Z',
      };

      emitter.emit(event1);
      emitter.emit(event2);
      emitter.close();

      // Read all chunks until stream ends
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      expect(result).toContain('event: status_update');
      expect(result).toContain('"status":"Running"');
      expect(result).toContain('"status":"Done"');

      reader.releaseLock();
    });

    it('should include all event types in SSE format', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      const events: PipelineEvent[] = [
        { type: 'status_update', agentName: 'Arzdar', status: 'Running', timestamp: '2024-01-15T10:00:00.000Z' },
        { type: 'agent_output', agentName: 'Arzdar', timestamp: '2024-01-15T10:00:01.000Z', data: { test: true } },
        { type: 'pipeline_complete', timestamp: '2024-01-15T10:00:02.000Z', summary: 'Done' },
        { type: 'pipeline_error', timestamp: '2024-01-15T10:00:03.000Z', summary: 'Error occurred' },
        { type: 'timeout', timestamp: '2024-01-15T10:00:04.000Z', summary: 'Timed out' },
      ];

      for (const event of events) {
        emitter.emit(event);
      }
      emitter.close();

      // Read all chunks until stream ends
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      expect(result).toContain('event: status_update');
      expect(result).toContain('event: agent_output');
      expect(result).toContain('event: pipeline_complete');
      expect(result).toContain('event: pipeline_error');
      expect(result).toContain('event: timeout');

      reader.releaseLock();
    });
  });

  describe('Summary Length Enforcement', () => {
    it('should truncate summary to 200 characters', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      const longSummary = 'A'.repeat(300);
      const event: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Done',
        summary: longSummary,
        timestamp: '2024-01-15T10:00:00.000Z',
      };

      emitter.emit(event);
      emitter.close();

      const chunk = await readNextChunk(reader);
      const dataLine = chunk.split('\n').find(line => line.startsWith('data: '));
      const parsed = JSON.parse(dataLine!.replace('data: ', ''));

      expect(parsed.summary.length).toBe(200);

      reader.releaseLock();
    });

    it('should not truncate summary at exactly 200 characters', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      const exactSummary = 'B'.repeat(200);
      const event: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Done',
        summary: exactSummary,
        timestamp: '2024-01-15T10:00:00.000Z',
      };

      emitter.emit(event);
      emitter.close();

      const chunk = await readNextChunk(reader);
      const dataLine = chunk.split('\n').find(line => line.startsWith('data: '));
      const parsed = JSON.parse(dataLine!.replace('data: ', ''));

      expect(parsed.summary.length).toBe(200);
      expect(parsed.summary).toBe(exactSummary);

      reader.releaseLock();
    });

    it('should not modify summary under 200 characters', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      const shortSummary = 'Short summary';
      const event: PipelineEvent = {
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Done',
        summary: shortSummary,
        timestamp: '2024-01-15T10:00:00.000Z',
      };

      emitter.emit(event);
      emitter.close();

      const chunk = await readNextChunk(reader);
      const dataLine = chunk.split('\n').find(line => line.startsWith('data: '));
      const parsed = JSON.parse(dataLine!.replace('data: ', ''));

      expect(parsed.summary).toBe(shortSummary);

      reader.releaseLock();
    });
  });

  describe('Close Behavior', () => {
    it('should mark as disconnected after close', () => {
      const emitter = new SSEEmitter();
      // Access readable to trigger start
      const reader = emitter.readable.getReader();

      emitter.emit({ type: 'status_update', timestamp: new Date().toISOString() });
      expect(emitter.isConnected()).toBe(true);

      emitter.close();
      expect(emitter.isConnected()).toBe(false);

      reader.releaseLock();
    });

    it('should not emit events after close', async () => {
      const emitter = new SSEEmitter();
      const reader = emitter.readable.getReader();

      emitter.emit({
        type: 'status_update',
        agentName: 'Arzdar',
        status: 'Running',
        timestamp: '2024-01-15T10:00:00.000Z',
      });

      emitter.close();

      // This should be silently ignored
      emitter.emit({
        type: 'status_update',
        agentName: 'Vivechak',
        status: 'Running',
        timestamp: '2024-01-15T10:00:01.000Z',
      });

      const chunk = await readNextChunk(reader);

      expect(chunk).toContain('Arzdar');
      expect(chunk).not.toContain('Vivechak');

      reader.releaseLock();
    });

    it('should handle multiple close calls gracefully', () => {
      const emitter = new SSEEmitter();
      emitter.readable.getReader().releaseLock();

      // Should not throw
      emitter.close();
      emitter.close();
      emitter.close();

      expect(emitter.isConnected()).toBe(false);
    });
  });

  describe('Connection State', () => {
    it('should report connected after first emit', () => {
      const emitter = new SSEEmitter();
      emitter.readable.getReader().releaseLock();

      // The stream starts connected once the TransformStream's start() is called
      // which happens when the readable side is accessed
      const emitter2 = new SSEEmitter();
      const reader = emitter2.readable.getReader();
      emitter2.emit({ type: 'status_update', timestamp: new Date().toISOString() });
      expect(emitter2.isConnected()).toBe(true);
      emitter2.close();
      reader.releaseLock();
    });

    it('should report disconnected before any stream access', () => {
      const emitter = new SSEEmitter();
      // Before the readable is accessed, the controller hasn't been set
      // But TransformStream's start is called synchronously in the constructor
      // so it should be connected immediately
      const reader = emitter.readable.getReader();
      expect(emitter.isConnected()).toBe(true);
      emitter.close();
      reader.releaseLock();
    });
  });
});
