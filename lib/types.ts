/**
 * Shared types used across the AI Vakeel pipeline.
 */

import type { AgentName, AgentStatus } from './agents/base-agent';

// Re-export agent types for convenience
export type { AgentName, AgentStatus } from './agents/base-agent';

/**
 * Supported legal domains for complaint generation.
 */
export type LegalDomain = 'consumer_protection_2019' | 'rera_2016' | 'rti_2005';

/**
 * Events emitted via SSE during pipeline execution.
 */
export interface PipelineEvent {
  type: 'status_update' | 'agent_output' | 'pipeline_complete' | 'pipeline_error' | 'timeout';
  agentName?: AgentName;
  status?: AgentStatus;
  /** Max 200 characters */
  summary?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  data?: unknown;
}

/**
 * Represents a pipeline execution session persisted in Supabase.
 */
export interface Session {
  /** UUID */
  id: string;
  /** ISO 8601 UTC */
  createdAt: string;
  status: 'in_progress' | 'completed' | 'failed';
  problemDescription: string;
  agentOutputs: {
    arzdar?: unknown;
    vivechak?: unknown;
    shodhak?: unknown;
    munshi?: unknown;
    nyayadoot?: unknown;
  };
  error?: {
    failingAgent: AgentName;
    category: string;
    description: string;
  };
  timing: {
    [key in AgentName]?: { startMs: number; endMs: number; durationMs: number };
  };
}
