/**
 * Pipeline Orchestrator - Coordinates sequential execution of all five agents.
 * Manages inter-agent data flow, schema validation, timing, SSE events,
 * session persistence, and pipeline timeout.
 *
 * Agent execution order: Arzdar → Vivechak → Shodhak → Munshi → Nyayadoot
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type { AgentName, AgentStatus, BaseAgent, AgentExecutionResult } from './agents/base-agent';
import type { ArzdarInput, ArzdarOutput } from './agents/arzdar';
import type { VivechakInput, VivechakOutput } from './agents/vivechak';
import type { ShodhakInput, ShodhakOutput } from './agents/shodhak';
import type { MunshiInput, MunshiOutput } from './agents/munshi';
import type { NyayadootInput, NyayadootOutput } from './agents/nyayadoot';
import type { PipelineEvent, Session } from './types';
import type { SSEEmitter } from './sse-emitter';
import type { SessionManager } from './session-manager';

// --- Interfaces ---

export interface PipelineConfig {
  maxExecutionTimeMs: number; // 300000 (5 minutes)
  sessionId: string;
}

export interface PipelineAgents {
  arzdar: BaseAgent<ArzdarInput, ArzdarOutput>;
  vivechak: BaseAgent<VivechakInput, VivechakOutput>;
  shodhak: BaseAgent<ShodhakInput, ShodhakOutput>;
  munshi: BaseAgent<MunshiInput, MunshiOutput>;
  nyayadoot: BaseAgent<NyayadootInput, NyayadootOutput>;
}

export interface AgentTiming {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface PipelineResult {
  success: boolean;
  output?: NyayadootOutput;
  error?: {
    failingAgent: AgentName;
    category: string;
    description: string;
  };
  timing: Record<string, AgentTiming>;
}

// --- Constants ---

const AGENT_ORDER: AgentName[] = ['Arzdar', 'Vivechak', 'Shodhak', 'Munshi', 'Nyayadoot'];

// --- Pipeline Orchestrator ---

export class PipelineOrchestrator {
  private config: PipelineConfig;
  private agents: PipelineAgents;
  private sseEmitter: SSEEmitter;
  private sessionManager: SessionManager;
  private timing: Record<string, AgentTiming> = {};
  private pipelineStartMs: number = 0;

  constructor(
    config: PipelineConfig,
    agents: PipelineAgents,
    sseEmitter: SSEEmitter,
    sessionManager: SessionManager
  ) {
    this.config = config;
    this.agents = agents;
    this.sseEmitter = sseEmitter;
    this.sessionManager = sessionManager;
  }

  /**
   * Execute the full pipeline sequentially.
   * Returns the final NyayadootOutput on success, or an error on failure.
   */
  async execute(problemDescription: string): Promise<PipelineResult> {
    this.pipelineStartMs = Date.now();

    // Emit initial status: all agents waiting
    for (const agentName of AGENT_ORDER) {
      this.emitStatusUpdate(agentName, 'Waiting');
    }

    try {
      // --- Arzdar ---
      this.checkTimeout();
      const arzdarResult = await this.executeAgent<ArzdarInput, ArzdarOutput>(
        'Arzdar',
        this.agents.arzdar,
        { problemDescription }
      );
      if (!arzdarResult.success || !arzdarResult.output) {
        return this.handleAgentFailure('Arzdar', arzdarResult);
      }
      await this.persistAgentOutput('Arzdar', arzdarResult.output);

      // --- Vivechak ---
      this.checkTimeout();
      const vivechakResult = await this.executeAgent<VivechakInput, VivechakOutput>(
        'Vivechak',
        this.agents.vivechak,
        { extractedFacts: arzdarResult.output }
      );
      if (!vivechakResult.success || !vivechakResult.output) {
        return this.handleAgentFailure('Vivechak', vivechakResult);
      }
      await this.persistAgentOutput('Vivechak', vivechakResult.output);

      // --- Shodhak ---
      this.checkTimeout();
      const shodhakResult = await this.executeAgent<ShodhakInput, ShodhakOutput>(
        'Shodhak',
        this.agents.shodhak,
        {
          extractedFacts: arzdarResult.output,
          legalDomain: vivechakResult.output.legalDomain,
        }
      );
      if (!shodhakResult.success || !shodhakResult.output) {
        return this.handleAgentFailure('Shodhak', shodhakResult);
      }
      await this.persistAgentOutput('Shodhak', shodhakResult.output);

      // --- Munshi ---
      this.checkTimeout();
      let munshiResult = await this.executeAgent<MunshiInput, MunshiOutput>(
        'Munshi',
        this.agents.munshi,
        {
          extractedFacts: arzdarResult.output,
          routing: vivechakResult.output,
          legalSections: shodhakResult.output,
        }
      );
      if (!munshiResult.success || !munshiResult.output) {
        return this.handleAgentFailure('Munshi', munshiResult);
      }
      await this.persistAgentOutput('Munshi', munshiResult.output);

      // --- Nyayadoot ---
      this.checkTimeout();
      let nyayadootResult = await this.executeAgent<NyayadootInput, NyayadootOutput>(
        'Nyayadoot',
        this.agents.nyayadoot,
        {
          complaintDocument: munshiResult.output.complaintDocument,
          legalDomain: vivechakResult.output.legalDomain,
          extractedFacts: arzdarResult.output,
        }
      );
      if (!nyayadootResult.success || !nyayadootResult.output) {
        return this.handleAgentFailure('Nyayadoot', nyayadootResult);
      }

      // --- Revision Loop ---
      let revisions = 0;
      const MAX_REVISIONS = 2;

      while (
        nyayadootResult.success &&
        nyayadootResult.output &&
        nyayadootResult.output.qualityScore < 75 &&
        revisions < MAX_REVISIONS
      ) {
        revisions++;
        this.checkTimeout();

        // Emit revising status
        this.emitEvent({
          type: 'status_update',
          agentName: 'Munshi',
          status: 'Running',
          summary: `Revising document (attempt ${revisions}/${MAX_REVISIONS}). Score: ${nyayadootResult.output.qualityScore}/100`,
          timestamp: new Date().toISOString(),
        });

        // Build revision prompt with issues from Nyayadoot
        const revisionInput: MunshiInput = {
          extractedFacts: arzdarResult.output,
          routing: vivechakResult.output,
          legalSections: shodhakResult.output,
        };

        // We re-run Munshi with a revision instruction appended to the problem
        // by temporarily wrapping the input with revision context
        const issuesList = nyayadootResult.output.issues
          .map((issue, i) => `${i + 1}. [${issue.section}] ${issue.deficiencyType}: ${issue.description} → Fix: ${issue.suggestedCorrection}`)
          .join('\n');

        const revisionPromptInput: MunshiInput = {
          ...revisionInput,
          // Attach revision context to extractedFacts as additional context
          extractedFacts: {
            ...arzdarResult.output,
            // Append revision instructions to grievanceSummary so Munshi sees them
            grievanceSummary: `${arzdarResult.output.grievanceSummary}\n\n--- REVISION INSTRUCTIONS (attempt ${revisions}) ---\nThe previous draft scored ${nyayadootResult.output.qualityScore}/100. Fix ONLY the following issues:\n${issuesList}\n\nPrevious document:\n${munshiResult.output!.complaintDocument}`,
          },
        };

        // Re-run Munshi with revision context
        munshiResult = await this.executeAgent<MunshiInput, MunshiOutput>(
          'Munshi',
          this.agents.munshi,
          revisionPromptInput
        );
        if (!munshiResult.success || !munshiResult.output) {
          return this.handleAgentFailure('Munshi', munshiResult);
        }
        await this.persistAgentOutput('Munshi', munshiResult.output);

        // Re-run Nyayadoot on revised document
        this.checkTimeout();
        this.emitEvent({
          type: 'status_update',
          agentName: 'Nyayadoot',
          status: 'Running',
          summary: `Re-reviewing revised document (revision ${revisions})`,
          timestamp: new Date().toISOString(),
        });

        nyayadootResult = await this.executeAgent<NyayadootInput, NyayadootOutput>(
          'Nyayadoot',
          this.agents.nyayadoot,
          {
            complaintDocument: munshiResult.output.complaintDocument,
            legalDomain: vivechakResult.output.legalDomain,
            extractedFacts: arzdarResult.output,
          }
        );
        if (!nyayadootResult.success || !nyayadootResult.output) {
          return this.handleAgentFailure('Nyayadoot', nyayadootResult);
        }
      }

      // Persist final Nyayadoot output
      await this.persistAgentOutput('Nyayadoot', nyayadootResult.output!);

      // Mark session complete
      await this.sessionManager.markComplete(this.config.sessionId);

      // Emit pipeline complete event
      const finalScore = nyayadootResult.output!.qualityScore;
      const revisionNote = revisions > 0 ? ` after ${revisions} revision(s)` : '';
      this.emitEvent({
        type: 'pipeline_complete',
        summary: `Pipeline completed successfully${revisionNote}. Quality score: ${finalScore}/100`,
        timestamp: new Date().toISOString(),
        data: nyayadootResult.output,
      });

      return {
        success: true,
        output: nyayadootResult.output!,
        timing: this.timing,
      };
    } catch (err: unknown) {
      // Handle pipeline timeout
      if (err instanceof PipelineTimeoutError) {
        this.emitEvent({
          type: 'timeout',
          summary: 'Pipeline execution exceeded 5-minute timeout',
          timestamp: new Date().toISOString(),
        });

        await this.sessionManager.markFailed(this.config.sessionId, {
          failingAgent: err.currentAgent,
          category: 'llm_timeout',
          description: 'Pipeline execution exceeded maximum allowed time of 5 minutes',
        });

        return {
          success: false,
          error: {
            failingAgent: err.currentAgent,
            category: 'llm_timeout',
            description: 'Pipeline execution exceeded maximum allowed time of 5 minutes',
          },
          timing: this.timing,
        };
      }

      // Unexpected error
      const description = err instanceof Error ? err.message : String(err);
      this.emitEvent({
        type: 'pipeline_error',
        summary: `Unexpected pipeline error: ${description.slice(0, 150)}`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: {
          failingAgent: 'Arzdar', // Default if we can't determine
          category: 'unhandled_exception',
          description,
        },
        timing: this.timing,
      };
    } finally {
      this.sseEmitter.close();
    }
  }

  /**
   * Execute a single agent with timing, SSE events, and schema validation.
   * If the first attempt produces invalid output, re-prompts once.
   */
  private async executeAgent<TInput, TOutput>(
    agentName: AgentName,
    agent: BaseAgent<TInput, TOutput>,
    input: TInput
  ): Promise<AgentExecutionResult<TOutput>> {
    const startMs = Date.now();
    this.emitStatusUpdate(agentName, 'Running');

    // First attempt
    let result = await agent.execute(input);

    // If schema validation failed, re-prompt once
    if (
      !result.success &&
      result.error?.category === 'schema_validation'
    ) {
      result = await agent.execute(input);
    }

    const endMs = Date.now();
    const durationMs = endMs - startMs;

    this.timing[agentName] = { startMs, endMs, durationMs };

    if (result.success) {
      // Validate output schema
      const validated = agent.validateOutput(result.output);
      if (!validated) {
        this.emitStatusUpdate(agentName, 'Error');
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: `${agentName} output failed schema validation after re-prompt`,
          },
          durationMs,
        };
      }

      this.emitStatusUpdate(agentName, 'Done', `${agentName} completed successfully`);
      return { ...result, output: validated, durationMs };
    } else {
      this.emitStatusUpdate(agentName, 'Error');
      return { ...result, durationMs };
    }
  }

  /**
   * Handle agent failure: emit error event, mark session failed, return error result.
   */
  private async handleAgentFailure<T>(
    agentName: AgentName,
    result: AgentExecutionResult<T>
  ): Promise<PipelineResult> {
    const errorInfo = {
      failingAgent: agentName,
      category: result.error?.category || 'unhandled_exception',
      description: result.error?.description || 'Unknown error',
    };

    this.emitEvent({
      type: 'pipeline_error',
      agentName,
      summary: `${agentName} failed: ${errorInfo.description.slice(0, 150)}`,
      timestamp: new Date().toISOString(),
    });

    await this.sessionManager.markFailed(this.config.sessionId, errorInfo);

    return {
      success: false,
      error: errorInfo,
      timing: this.timing,
    };
  }

  /**
   * Persist agent output to the session via SessionManager.
   */
  private async persistAgentOutput(agentName: AgentName, output: unknown): Promise<void> {
    await this.sessionManager.updateAgentOutput(
      this.config.sessionId,
      agentName,
      output
    );
  }

  /**
   * Check if the pipeline has exceeded the maximum execution time.
   * Throws PipelineTimeoutError if timeout is exceeded.
   */
  private checkTimeout(): void {
    const elapsed = Date.now() - this.pipelineStartMs;
    if (elapsed >= this.config.maxExecutionTimeMs) {
      throw new PipelineTimeoutError('Arzdar'); // Will be caught in execute()
    }
  }

  /**
   * Emit a status update SSE event for an agent.
   */
  private emitStatusUpdate(agentName: AgentName, status: AgentStatus, summary?: string): void {
    this.emitEvent({
      type: 'status_update',
      agentName,
      status,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a PipelineEvent via the SSE emitter.
   */
  private emitEvent(event: PipelineEvent): void {
    if (this.sseEmitter.isConnected()) {
      this.sseEmitter.emit(event);
    }
  }
}

// --- Custom Error ---

class PipelineTimeoutError extends Error {
  currentAgent: AgentName;

  constructor(currentAgent: AgentName) {
    super('Pipeline execution timeout');
    this.name = 'PipelineTimeoutError';
    this.currentAgent = currentAgent;
  }
}
