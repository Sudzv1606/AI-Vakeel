/**
 * Unit tests for Arzdar (Intake Agent).
 * Tests input validation, output validation, LLM interaction, and follow-up logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArzdarAgent, type ArzdarInput } from './arzdar';
import type { OpenRouterClient, ChatCompletionResponse } from '../openrouter-client';

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

const validDescription = 'I purchased a defective washing machine from ABC Electronics on 15th January 2024. The machine stopped working after just 2 weeks. I want a full refund of Rs 35,000. My name is Rahul Sharma and the seller is ABC Electronics Pvt Ltd.';

const validArzdarOutput = JSON.stringify({
  complainantName: 'Rahul Sharma',
  respondentName: 'ABC Electronics Pvt Ltd',
  incidentDates: ['15th January 2024'],
  grievanceSummary: 'Purchased a defective washing machine that stopped working after 2 weeks',
  reliefSought: 'Full refund of Rs 35,000',
  originalLanguage: 'en',
  extractionComplete: true,
});

const incompleteOutput = JSON.stringify({
  complainantName: 'not provided',
  respondentName: 'not provided',
  incidentDates: 'not provided',
  grievanceSummary: 'Issue with a product purchase',
  reliefSought: 'not provided',
  originalLanguage: 'en',
  followUpQuestions: [
    'What is your full name?',
    'Who sold you the product or service?',
    'What specific resolution are you seeking?',
  ],
  extractionComplete: false,
});

const hindiDescription = 'मैंने 15 जनवरी 2024 को ABC इलेक्ट्रॉनिक्स से एक वॉशिंग मशीन खरीदी थी। मशीन सिर्फ 2 हफ्ते बाद काम करना बंद कर दी। मुझे 35,000 रुपये का पूरा रिफंड चाहिए। मेरा नाम राहुल शर्मा है और विक्रेता ABC इलेक्ट्रॉनिक्स प्राइवेट लिमिटेड है।';

const hindiOutput = JSON.stringify({
  complainantName: 'राहुल शर्मा',
  respondentName: 'ABC इलेक्ट्रॉनिक्स प्राइवेट लिमिटेड',
  incidentDates: ['15 जनवरी 2024'],
  grievanceSummary: 'वॉशिंग मशीन 2 हफ्ते बाद काम करना बंद कर दी',
  reliefSought: '35,000 रुपये का पूरा रिफंड',
  originalLanguage: 'hi',
  extractionComplete: true,
});

// --- Tests ---

describe('ArzdarAgent', () => {
  describe('Input Validation', () => {
    it('should reject descriptions shorter than 50 characters', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: 'Too short input' };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
      expect(result.error?.description).toContain('at least 50 characters');
    });

    it('should reject descriptions longer than 5000 characters', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: 'x'.repeat(5001) };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
      expect(result.error?.description).toContain('must not exceed 5000 characters');
    });

    it('should accept descriptions of exactly 50 characters', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: 'a'.repeat(50) };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
    });

    it('should accept descriptions of exactly 5000 characters', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: 'a'.repeat(5000) };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
    });

    it('should accept descriptions within valid range', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
    });
  });

  describe('Fact Extraction', () => {
    it('should extract all facts from a complete English description', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.complainantName).toBe('Rahul Sharma');
      expect(result.output!.respondentName).toBe('ABC Electronics Pvt Ltd');
      expect(result.output!.incidentDates).toEqual(['15th January 2024']);
      expect(result.output!.grievanceSummary).toContain('defective washing machine');
      expect(result.output!.reliefSought).toContain('35,000');
      expect(result.output!.originalLanguage).toBe('en');
      expect(result.output!.extractionComplete).toBe(true);
    });

    it('should detect Hindi input and set originalLanguage to hi', async () => {
      const client = createMockClient(hindiOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: hindiDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.originalLanguage).toBe('hi');
    });

    it('should handle "not provided" fields correctly', async () => {
      const client = createMockClient(incompleteOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = {
        problemDescription: 'I have a problem with a product I bought recently. It is not working properly and I need help resolving this issue.',
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complainantName).toBe('not provided');
      expect(result.output!.respondentName).toBe('not provided');
      expect(result.output!.extractionComplete).toBe(false);
    });
  });

  describe('Follow-up Questions', () => {
    it('should generate follow-up questions when essential facts are missing', async () => {
      const client = createMockClient(incompleteOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = {
        problemDescription: 'I have a problem with a product I bought recently. It is not working properly and I need help resolving this issue.',
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.followUpQuestions).toBeDefined();
      expect(result.output!.followUpQuestions!.length).toBeGreaterThan(0);
      expect(result.output!.followUpQuestions!.length).toBeLessThanOrEqual(3);
    });

    it('should enforce max 3 follow-up questions even if LLM returns more', async () => {
      const outputWithTooManyQuestions = JSON.stringify({
        complainantName: 'not provided',
        respondentName: 'not provided',
        incidentDates: 'not provided',
        grievanceSummary: 'Product issue',
        reliefSought: 'not provided',
        originalLanguage: 'en',
        followUpQuestions: [
          'Question 1?',
          'Question 2?',
          'Question 3?',
          'Question 4?',
          'Question 5?',
        ],
        extractionComplete: false,
      });

      // The schema itself enforces max(3), so this should fail validation
      // and the agent's validateOutput will return null
      const client = createMockClient(outputWithTooManyQuestions);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = {
        problemDescription: 'I have a problem with a product I bought recently. It is not working properly and I need help resolving this issue.',
      };

      const result = await agent.execute(input);

      // Schema rejects > 3 follow-up questions
      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
    });

    it('should mark extraction complete after follow-up responses are exhausted', async () => {
      const outputAfterFollowUps = JSON.stringify({
        complainantName: 'Rahul Sharma',
        respondentName: 'not provided',
        incidentDates: 'not provided',
        grievanceSummary: 'Product defect',
        reliefSought: 'Refund',
        originalLanguage: 'en',
        followUpQuestions: ['Who is the seller?'],
        extractionComplete: false,
      });

      const client = createMockClient(outputAfterFollowUps);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = {
        problemDescription: 'I have a problem with a product I bought recently. It is not working properly and I need help resolving this issue.',
        followUpResponses: [
          'My name is Rahul Sharma',
          'I want a refund',
          'The product is defective',
        ],
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      // After 3 follow-up responses, extraction should be marked complete
      expect(result.output!.extractionComplete).toBe(true);
      expect(result.output!.followUpQuestions).toBeUndefined();
    });
  });

  describe('Output Validation', () => {
    it('should validate correct output successfully', () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);

      const output = agent.validateOutput(JSON.parse(validArzdarOutput));

      expect(output).not.toBeNull();
      expect(output!.complainantName).toBe('Rahul Sharma');
    });

    it('should reject output missing required fields', () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);

      const invalidOutput = {
        complainantName: 'Test',
        // missing other required fields
      };

      const output = agent.validateOutput(invalidOutput);

      expect(output).toBeNull();
    });

    it('should reject output with invalid originalLanguage', () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);

      const invalidOutput = {
        complainantName: 'Test',
        respondentName: 'Test Corp',
        incidentDates: ['2024-01-01'],
        grievanceSummary: 'Test grievance',
        reliefSought: 'Refund',
        originalLanguage: 'fr', // invalid - only 'en' or 'hi' allowed
        extractionComplete: true,
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
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

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
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('llm_timeout');
    });

    it('should handle unexpected errors', async () => {
      const client = createErrorClient(new Error('Network failure'));
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

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
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
      expect(result.error?.description).toContain('empty response');
    });

    it('should handle malformed JSON response', async () => {
      const client = createMockClient('This is not JSON at all, just plain text without any braces');
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON wrapped in markdown code blocks', async () => {
      const wrappedOutput = '```json\n' + validArzdarOutput + '\n```';
      const client = createMockClient(wrappedOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complainantName).toBe('Rahul Sharma');
    });

    it('should parse JSON embedded in text', async () => {
      const embeddedOutput = 'Here is the extraction result:\n' + validArzdarOutput + '\nDone.';
      const client = createMockClient(embeddedOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complainantName).toBe('Rahul Sharma');
    });
  });

  describe('Duration Tracking', () => {
    it('should record execution duration', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: validDescription };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record duration even on failure', async () => {
      const client = createMockClient(validArzdarOutput);
      const agent = new ArzdarAgent(client);
      const input: ArzdarInput = { problemDescription: 'too short' };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
