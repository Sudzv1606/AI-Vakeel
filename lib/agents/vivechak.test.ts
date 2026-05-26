/**
 * Unit tests for Vivechak (Router Agent).
 * Tests domain classification, forum selection, confidence scoring,
 * user confirmation flag, output validation, and error handling.
 */

import { describe, it, expect, vi } from 'vitest';
import { VivechakAgent, type VivechakInput } from './vivechak';
import type { OpenRouterClient, ChatCompletionResponse } from '../openrouter-client';
import type { ArzdarOutput } from '../schemas/arzdar-schema';

// --- Mock OpenRouter Client ---

function createMockClient(responseContent: string): OpenRouterClient {
  return {
    chatCompletion: vi.fn().mockResolvedValue({
      id: 'test-id',
      choices: [{ message: { role: 'assistant', content: responseContent }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    } as ChatCompletionResponse),
  } as unknown as OpenRouterClient;
}

function createErrorClient(error: unknown): OpenRouterClient {
  return {
    chatCompletion: vi.fn().mockRejectedValue(error),
  } as unknown as OpenRouterClient;
}

// --- Test Data ---

const consumerFacts: ArzdarOutput = {
  complainantName: 'Rahul Sharma',
  respondentName: 'ABC Electronics Pvt Ltd',
  incidentDates: ['15th January 2024'],
  grievanceSummary: 'Purchased a defective washing machine that stopped working after 2 weeks',
  reliefSought: 'Full refund of Rs 35,000',
  originalLanguage: 'en',
  extractionComplete: true,
};

const reraFacts: ArzdarOutput = {
  complainantName: 'Priya Patel',
  respondentName: 'XYZ Builders Pvt Ltd',
  incidentDates: ['March 2022'],
  grievanceSummary: 'Builder delayed possession of flat by 2 years beyond promised date in Maharashtra',
  reliefSought: 'Possession of flat or full refund with interest',
  originalLanguage: 'en',
  extractionComplete: true,
};

const rtiFacts: ArzdarOutput = {
  complainantName: 'Amit Kumar',
  respondentName: 'Municipal Corporation of Delhi',
  incidentDates: ['10th February 2024'],
  grievanceSummary: 'Seeking information about road construction budget allocation for ward 45',
  reliefSought: 'Copies of budget allocation documents for road construction in ward 45',
  originalLanguage: 'en',
  extractionComplete: true,
};

// --- Valid Outputs ---

const consumerDistrictOutput = JSON.stringify({
  legalDomain: 'consumer_protection_2019',
  forum: 'District Consumer Disputes Redressal Forum',
  confidenceScore: 0.9,
  requiresUserConfirmation: false,
  reasoning: 'The case involves a defective product (washing machine) purchased from a business. The relief sought is Rs 35,000 which is well within ₹1 crore, so District Forum is appropriate.',
});

const consumerStateOutput = JSON.stringify({
  legalDomain: 'consumer_protection_2019',
  forum: 'State Consumer Disputes Redressal Commission',
  confidenceScore: 0.85,
  requiresUserConfirmation: false,
  reasoning: 'Consumer case with compensation above ₹1 crore but within ₹10 crore.',
});

const consumerNationalOutput = JSON.stringify({
  legalDomain: 'consumer_protection_2019',
  forum: 'National Consumer Disputes Redressal Commission',
  confidenceScore: 0.8,
  requiresUserConfirmation: false,
  reasoning: 'Consumer case with compensation above ₹10 crore.',
});

const reraOutput = JSON.stringify({
  legalDomain: 'rera_2016',
  forum: 'RERA Authority of Maharashtra',
  confidenceScore: 0.92,
  requiresUserConfirmation: false,
  reasoning: 'The case involves a builder delaying possession of a flat in Maharashtra, which falls under RERA Act 2016.',
});

const rtiOutput = JSON.stringify({
  legalDomain: 'rti_2005',
  forum: 'Public Information Officer of Municipal Corporation of Delhi',
  confidenceScore: 0.88,
  requiresUserConfirmation: false,
  reasoning: 'The user is seeking information from a public authority (Municipal Corporation), which is an RTI matter.',
});

const lowConfidenceOutput = JSON.stringify({
  legalDomain: 'consumer_protection_2019',
  forum: 'District Consumer Disputes Redressal Forum',
  confidenceScore: 0.35,
  requiresUserConfirmation: true,
  reasoning: 'The case is ambiguous - could be consumer protection or civil matter.',
});

const borderlineConfidenceOutput = JSON.stringify({
  legalDomain: 'rera_2016',
  forum: 'RERA Authority of the concerned state',
  confidenceScore: 0.5,
  requiresUserConfirmation: false,
  reasoning: 'Case involves real estate but details are limited.',
});

// --- Tests ---

describe('VivechakAgent', () => {
  describe('Domain Classification', () => {
    it('should classify consumer protection cases correctly', async () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.legalDomain).toBe('consumer_protection_2019');
    });

    it('should classify RERA cases correctly', async () => {
      const client = createMockClient(reraOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: reraFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.legalDomain).toBe('rera_2016');
    });

    it('should classify RTI cases correctly', async () => {
      const client = createMockClient(rtiOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: rtiFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.legalDomain).toBe('rti_2005');
    });
  });

  describe('Forum Selection - Consumer Protection', () => {
    it('should select District Forum for claims ≤ ₹1 crore', async () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.forum).toBe('District Consumer Disputes Redressal Forum');
    });

    it('should select State Commission for claims > ₹1 crore and ≤ ₹10 crore', async () => {
      const client = createMockClient(consumerStateOutput);
      const agent = new VivechakAgent(client);
      const highValueFacts: ArzdarOutput = {
        ...consumerFacts,
        reliefSought: 'Compensation of Rs 5 crore for defective construction material',
      };
      const input: VivechakInput = { extractedFacts: highValueFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.forum).toBe('State Consumer Disputes Redressal Commission');
    });

    it('should select National Commission for claims > ₹10 crore', async () => {
      const client = createMockClient(consumerNationalOutput);
      const agent = new VivechakAgent(client);
      const veryHighValueFacts: ArzdarOutput = {
        ...consumerFacts,
        reliefSought: 'Compensation of Rs 15 crore for large-scale fraud',
      };
      const input: VivechakInput = { extractedFacts: veryHighValueFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.forum).toBe('National Consumer Disputes Redressal Commission');
    });
  });

  describe('Forum Selection - RERA', () => {
    it('should select RERA Authority of the relevant state', async () => {
      const client = createMockClient(reraOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: reraFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.forum).toContain('RERA Authority');
      expect(result.output!.forum).toContain('Maharashtra');
    });
  });

  describe('Forum Selection - RTI', () => {
    it('should select Public Information Officer of the relevant authority', async () => {
      const client = createMockClient(rtiOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: rtiFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.forum).toContain('Public Information Officer');
    });
  });

  describe('Confidence Score and User Confirmation', () => {
    it('should set requiresUserConfirmation to true when confidence < 0.5', async () => {
      const client = createMockClient(lowConfidenceOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.confidenceScore).toBeLessThan(0.5);
      expect(result.output!.requiresUserConfirmation).toBe(true);
    });

    it('should set requiresUserConfirmation to false when confidence >= 0.5', async () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.confidenceScore).toBeGreaterThanOrEqual(0.5);
      expect(result.output!.requiresUserConfirmation).toBe(false);
    });

    it('should set requiresUserConfirmation to false when confidence is exactly 0.5', async () => {
      const client = createMockClient(borderlineConfidenceOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: reraFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.confidenceScore).toBe(0.5);
      expect(result.output!.requiresUserConfirmation).toBe(false);
    });

    it('should enforce confidence threshold rule even if LLM returns wrong flag', async () => {
      // LLM returns high confidence but incorrectly sets requiresUserConfirmation to true
      const wrongFlagOutput = JSON.stringify({
        legalDomain: 'consumer_protection_2019',
        forum: 'District Consumer Disputes Redressal Forum',
        confidenceScore: 0.9,
        requiresUserConfirmation: true, // Wrong! Should be false for 0.9
        reasoning: 'Clear consumer case.',
      });

      const client = createMockClient(wrongFlagOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      // Agent should correct the flag based on confidence score
      expect(result.output!.requiresUserConfirmation).toBe(false);
    });

    it('should enforce confidence threshold rule for low confidence with wrong flag', async () => {
      // LLM returns low confidence but incorrectly sets requiresUserConfirmation to false
      const wrongFlagOutput = JSON.stringify({
        legalDomain: 'consumer_protection_2019',
        forum: 'District Consumer Disputes Redressal Forum',
        confidenceScore: 0.3,
        requiresUserConfirmation: false, // Wrong! Should be true for 0.3
        reasoning: 'Ambiguous case.',
      });

      const client = createMockClient(wrongFlagOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      // Agent should correct the flag based on confidence score
      expect(result.output!.requiresUserConfirmation).toBe(true);
    });

    it('should produce confidence score within valid range [0, 1]', async () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.output!.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Output Validation', () => {
    it('should validate correct output successfully', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const output = agent.validateOutput(JSON.parse(consumerDistrictOutput));

      expect(output).not.toBeNull();
      expect(output!.legalDomain).toBe('consumer_protection_2019');
    });

    it('should reject output with invalid legalDomain', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const invalidOutput = {
        legalDomain: 'invalid_domain',
        forum: 'Some Forum',
        confidenceScore: 0.8,
        requiresUserConfirmation: false,
        reasoning: 'Test',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with confidence score > 1', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const invalidOutput = {
        legalDomain: 'consumer_protection_2019',
        forum: 'District Forum',
        confidenceScore: 1.5,
        requiresUserConfirmation: false,
        reasoning: 'Test',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with confidence score < 0', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const invalidOutput = {
        legalDomain: 'consumer_protection_2019',
        forum: 'District Forum',
        confidenceScore: -0.1,
        requiresUserConfirmation: false,
        reasoning: 'Test',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with empty forum', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const invalidOutput = {
        legalDomain: 'consumer_protection_2019',
        forum: '',
        confidenceScore: 0.8,
        requiresUserConfirmation: false,
        reasoning: 'Test',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with empty reasoning', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const invalidOutput = {
        legalDomain: 'consumer_protection_2019',
        forum: 'District Forum',
        confidenceScore: 0.8,
        requiresUserConfirmation: false,
        reasoning: '',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output missing required fields', () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);

      const invalidOutput = {
        legalDomain: 'consumer_protection_2019',
        forum: 'District Forum',
        // missing confidenceScore, requiresUserConfirmation, reasoning
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM timeout errors', async () => {
      const client = createErrorClient({
        type: 'timeout',
        statusCode: 0,
        message: 'Request timed out after 60000ms',
        attemptsUsed: 3,
      });
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('llm_timeout');
    });

    it('should handle exhausted retries errors', async () => {
      const client = createErrorClient({
        type: 'exhausted_retries',
        statusCode: 500,
        message: 'All retry attempts exhausted',
        attemptsUsed: 3,
      });
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('llm_timeout');
    });

    it('should handle unexpected errors', async () => {
      const client = createErrorClient(new Error('Network failure'));
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('unhandled_exception');
      expect(result.error?.description).toContain('Network failure');
    });

    it('should handle empty LLM response', async () => {
      const client = {
        chatCompletion: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100, completion_tokens: 0, total_tokens: 100 },
        }),
      } as unknown as OpenRouterClient;
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
      expect(result.error?.description).toContain('empty response');
    });

    it('should handle malformed JSON response', async () => {
      const client = createMockClient('This is not JSON at all, just plain text without any braces');
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
    });

    it('should handle client errors from OpenRouter', async () => {
      const client = createErrorClient({
        type: 'client_error',
        statusCode: 400,
        message: 'Bad request: invalid model',
        attemptsUsed: 1,
      });
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('unhandled_exception');
      expect(result.error?.description).toContain('Bad request');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON wrapped in markdown code blocks', async () => {
      const wrappedOutput = '```json\n' + consumerDistrictOutput + '\n```';
      const client = createMockClient(wrappedOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.legalDomain).toBe('consumer_protection_2019');
    });

    it('should parse JSON embedded in text', async () => {
      const embeddedOutput = 'Here is the classification:\n' + consumerDistrictOutput + '\nDone.';
      const client = createMockClient(embeddedOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.legalDomain).toBe('consumer_protection_2019');
    });
  });

  describe('Duration Tracking', () => {
    it('should record execution duration on success', async () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record duration even on failure', async () => {
      const client = createErrorClient(new Error('fail'));
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Message Building', () => {
    it('should include all extracted facts in the user message', async () => {
      const client = createMockClient(consumerDistrictOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: consumerFacts };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      // System message should be the system prompt
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Vivechak');

      // User message should contain the facts
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('Rahul Sharma');
      expect(messages[1].content).toContain('ABC Electronics Pvt Ltd');
      expect(messages[1].content).toContain('defective washing machine');
      expect(messages[1].content).toContain('Full refund of Rs 35,000');
    });

    it('should handle "not provided" fields in message building', async () => {
      const incompleteFacts: ArzdarOutput = {
        complainantName: 'not provided',
        respondentName: 'not provided',
        incidentDates: 'not provided',
        grievanceSummary: 'Some issue with a product',
        reliefSought: 'not provided',
        originalLanguage: 'en',
        extractionComplete: true,
      };

      const client = createMockClient(lowConfidenceOutput);
      const agent = new VivechakAgent(client);
      const input: VivechakInput = { extractedFacts: incompleteFacts };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      expect(messages[1].content).toContain('not provided');
      expect(messages[1].content).toContain('Some issue with a product');
    });
  });
});
