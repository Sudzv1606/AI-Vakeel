/**
 * Unit tests for PipelineOrchestrator.
 * Tests sequential execution, inter-agent validation, timing, SSE events,
 * session persistence, and timeout handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineOrchestrator, type PipelineAgents, type PipelineConfig } from './orchestrator';
import type { BaseAgent, AgentExecutionResult } from './agents/base-agent';
import type { ArzdarOutput } from './agents/arzdar';
import type { VivechakOutput } from './agents/vivechak';
import type { ShodhakOutput } from './agents/shodhak';
import type { MunshiOutput } from './agents/munshi';
import type { NyayadootOutput } from './agents/nyayadoot';
import type { SSEEmitter } from './sse-emitter';
import type { SessionManager } from './session-manager';

// --- Mock Data ---

const mockArzdarOutput: ArzdarOutput = {
  complainantName: 'Rahul Sharma',
  respondentName: 'ABC Electronics',
  incidentDates: ['15th January 2024'],
  grievanceSummary: 'Defective product',
  reliefSought: 'Full refund',
  originalLanguage: 'en',
  extractionComplete: true,
};

const mockVivechakOutput: VivechakOutput = {
  legalDomain: 'consumer_protection_2019',
  forum: 'District Consumer Disputes Redressal Forum',
  confidenceScore: 0.9,
  requiresUserConfirmation: false,
  reasoning: 'Clear consumer case',
};

const mockShodhakOutput: ShodhakOutput = {
  legalSections: [
    {
      content: 'Section 35 content',
      actName: 'Consumer Protection Act 2019',
      sectionNumber: 'Section 35',
      chapter: 'Chapter IV',
      similarityScore: 0.85,
    },
  ],
  searchMetadata: { thresholdUsed: 0.7, totalResultsFound: 1 },
};

const mockMunshiOutput: MunshiOutput = {
  complaintDocument: '# Complaint Document\n\nContent...',
  documentStructure: {
    header: 'Header',
    factsOfCase: 'Facts',
    legalGrounds: 'Grounds',
    prayerClause: 'Prayer',
    verification: 'Verification',
  },
};

const mockNyayadootOutput: NyayadootOutput = {
  qualityScore: 85,
  approvalStatus: 'approved',
  issues: [],
  finalDocument: '# Final Document\n\nContent...',
};

// --- Mock Factories ---

function createMockAgent<TInput, TOutput>(
  name: string,
  output: TOutput
): BaseAgent<TInput, TOutput> {
  return {
    name: name as any,
    systemPrompt: `${name} system prompt`,
    outputSchema: {},
    execute: vi.fn().mockResolvedValue({
      success: true,
      output,
      durationMs: 50,
    } as AgentExecutionResult<TOutput>),
    validateOutput: vi.fn().mockReturnValue(output),
  };
}

function createFailingAgent<TInput, TOutput>(
  name: string,
  error: { category: string; description: string }
): BaseAgent<TInput, TOutput> {
  return {
    name: name as any,
    systemPrompt: `${name} system prompt`,
    outputSchema: {},
    execute: vi.fn().mockResolvedValue({
      success: false,
      error,
      durationMs: 50,
    } as AgentExecutionResult<TOutput>),
    validateOutput: vi.fn().mockReturnValue(null),
  };
}

function createMockSSEEmitter(): SSEEmitter {
  return {
    emit: vi.fn(),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    readable: new ReadableStream(),
    writable: new WritableStream(),
  } as unknown as SSEEmitter;
}

function createMockSessionManager(): SessionManager {
  return {
    create: vi.fn().mockResolvedValue({ id: 'session-123' }),
    updateAgentOutput: vi.fn().mockResolvedValue(undefined),
    markComplete: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
  } as unknown as SessionManager;
}

function createDefaultAgents(): PipelineAgents {
  return {
    arzdar: createMockAgent('Arzdar', mockArzdarOutput),
    vivechak: createMockAgent('Vivechak', mockVivechakOutput),
    shodhak: createMockAgent('Shodhak', mockShodhakOutput),
    munshi: createMockAgent('Munshi', mockMunshiOutput),
    nyayadoot: createMockAgent('Nyayadoot', mockNyayadootOutput),
  };
}

const defaultConfig: PipelineConfig = {
  maxExecutionTimeMs: 300000,
  sessionId: 'session-123',
};

// --- Tests ---

describe('PipelineOrchestrator', () => {
  describe('Sequential Execution', () => {
    it('should execute all agents in order and return final output', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem description');

      expect(result.success).toBe(true);
      expect(result.output).toEqual(mockNyayadootOutput);
      expect(agents.arzdar.execute).toHaveBeenCalled();
      expect(agents.vivechak.execute).toHaveBeenCalled();
      expect(agents.shodhak.execute).toHaveBeenCalled();
      expect(agents.munshi.execute).toHaveBeenCalled();
      expect(agents.nyayadoot.execute).toHaveBeenCalled();
    });

    it('should pass correct input to each agent', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      // Arzdar receives problem description
      expect(agents.arzdar.execute).toHaveBeenCalledWith({ problemDescription: 'Test problem' });

      // Vivechak receives Arzdar output
      expect(agents.vivechak.execute).toHaveBeenCalledWith({ extractedFacts: mockArzdarOutput });

      // Shodhak receives facts and domain
      expect(agents.shodhak.execute).toHaveBeenCalledWith({
        extractedFacts: mockArzdarOutput,
        legalDomain: 'consumer_protection_2019',
      });

      // Munshi receives all prior outputs
      expect(agents.munshi.execute).toHaveBeenCalledWith({
        extractedFacts: mockArzdarOutput,
        routing: mockVivechakOutput,
        legalSections: mockShodhakOutput,
      });

      // Nyayadoot receives document and context
      expect(agents.nyayadoot.execute).toHaveBeenCalledWith({
        complaintDocument: mockMunshiOutput.complaintDocument,
        legalDomain: 'consumer_protection_2019',
        extractedFacts: mockArzdarOutput,
      });
    });

    it('should record timing for each agent', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      expect(result.timing['Arzdar']).toBeDefined();
      expect(result.timing['Arzdar'].startMs).toBeGreaterThan(0);
      expect(result.timing['Arzdar'].endMs).toBeGreaterThanOrEqual(result.timing['Arzdar'].startMs);
      expect(result.timing['Arzdar'].durationMs).toBeGreaterThanOrEqual(0);

      expect(result.timing['Vivechak']).toBeDefined();
      expect(result.timing['Shodhak']).toBeDefined();
      expect(result.timing['Munshi']).toBeDefined();
      expect(result.timing['Nyayadoot']).toBeDefined();
    });

    it('should ensure sequential timing (each agent starts after previous ends)', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      const t = result.timing;
      expect(t['Arzdar'].endMs).toBeLessThanOrEqual(t['Vivechak'].startMs);
      expect(t['Vivechak'].endMs).toBeLessThanOrEqual(t['Shodhak'].startMs);
      expect(t['Shodhak'].endMs).toBeLessThanOrEqual(t['Munshi'].startMs);
      expect(t['Munshi'].endMs).toBeLessThanOrEqual(t['Nyayadoot'].startMs);
    });
  });

  describe('Agent Failure Handling', () => {
    it('should halt pipeline when Arzdar fails', async () => {
      const agents = createDefaultAgents();
      agents.arzdar = createFailingAgent('Arzdar', {
        category: 'llm_timeout',
        description: 'Timed out',
      });
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      expect(result.success).toBe(false);
      expect(result.error?.failingAgent).toBe('Arzdar');
      expect(result.error?.category).toBe('llm_timeout');
      expect(agents.vivechak.execute).not.toHaveBeenCalled();
    });

    it('should halt pipeline when Vivechak fails', async () => {
      const agents = createDefaultAgents();
      agents.vivechak = createFailingAgent('Vivechak', {
        category: 'schema_validation',
        description: 'Invalid output',
      });
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      expect(result.success).toBe(false);
      expect(result.error?.failingAgent).toBe('Vivechak');
      expect(agents.shodhak.execute).not.toHaveBeenCalled();
    });

    it('should halt pipeline when Munshi fails', async () => {
      const agents = createDefaultAgents();
      agents.munshi = createFailingAgent('Munshi', {
        category: 'dependency_failure',
        description: 'Missing legal sections',
      });
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      expect(result.success).toBe(false);
      expect(result.error?.failingAgent).toBe('Munshi');
      expect(agents.nyayadoot.execute).not.toHaveBeenCalled();
    });

    it('should mark session as failed when agent fails', async () => {
      const agents = createDefaultAgents();
      agents.arzdar = createFailingAgent('Arzdar', {
        category: 'llm_timeout',
        description: 'Timed out',
      });
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      expect(sessionManager.markFailed).toHaveBeenCalledWith('session-123', {
        failingAgent: 'Arzdar',
        category: 'llm_timeout',
        description: 'Timed out',
      });
    });
  });

  describe('Inter-agent Schema Validation', () => {
    it('should re-prompt agent once on schema validation failure then succeed', async () => {
      const agents = createDefaultAgents();
      // First call fails with schema_validation, second succeeds
      const executeFn = vi.fn()
        .mockResolvedValueOnce({
          success: false,
          error: { category: 'schema_validation', description: 'Invalid output' },
          durationMs: 20,
        })
        .mockResolvedValueOnce({
          success: true,
          output: mockArzdarOutput,
          durationMs: 30,
        });
      agents.arzdar = {
        ...agents.arzdar,
        execute: executeFn,
      };
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      expect(result.success).toBe(true);
      expect(executeFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('SSE Events', () => {
    it('should emit initial Waiting status for all agents', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      const emitCalls = (sseEmitter.emit as ReturnType<typeof vi.fn>).mock.calls;
      const waitingEvents = emitCalls.filter(
        (call: unknown[]) => (call[0] as any).status === 'Waiting'
      );

      expect(waitingEvents.length).toBe(5);
    });

    it('should emit Running and Done status for each agent on success', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      const emitCalls = (sseEmitter.emit as ReturnType<typeof vi.fn>).mock.calls;
      const runningEvents = emitCalls.filter(
        (call: unknown[]) => (call[0] as any).status === 'Running'
      );
      const doneEvents = emitCalls.filter(
        (call: unknown[]) => (call[0] as any).status === 'Done'
      );

      expect(runningEvents.length).toBe(5);
      expect(doneEvents.length).toBe(5);
    });

    it('should emit pipeline_complete event on success', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      const emitCalls = (sseEmitter.emit as ReturnType<typeof vi.fn>).mock.calls;
      const completeEvents = emitCalls.filter(
        (call: unknown[]) => (call[0] as any).type === 'pipeline_complete'
      );

      expect(completeEvents.length).toBe(1);
    });

    it('should emit pipeline_error event on agent failure', async () => {
      const agents = createDefaultAgents();
      agents.arzdar = createFailingAgent('Arzdar', {
        category: 'llm_timeout',
        description: 'Timed out',
      });
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      const emitCalls = (sseEmitter.emit as ReturnType<typeof vi.fn>).mock.calls;
      const errorEvents = emitCalls.filter(
        (call: unknown[]) => (call[0] as any).type === 'pipeline_error'
      );

      expect(errorEvents.length).toBe(1);
    });

    it('should close SSE emitter after pipeline completes', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      expect(sseEmitter.close).toHaveBeenCalled();
    });

    it('should close SSE emitter even on failure', async () => {
      const agents = createDefaultAgents();
      agents.arzdar = createFailingAgent('Arzdar', {
        category: 'llm_timeout',
        description: 'Timed out',
      });
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      expect(sseEmitter.close).toHaveBeenCalled();
    });
  });

  describe('Session Persistence', () => {
    it('should persist each agent output via SessionManager', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      expect(sessionManager.updateAgentOutput).toHaveBeenCalledWith('session-123', 'Arzdar', mockArzdarOutput);
      expect(sessionManager.updateAgentOutput).toHaveBeenCalledWith('session-123', 'Vivechak', mockVivechakOutput);
      expect(sessionManager.updateAgentOutput).toHaveBeenCalledWith('session-123', 'Shodhak', mockShodhakOutput);
      expect(sessionManager.updateAgentOutput).toHaveBeenCalledWith('session-123', 'Munshi', mockMunshiOutput);
      expect(sessionManager.updateAgentOutput).toHaveBeenCalledWith('session-123', 'Nyayadoot', mockNyayadootOutput);
    });

    it('should mark session complete on success', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();
      const orchestrator = new PipelineOrchestrator(defaultConfig, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      expect(sessionManager.markComplete).toHaveBeenCalledWith('session-123');
    });
  });

  describe('Pipeline Timeout', () => {
    it('should timeout when execution exceeds maxExecutionTimeMs', async () => {
      const agents = createDefaultAgents();
      // Make Arzdar take a long time by using a slow execute
      agents.arzdar = {
        ...agents.arzdar,
        execute: vi.fn().mockImplementation(async () => {
          // Simulate time passing beyond timeout
          return { success: true, output: mockArzdarOutput, durationMs: 50 };
        }),
      };

      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();

      // Set timeout to 0 to trigger immediate timeout
      const config: PipelineConfig = { maxExecutionTimeMs: 0, sessionId: 'session-123' };
      const orchestrator = new PipelineOrchestrator(config, agents, sseEmitter, sessionManager);

      const result = await orchestrator.execute('Test problem');

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('llm_timeout');
      expect(result.error?.description).toContain('5 minutes');
    });

    it('should emit timeout event when pipeline times out', async () => {
      const agents = createDefaultAgents();
      const sseEmitter = createMockSSEEmitter();
      const sessionManager = createMockSessionManager();

      const config: PipelineConfig = { maxExecutionTimeMs: 0, sessionId: 'session-123' };
      const orchestrator = new PipelineOrchestrator(config, agents, sseEmitter, sessionManager);

      await orchestrator.execute('Test problem');

      const emitCalls = (sseEmitter.emit as ReturnType<typeof vi.fn>).mock.calls;
      const timeoutEvents = emitCalls.filter(
        (call: unknown[]) => (call[0] as any).type === 'timeout'
      );

      expect(timeoutEvents.length).toBe(1);
    });
  });
});
