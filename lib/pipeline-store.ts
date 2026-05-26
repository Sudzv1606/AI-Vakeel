/**
 * In-memory store for active pipeline event buffers.
 * The pipeline POST route stores events as they happen.
 * The SSE stream route reads them and streams to the client.
 * 
 * Uses an event buffer + callback pattern so the stream route
 * can receive events even if it connects after the pipeline starts.
 */

import type { PipelineEvent } from './types';

interface PipelineState {
  events: PipelineEvent[];
  listeners: Set<(event: PipelineEvent) => void>;
  completed: boolean;
}

const store = new Map<string, PipelineState>();

export function createPipelineState(sessionId: string): void {
  store.set(sessionId, {
    events: [],
    listeners: new Set(),
    completed: false,
  });
}

export function emitPipelineEvent(sessionId: string, event: PipelineEvent): void {
  const state = store.get(sessionId);
  if (!state) return;

  state.events.push(event);

  // Notify all listeners
  for (const listener of state.listeners) {
    listener(event);
  }

  // Mark completed on terminal events
  if (event.type === 'pipeline_complete' || event.type === 'pipeline_error' || event.type === 'timeout') {
    state.completed = true;
  }
}

export function subscribeToPipeline(
  sessionId: string,
  listener: (event: PipelineEvent) => void
): PipelineEvent[] | null {
  const state = store.get(sessionId);
  if (!state) return null;

  // Add listener for future events
  state.listeners.add(listener);

  // Return buffered events (events that happened before subscription)
  return [...state.events];
}

export function unsubscribeFromPipeline(
  sessionId: string,
  listener: (event: PipelineEvent) => void
): void {
  const state = store.get(sessionId);
  if (!state) return;
  state.listeners.delete(listener);
}

export function isPipelineCompleted(sessionId: string): boolean {
  const state = store.get(sessionId);
  return state?.completed ?? false;
}

export function deletePipelineState(sessionId: string): void {
  store.delete(sessionId);
}

export function hasPipeline(sessionId: string): boolean {
  return store.has(sessionId);
}
