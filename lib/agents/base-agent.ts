/**
 * Base agent interface and shared agent types.
 * All five agents (Vakeel Panch) implement the BaseAgent interface.
 */

export type AgentName = 'Arzdar' | 'Vivechak' | 'Shodhak' | 'Munshi' | 'Nyayadoot';

export type AgentStatus = 'Waiting' | 'Running' | 'Done' | 'Error';

export interface AgentExecutionResult<T> {
  success: boolean;
  output?: T;
  error?: {
    category: 'llm_timeout' | 'schema_validation' | 'unhandled_exception' | 'dependency_failure';
    description: string;
  };
  durationMs: number;
}

export interface JSONSchema {
  [key: string]: unknown;
}

export interface BaseAgent<TInput, TOutput> {
  name: AgentName;
  systemPrompt: string;
  outputSchema: JSONSchema;
  execute(input: TInput): Promise<AgentExecutionResult<TOutput>>;
  validateOutput(raw: unknown): TOutput | null;
}
