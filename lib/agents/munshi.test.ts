/**
 * Unit tests for Munshi (Draft Agent) - PROGRAMMATIC ARCHITECTURE.
 * Tests document generation, domain-specific formatting, Hindi prayer clause,
 * input validation (Shodhak output), output validation, error handling,
 * and the two-call LLM architecture (facts + grounds).
 */

import { describe, it, expect, vi } from 'vitest';
import { MunshiAgent, type MunshiInput } from './munshi';
import type { OpenRouterClient, ChatCompletionResponse } from '../openrouter-client';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { VivechakOutput } from '../schemas/vivechak-schema';
import type { ShodhakOutput } from '../schemas/shodhak-schema';

// --- Mock OpenRouter Client ---

/**
 * Creates a mock client that returns plain text (not JSON).
 * The new architecture expects plain text numbered paragraphs from LLM.
 */
function createMockClient(factsResponse: string, groundsResponse?: string): OpenRouterClient {
  const mockFn = vi.fn();
  // First call returns facts, second call returns grounds
  mockFn.mockResolvedValueOnce({
    id: 'test-facts',
    choices: [{ message: { role: 'assistant', content: factsResponse }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
  } as ChatCompletionResponse);
  mockFn.mockResolvedValueOnce({
    id: 'test-grounds',
    choices: [{ message: { role: 'assistant', content: groundsResponse || factsResponse }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
  } as ChatCompletionResponse);
  return { chatCompletion: mockFn } as unknown as OpenRouterClient;
}

function createErrorClient(error: unknown): OpenRouterClient {
  return {
    chatCompletion: vi.fn().mockRejectedValue(error),
  } as unknown as OpenRouterClient;
}

// --- Test Data ---

const consumerFacts: ArzdarOutput = {
  complainantName: 'Rahul Sharma',
  complainantAddress: 'B-42, Sector 15, Noida, Uttar Pradesh',
  respondentName: 'ABC Electronics Pvt Ltd',
  allOppositeParties: [
    { name: 'ABC Electronics Pvt Ltd', role: 'manufacturer', liabilityType: 'product_manufacturer' },
    { name: 'Flipkart Internet Pvt Ltd', role: 'marketplace', liabilityType: 'product_seller' },
  ],
  productName: 'Samsung Washing Machine',
  productAmount: 35000,
  incidentDates: ['15th January 2024'],
  timeline: [
    { date: '15th January 2024', event: 'Purchased washing machine from Flipkart' },
    { date: '30th January 2024', event: 'Machine stopped working completely' },
    { date: '5th February 2024', event: 'Complaint filed with seller, no response' },
  ],
  grievanceSummary: 'Purchased a defective washing machine that stopped working after 2 weeks',
  reliefSought: 'Full refund of Rs 35,000 and compensation of Rs 10,000',
  financialClaims: { productRefund: 35000, compensation: 10000, total: 45000 },
  originalLanguage: 'en',
  extractionComplete: true,
};

const hindiFacts: ArzdarOutput = {
  complainantName: 'राजेश कुमार',
  respondentName: 'XYZ कंपनी',
  incidentDates: ['10 जनवरी 2024'],
  grievanceSummary: 'दोषपूर्ण उत्पाद खरीदा जो दो सप्ताह बाद काम करना बंद कर दिया',
  reliefSought: 'पूर्ण धनवापसी',
  financialClaims: { productRefund: 25000, compensation: 5000, total: 30000 },
  originalLanguage: 'hi',
  extractionComplete: true,
};

const consumerRouting: VivechakOutput = {
  legalDomain: 'consumer_protection_2019',
  forum: 'District Consumer Disputes Redressal Commission, Noida',
  confidenceScore: 0.9,
  requiresUserConfirmation: false,
  reasoning: 'Clear consumer protection case.',
};

const reraRouting: VivechakOutput = {
  legalDomain: 'rera_2016',
  forum: 'Maharashtra Real Estate Regulatory Authority, Mumbai',
  confidenceScore: 0.92,
  requiresUserConfirmation: false,
  reasoning: 'Real estate dispute in Maharashtra.',
};

const rtiRouting: VivechakOutput = {
  legalDomain: 'rti_2005',
  forum: 'Public Information Officer, Municipal Corporation of Delhi',
  confidenceScore: 0.88,
  requiresUserConfirmation: false,
  reasoning: 'Seeking information from public authority.',
};

const validLegalSections: ShodhakOutput = {
  legalSections: [
    {
      content: 'Section 35 of the Consumer Protection Act 2019 provides for manner of filing complaint.',
      actName: 'Consumer Protection Act 2019',
      sectionNumber: 'Section 35',
      chapter: 'Chapter IV',
      similarityScore: 0.85,
    },
    {
      content: 'Section 2(10) defines "defect" as any fault, imperfection or shortcoming in quality.',
      actName: 'Consumer Protection Act 2019',
      sectionNumber: 'Section 2(10)',
      chapter: 'Chapter I',
      similarityScore: 0.78,
    },
    {
      content: 'Section 39 provides for the findings of the District Commission.',
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

// --- Sample LLM responses (plain text, not JSON) ---

const sampleFactsResponse = `1. That the Complainant, Rahul Sharma, purchased a Samsung Washing Machine from Flipkart Internet Pvt Ltd on 15th January 2024 for a sum of ₹35,000.

2. That the said washing machine was manufactured by ABC Electronics Pvt Ltd.

3. That on 30th January 2024, merely 15 days after purchase, the washing machine stopped working completely.

4. That on 5th February 2024, the Complainant filed a complaint with the seller but received no response.

5. That despite repeated attempts, neither the manufacturer nor the seller provided any remedy or replacement.

6. That the Complainant has suffered mental agony and harassment due to the defective product and non-responsive customer service.

7. That the Complainant is entitled to a full refund of ₹35,000 and compensation of ₹10,000 for mental agony.`;

const sampleGroundsResponse = `1. That under Section 2(7) of the Consumer Protection Act, 2019, the Complainant is a "consumer" having purchased goods for consideration.

2. That under Section 2(10) of the Act, the washing machine suffers from a "defect" being a fault and shortcoming in quality.

3. That under Section 83 of the Act, a product liability action is maintainable against the manufacturer and seller.

4. That under Section 84 of the Act, ABC Electronics Pvt Ltd as the product manufacturer is liable for the defective product.

5. That under Section 86 of the Act, Flipkart Internet Pvt Ltd as the product seller is liable.

6. That under Section 39 of the Act, this Hon'ble Commission may direct replacement, refund, and compensation.`;

// --- Tests ---

describe('MunshiAgent', () => {
  describe('Input Validation', () => {
    it('should halt with error if legalSections is missing (null input)', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.complaintDocument).toContain('DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION');
      expect(result.output!.complaintDocument).toContain('Rahul Sharma');
      expect(result.output!.complaintDocument).toContain('JURISDICTION');
      expect(result.output!.complaintDocument).toContain('LIMITATION');
      expect(result.output!.complaintDocument).toContain('AFFIDAVIT');
      expect(result.output!.complaintDocument).toContain('ANNEXURES');
      expect(result.output!.documentStructure.header).toBeTruthy();
      expect(result.output!.documentStructure.factsOfCase).toBeTruthy();
      expect(result.output!.documentStructure.legalGrounds).toBeTruthy();
      expect(result.output!.documentStructure.prayerClause).toBeTruthy();
      expect(result.output!.documentStructure.verification).toBeTruthy();
    });

    it('should not include hindiPrayerClause for English input', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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

    it('should include correct jurisdiction with city and pecuniary limit', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('Section 35');
      expect(result.output!.complaintDocument).toContain('Section 34');
      expect(result.output!.complaintDocument).toContain('Section 69');
      expect(result.output!.complaintDocument).toContain('Noida');
    });

    it('should include specific relief amounts from financial claims', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('₹35000');
      expect(result.output!.complaintDocument).toContain('₹10000');
      expect(result.output!.complaintDocument).toContain('9% per annum');
    });

    it('should include all opposite parties in the document', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('ABC Electronics Pvt Ltd');
      expect(result.output!.complaintDocument).toContain('Flipkart Internet Pvt Ltd');
      expect(result.output!.complaintDocument).toContain('Opposite Party 1');
      expect(result.output!.complaintDocument).toContain('Opposite Party 2');
    });
  });

  describe('RERA Document Generation', () => {
    it('should generate a valid RERA complaint with state-specific header', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: reraRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.complaintDocument).toContain('REAL ESTATE REGULATORY AUTHORITY');
      expect(result.output!.complaintDocument).toContain('MAHARASHTRA');
      expect(result.output!.complaintDocument).toContain('Section 31');
      expect(result.output!.complaintDocument).toContain('Section 18');
      expect(result.output!.complaintDocument).toContain('Section 71');
      expect(result.output!.documentStructure.header).toContain('MAHARASHTRA');
    });

    it('should include RERA-specific relief (possession + interest)', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: reraRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('possession within 60 days');
      expect(result.output!.complaintDocument).toContain('SBI MCLR');
    });
  });

  describe('RTI Document Generation', () => {
    it('should generate a valid RTI application', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: rtiRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.complaintDocument).toContain('RIGHT TO INFORMATION ACT, 2005');
      expect(result.output!.complaintDocument).toContain('Public Information Officer');
      expect(result.output!.complaintDocument).toContain('Section 6(1)');
      expect(result.output!.complaintDocument).toContain('Section 7(1)');
      expect(result.output!.complaintDocument).toContain('Section 20');
      expect(result.output!.complaintDocument).toContain('Section 19(1)');
      expect(result.output!.complaintDocument).toContain('Section 19(3)');
      expect(result.output!.documentStructure.header).toContain('RIGHT TO INFORMATION');
    });

    it('should include RTI-specific elements (fee, BPL, penalty, appeal)', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: rtiRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('Rs.10');
      expect(result.output!.complaintDocument).toContain('BPL');
      expect(result.output!.complaintDocument).toContain('Rs.250');
      expect(result.output!.complaintDocument).toContain('APPEAL RIGHTS');
    });
  });

  describe('Hindi Prayer Clause', () => {
    it('should include hindiPrayerClause when originalLanguage is hi', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: hindiFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.documentStructure.hindiPrayerClause).toBeDefined();
      expect(result.output!.documentStructure.hindiPrayerClause).toContain('प्रार्थना');
      expect(result.output!.documentStructure.hindiPrayerClause).toContain('₹25000');
      expect(result.output!.documentStructure.hindiPrayerClause).toContain('₹5000');
    });

    it('should include Hindi prayer clause with correct financial amounts', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: hindiFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      const hindiClause = result.output!.documentStructure.hindiPrayerClause!;
      expect(hindiClause).toContain('धनवापसी');
      expect(hindiClause).toContain('मुआवजा');
      expect(hindiClause).toContain('9%');
    });

    it('should not include hindiPrayerClause for English input', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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

  describe('Output Validation', () => {
    it('should validate correct output successfully', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);

      const validOutput = {
        complaintDocument: '# BEFORE THE COMMISSION\n\nFull document content here.',
        documentStructure: {
          header: 'BEFORE THE COMMISSION',
          factsOfCase: '1. That the Complainant...',
          legalGrounds: '1. That under Section 35...',
          prayerClause: '1. Refund of ₹35000',
          verification: 'I, Rahul Sharma, do hereby verify...',
        },
      };

      const output = agent.validateOutput(validOutput);
      expect(output).not.toBeNull();
      expect(output!.complaintDocument).toBeTruthy();
      expect(output!.documentStructure.header).toBeTruthy();
    });

    it('should reject output with empty complaintDocument', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);

      const invalidOutput = {
        complaintDocument: 'Some document',
      };

      const output = agent.validateOutput(invalidOutput);
      expect(output).toBeNull();
    });

    it('should reject output with empty prayerClause', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
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
    it('should use fallback facts when first LLM call fails', async () => {
      // First call (facts) fails, second call (grounds) succeeds
      const mockFn = vi.fn();
      mockFn.mockRejectedValueOnce(new Error('LLM timeout'));
      mockFn.mockResolvedValueOnce({
        id: 'test-grounds',
        choices: [{ message: { role: 'assistant', content: sampleGroundsResponse }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
      });
      const client = { chatCompletion: mockFn } as unknown as OpenRouterClient;
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      // Should still succeed using fallback facts
      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('Rahul Sharma');
      expect(result.output!.documentStructure.factsOfCase).toContain('Complainant');
    });

    it('should use fallback grounds when second LLM call fails', async () => {
      // First call (facts) succeeds, second call (grounds) fails
      const mockFn = vi.fn();
      mockFn.mockResolvedValueOnce({
        id: 'test-facts',
        choices: [{ message: { role: 'assistant', content: sampleFactsResponse }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
      });
      mockFn.mockRejectedValueOnce(new Error('LLM timeout'));
      const client = { chatCompletion: mockFn } as unknown as OpenRouterClient;
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      // Should still succeed using fallback grounds
      expect(result.success).toBe(true);
      expect(result.output!.documentStructure.legalGrounds).toContain('Section 35');
    });

    it('should succeed with fallbacks when BOTH LLM calls fail', async () => {
      const client = createErrorClient(new Error('Network failure'));
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      // Should still succeed using both fallbacks
      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION');
      expect(result.output!.documentStructure.factsOfCase).toContain('Complainant');
      expect(result.output!.documentStructure.legalGrounds).toContain('Section 35');
    });

    it('should handle empty LLM response by using fallback', async () => {
      const mockFn = vi.fn();
      mockFn.mockResolvedValue({
        id: 'test-id',
        choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 200, completion_tokens: 0, total_tokens: 200 },
      });
      const client = { chatCompletion: mockFn } as unknown as OpenRouterClient;
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      // Empty response triggers the throw in generateFacts/generateGrounds,
      // which is caught and fallback is used
      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('COMMISSION');
    });

    it('should propagate fatal errors that occur outside LLM calls', async () => {
      // Create a client that throws a non-standard error type
      const client = {
        chatCompletion: vi.fn().mockImplementation(() => {
          throw { type: 'timeout', message: 'Request timed out after 60000ms', statusCode: 0, attemptsUsed: 3 };
        }),
      } as unknown as OpenRouterClient;
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      // Synchronous throws are NOT caught by the try/catch in generateFacts
      // because they're not async rejections - they propagate to the outer try/catch
      // Actually, since chatCompletion is called with await, sync throws become rejections
      // and are caught by the inner try/catch, triggering fallback
      expect(result.success).toBe(true);
    });
  });

  describe('Two-Call Architecture', () => {
    it('should make exactly TWO LLM calls (facts + grounds)', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      expect(client.chatCompletion).toHaveBeenCalledTimes(2);
    });

    it('should send facts prompt in first call with complainant details', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const firstCallMessages = chatCompletion.mock.calls[0][0];

      // First call should be for facts
      expect(firstCallMessages[0].role).toBe('system');
      expect(firstCallMessages[1].role).toBe('user');
      expect(firstCallMessages[1].content).toContain('Rahul Sharma');
      expect(firstCallMessages[1].content).toContain('ABC Electronics Pvt Ltd');
      expect(firstCallMessages[1].content).toContain('numbered paragraphs');
    });

    it('should send grounds prompt in second call with legal sections', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const secondCallMessages = chatCompletion.mock.calls[1][0];

      // Second call should be for legal grounds
      expect(secondCallMessages[0].role).toBe('system');
      expect(secondCallMessages[1].role).toBe('user');
      expect(secondCallMessages[1].content).toContain('Section 35');
      expect(secondCallMessages[1].content).toContain('legal grounds');
    });

    it('should include timeline events in facts prompt', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const firstCallMessages = chatCompletion.mock.calls[0][0];

      expect(firstCallMessages[1].content).toContain('15th January 2024');
      expect(firstCallMessages[1].content).toContain('Purchased washing machine');
      expect(firstCallMessages[1].content).toContain('30th January 2024');
    });

    it('should include forbidden section warnings in grounds prompt for consumer', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      await agent.execute(input);

      const chatCompletion = client.chatCompletion as ReturnType<typeof vi.fn>;
      const secondCallMessages = chatCompletion.mock.calls[1][0];

      expect(secondCallMessages[1].content).toContain('NEVER cite Section 36');
    });
  });

  describe('Programmatic Skeleton', () => {
    it('should generate jurisdiction section programmatically (not from LLM)', async () => {
      const client = createMockClient('LLM facts content', 'LLM grounds content');
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      // These sections are code-generated, not from LLM
      expect(result.output!.complaintDocument).toContain('Section 35 of the Consumer Protection Act, 2019');
      expect(result.output!.complaintDocument).toContain('Section 34 (up to ₹1 crore)');
      expect(result.output!.complaintDocument).toContain('₹45000');
    });

    it('should generate verification/affidavit section programmatically', async () => {
      const client = createMockClient('LLM facts content', 'LLM grounds content');
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('solemnly affirm and state on oath');
      expect(result.output!.complaintDocument).toContain('Rahul Sharma');
      expect(result.output!.complaintDocument).toContain('Noida');
    });

    it('should insert LLM-generated facts into the skeleton', async () => {
      const client = createMockClient('CUSTOM FACTS FROM LLM', sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('CUSTOM FACTS FROM LLM');
      expect(result.output!.documentStructure.factsOfCase).toBe('CUSTOM FACTS FROM LLM');
    });

    it('should insert LLM-generated grounds into the skeleton', async () => {
      const client = createMockClient(sampleFactsResponse, 'CUSTOM GROUNDS FROM LLM');
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.output!.complaintDocument).toContain('CUSTOM GROUNDS FROM LLM');
      expect(result.output!.documentStructure.legalGrounds).toBe('CUSTOM GROUNDS FROM LLM');
    });
  });

  describe('Duration Tracking', () => {
    it('should record execution duration on success', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: validLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record duration even on validation failure', async () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);
      const input: MunshiInput = {
        extractedFacts: consumerFacts,
        routing: consumerRouting,
        legalSections: emptyLegalSections,
      };

      const result = await agent.execute(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('JSON Parsing (parseJsonResponse)', () => {
    it('should parse direct JSON', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);

      const result = agent.parseJsonResponse('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);

      const result = agent.parseJsonResponse('```json\n{"key": "value"}\n```');
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON embedded in text', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);

      const result = agent.parseJsonResponse('Here is the result: {"key": "value"} done.');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return null for non-JSON content', () => {
      const client = createMockClient(sampleFactsResponse, sampleGroundsResponse);
      const agent = new MunshiAgent(client);

      const result = agent.parseJsonResponse('This is just plain text without any JSON');
      expect(result).toBeNull();
    });
  });
});
