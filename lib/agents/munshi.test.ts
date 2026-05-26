/**
 * Unit tests for Munshi (Draft Agent).
 * Tests document generation, domain-specific formatting, Hindi prayer clause,
 * input validation (Shodhak output), output validation, and error handling.
 */

import { describe, it, expect, vi } from 'vitest';
import { MunshiAgent, type MunshiInput } from './munshi';
import type { OpenRouterClient, ChatCompletionResponse } from '../openrouter-client';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { VivechakOutput } from '../schemas/vivechak-schema';
import type { ShodhakOutput } from '../schemas/shodhak-schema';

// --- Mock OpenRouter Client ---

function createMockClient(responseContent: string): OpenRouterClient {
  return {
    chatCompletion: vi.fn().mockResolvedValue({
      id: 'test-id',
      choices: [{ message: { role: 'assistant', content: responseContent }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 200, completion_tokens: 500, total_tokens: 700 },
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
  reliefSought: 'Full refund of Rs 35,000 and compensation of Rs 10,000',
  originalLanguage: 'en',
  extractionComplete: true,
};

const hindiFacts: ArzdarOutput = {
  complainantName: 'राजेश कुमार',
  respondentName: 'XYZ कंपनी',
  incidentDates: ['10 जनवरी 2024'],
  grievanceSummary: 'दोषपूर्ण उत्पाद खरीदा जो दो सप्ताह बाद काम करना बंद कर दिया',
  reliefSought: 'पूर्ण धनवापसी',
  originalLanguage: 'hi',
  extractionComplete: true,
};

const consumerRouting: VivechakOutput = {
  legalDomain: 'consumer_protection_2019',
  forum: 'District Consumer Disputes Redressal Forum',
  confidenceScore: 0.9,
  requiresUserConfirmation: false,
  reasoning: 'Clear consumer protection case.',
};

const reraRouting: VivechakOutput = {
  legalDomain: 'rera_2016',
  forum: 'RERA Authority of Maharashtra',
  confidenceScore: 0.92,
  requiresUserConfirmation: false,
  reasoning: 'Real estate dispute in Maharashtra.',
};

const rtiRouting: VivechakOutput = {
  legalDomain: 'rti_2005',
  forum: 'Public Information Officer of Municipal Corporation of Delhi',
  confidenceScore: 0.88,
  requiresUserConfirmation: false,
  reasoning: 'Seeking information from public authority.',
};

const validLegalSections: ShodhakOutput = {
  legalSections: [
    {
      content: 'Section 35 of the Consumer Protection Act 2019 provides for jurisdiction of District Forum.',
      actName: 'Consumer Protection Act 2019',
      sectionNumber: 'Section 35',
      chapter: 'Chapter IV',
      similarityScore: 0.85,
    },
    {
      content: 'Section 2(6) defines "complaint" under the Consumer Protection Act 2019.',
      actName: 'Consumer Protection Act 2019',
      sectionNumber: 'Section 2(6)',
      chapter: 'Chapter I',
      similarityScore: 0.78,
    },
    {
      content: 'Section 39 provides for the procedure on admission of complaint.',
      actName: 'Consumer Protection Act 2019',
      sectionNumber: 'Section 39',
      chapter: 'Chapter IV',
      similarityScore: 0.72,
    },
  ],
  searchMetadata: {
    thresholdUsed: 0.7,
    totalResultsFound: 3,
  },
};

const emptyLegalSections: ShodhakOutput = {
  legalSections: [],
  searchMetadata: {
    thresholdUsed: 0.5,
    totalResultsFound: 0,
  },
};

// --- Valid Outputs ---

const validConsumerOutput = JSON.stringify({
  complaintDocument: '# BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL FORUM\n\n## Complainant: Rahul Sharma\n## Opposite Party: ABC Electronics Pvt Ltd\n\n### Facts of the Case\n\n1. The complainant purchased a washing machine from the opposite party.\n2. The machine stopped working after 2 weeks.\n\n### Legal Grounds\n\nUnder Section 35 of the Consumer Protection Act 2019...\nUnder Section 2(6) of the Consumer Protection Act 2019...\n\n### Prayer\n\nThe complainant prays for full refund of Rs 35,000 and compensation of Rs 10,000.\n\n### Verification\n\nI, Rahul Sharma, do hereby verify that the contents of this complaint are true.',
  documentStructure: {
    header: 'BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL FORUM\nComplainant: Rahul Sharma\nOpposite Party: ABC Electronics Pvt Ltd\nDate: [Date]\nCase No: [To be assigned]',
    factsOfCase: '1. The complainant purchased a washing machine from the opposite party on 15th January 2024.\n2. The machine stopped working after 2 weeks of purchase.\n3. Despite repeated complaints, the opposite party failed to provide remedy.',
    legalGrounds: 'Under Section 35 of the Consumer Protection Act 2019, the District Forum has jurisdiction.\nUnder Section 2(6), this constitutes a valid complaint.\nUnder Section 39, the procedure for admission is followed.',
    prayerClause: 'The complainant prays for:\n1. Full refund of Rs 35,000\n2. Compensation of Rs 10,000 for mental agony\n3. Cost of litigation',
    verification: 'I, Rahul Sharma, do hereby verify that the contents of this complaint are true and correct to the best of my knowledge and belief.',
  },
});

const validHindiOutput = JSON.stringify({
  complaintDocument: '# BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL FORUM\n\n## Complainant: राजेश कुमार\n## Opposite Party: XYZ कंपनी\n\n...',
  documentStructure: {
    header: 'BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL FORUM\nComplainant: राजेश कुमार\nOpposite Party: XYZ कंपनी',
    factsOfCase: '1. The complainant purchased a defective product.\n2. The product stopped working after two weeks.',
    legalGrounds: 'Under Section 35 of the Consumer Protection Act 2019...',
    prayerClause: 'The complainant prays for full refund.',
    verification: 'I, राजेश कुमार, do hereby verify...',
    hindiPrayerClause: 'प्रार्थना: प्रार्थी विनम्रतापूर्वक अनुरोध करता है कि पूर्ण धनवापसी प्रदान की जाए।',
  },
});

const validReraOutput = JSON.stringify({
  complaintDocument: '# COMPLAINT BEFORE RERA AUTHORITY OF MAHARASHTRA\n\n## Project Details\n...',
  documentStructure: {
    header: 'COMPLAINT BEFORE RERA AUTHORITY OF MAHARASHTRA\nComplainant: Rahul Sharma\nPromoter: ABC Electronics Pvt Ltd\nRERA Registration No: [To be filled]',
    factsOfCase: '1. The complainant booked a flat.\n2. Possession was delayed.',
    legalGrounds: 'Under Section 35 of RERA Act 2016...',
    prayerClause: 'The complainant prays for possession or refund with interest.',
    verification: 'I, Rahul Sharma, do hereby verify...',
  },
});

const validRtiOutput = JSON.stringify({
  complaintDocument: '# APPLICATION UNDER RIGHT TO INFORMATION ACT, 2005\n\nTo: Public Information Officer...',
  documentStructure: {
    header: 'APPLICATION UNDER RIGHT TO INFORMATION ACT, 2005\nTo: Public Information Officer of Municipal Corporation of Delhi\nFrom: Rahul Sharma\nDate: [Date]',
    factsOfCase: '1. The applicant seeks information regarding road construction budget.',
    legalGrounds: 'Under Section 6 of the RTI Act 2005, every citizen has the right to information.',
    prayerClause: 'The applicant requests the following information:\n1. Budget allocation documents\n2. Expenditure details',
    verification: 'I, Rahul Sharma, declare that I am a citizen of India.',
  },
});

// --- Tests ---

describe('MunshiAgent', () => {
  describe('Input Validation', () => {
    it('should halt with error if legalSections is missing (null input)', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: null as unknown as ShodhakOutput,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('dependency_failure');
      expect(result.error?.description).toContain('missing');
    });

    it('should halt with error if legalSections array is empty', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: emptyLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('dependency_failure');
      expect(result.error?.description).toContain('no legal sections');
    });

    it('should halt with error if legalSections property is undefined', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: undefined as unknown as ShodhakOutput,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('dependency_failure');
    });

    it('should not call LLM when input validation fails', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: emptyLegalSections,
      };

      await agent.execute(input);

      expect(client.chatCompletion).not.toHaveBeenCalled();
    });
  });

  describe('Consumer Protection Document Generation', () => {
    it('should generate a valid consumer protection complaint', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.complaintDocument).toBeTruthy();
      expect(result.output!.documentStructure.header).toBeTruthy();
      expect(result.output!.documentStructure.factsOfCase).toBeTruthy();
      expect(result.output!.documentStructure.legalGrounds).toBeTruthy();
      expect(result.output!.documentStructure.prayerClause).toBeTruthy();
      expect(result.output!.documentStructure.verification).toBeTruthy();
    });

    it('should not include hindiPrayerClause for English input', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.documentStructure.hindiPrayerClause).toBeUndefined();
    });
  });

  describe('RERA Document Generation', () => {
    it('should generate a valid RERA complaint', async () => {
      const client = createMockClient(validReraOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: reraRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.documentStructure.header).toBeTruthy();
      expect(result.output!.documentStructure.factsOfCase).toBeTruthy();
      expect(result.output!.documentStructure.legalGrounds).toBeTruthy();
      expect(result.output!.documentStructure.prayerClause).toBeTruthy();
      expect(result.output!.documentStructure.verification).toBeTruthy();
    });
  });

  describe('RTI Document Generation', () => {
    it('should generate a valid RTI application', async () => {
      const client = createMockClient(validRtiOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: rtiRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.documentStructure.header).toBeTruthy();
      expect(result.output!.documentStructure.prayerClause).toBeTruthy();
    });
  });

  describe('Hindi Prayer Clause', () => {
    it('should include hindiPrayerClause when originalLanguage is hi', async () => {
      const client = createMockClient(validHindiOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: hindiFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.documentStructure.hindiPrayerClause).toBeDefined();
      expect(result.output!.documentStructure.hindiPrayerClause!.length).toBeGreaterThan(0);
    });

    it('should add default Hindi prayer clause if LLM omits it for Hindi input', async () => {
      // LLM returns output without hindiPrayerClause for Hindi input
      const outputWithoutHindi = JSON.stringify({
        complaintDocument: '# Complaint\n\nContent...',
        documentStructure: {
          header: 'Header content',
          factsOfCase: 'Facts content',
          legalGrounds: 'Legal grounds content',
          prayerClause: 'Prayer clause content',
          verification: 'Verification content',
        },
      });

      const client = createMockClient(outputWithoutHindi);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: hindiFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.documentStructure.hindiPrayerClause).toBeDefined();
      expect(result.output!.documentStructure.hindiPrayerClause!.length).toBeGreaterThan(0);
    });

    it('should remove hindiPrayerClause if LLM includes it for English input', async () => {
      // LLM incorrectly includes hindiPrayerClause for English input
      const outputWithHindi = JSON.stringify({
        complaintDocument: '# Complaint\n\nContent...',
        documentStructure: {
          header: 'Header content',
          factsOfCase: 'Facts content',
          legalGrounds: 'Legal grounds content',
          prayerClause: 'Prayer clause content',
          verification: 'Verification content',
          hindiPrayerClause: 'Some Hindi text that should be removed',
        },
      });

      const client = createMockClient(outputWithHindi);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts, // English
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.documentStructure.hindiPrayerClause).toBeUndefined();
    });
  });

  describe('Output Validation', () => {
    it('should validate correct output successfully', () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);

      const output = agent.validateOutput(JSON.parse(validConsumerOutput));

      expect(output).not.toBeNull();
      expect(output!.complaintDocument).toBeTruthy();
      expect(output!.documentStructure.header).toBeTruthy();
    });

    it('should reject output with empty complaintDocument', () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);

      const invalidOutput = {
        complaintDocument: '',
        documentStructure: {
          header: 'Header',
          factsOfCase: 'Facts',
          legalGrounds: 'Grounds',
          prayerClause: 'Prayer',
          verification: 'Verification',
        },
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with empty header', () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);

      const invalidOutput = {
        complaintDocument: 'Some document',
        documentStructure: {
          header: '',
          factsOfCase: 'Facts',
          legalGrounds: 'Grounds',
          prayerClause: 'Prayer',
          verification: 'Verification',
        },
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output missing documentStructure', () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);

      const invalidOutput = {
        complaintDocument: 'Some document',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with empty prayerClause', () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);

      const invalidOutput = {
        complaintDocument: 'Some document',
        documentStructure: {
          header: 'Header',
          factsOfCase: 'Facts',
          legalGrounds: 'Grounds',
          prayerClause: '',
          verification: 'Verification',
        },
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
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

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
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('llm_timeout');
    });

    it('should handle unexpected errors', async () => {
      const client = createErrorClient(new Error('Network failure'));
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

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
          usage: { prompt_tokens: 200, completion_tokens: 0, total_tokens: 200 },
        }),
      } as unknown as OpenRouterClient;
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('schema_validation');
      expect(result.error?.description).toContain('empty response');
    });

    it('should handle malformed JSON response', async () => {
      const client = createMockClient('This is not JSON at all, just plain text without any braces');
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

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
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('unhandled_exception');
      expect(result.error?.description).toContain('Bad request');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON wrapped in markdown code blocks', async () => {
      const wrappedOutput = '```json\n' + validConsumerOutput + '\n```';
      const client = createMockClient(wrappedOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toBeTruthy();
    });

    it('should parse JSON embedded in text', async () => {
      const embeddedOutput = 'Here is the document:\n' + validConsumerOutput + '\nDone.';
      const client = createMockClient(embeddedOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toBeTruthy();
    });
  });

  describe('Duration Tracking', () => {
    it('should record execution duration on success', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record duration even on failure', async () => {
      const client = createErrorClient(new Error('fail'));
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Message Building', () => {
    it('should include all extracted facts in the user message', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      // System message should be the system prompt
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Munshi');

      // User message should contain the facts
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('Rahul Sharma');
      expect(messages[1].content).toContain('ABC Electronics Pvt Ltd');
      expect(messages[1].content).toContain('District Consumer Disputes Redressal Forum');
    });

    it('should include legal sections in the user message', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      expect(messages[1].content).toContain('Section 35');
      expect(messages[1].content).toContain('Consumer Protection Act 2019');
      expect(messages[1].content).toContain('Chapter IV');
    });

    it('should include domain-specific format instruction for consumer protection', async () => {
      const client = createMockClient(validConsumerOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      expect(messages[1].content).toContain('CDRC');
    });

    it('should include domain-specific format instruction for RERA', async () => {
      const client = createMockClient(validReraOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: reraRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      expect(messages[1].content).toContain('RERA Authority');
    });

    it('should include domain-specific format instruction for RTI', async () => {
      const client = createMockClient(validRtiOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: rtiRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      expect(messages[1].content).toContain('Public Information Officer');
    });

    it('should include Hindi prayer clause instruction for Hindi input', async () => {
      const client = createMockClient(validHindiOutput);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: hindiFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const messages = chatCompletion.mock.calls[0][0];

      expect(messages[1].content).toContain('Hindi');
      expect(messages[1].content).toContain('hindiPrayerClause');
    });
  });
});
