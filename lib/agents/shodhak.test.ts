/**
 * Unit tests for Shodhak (Research Agent).
 * Tests adaptive threshold search, result bounds (3-10), sorting by similarity,
 * Knowledge Base integration, output validation, and error handling.
 */

import { describe, it, expect, vi } from 'vitest';
import { ShodhakAgent, type ShodhakInput } from './shodhak';
import type { KnowledgeBaseClient, LegalChunk, VectorSearchResult } from '../knowledge-base';
import type { ArzdarOutput } from '../schemas/arzdar-schema';

// --- Mock Knowledge Base Client ---

function createMockKBClient(
  searchFn: (params: unknown) => Promise<VectorSearchResult>,
  embeddingFn?: (text: string) => Promise<number[]>
): KnowledgeBaseClient {
  return {
    search: vi.fn(searchFn),
    generateEmbedding: embeddingFn
      ? vi.fn(embeddingFn)
      : vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
  } as unknown as KnowledgeBaseClient;
}

// --- Test Data ---

const sampleFacts: ArzdarOutput = {
  complainantName: 'Rahul Sharma',
  respondentName: 'ABC Electronics Pvt Ltd',
  incidentDates: ['15th January 2024'],
  grievanceSummary: 'Purchased a defective washing machine that stopped working after 2 weeks',
  reliefSought: 'Full refund of Rs 35,000',
  originalLanguage: 'en',
  extractionComplete: true,
};

const sampleInput: ShodhakInput = {
  extractedFacts: sampleFacts,
  legalDomain: 'consumer_protection_2019',
};

function createChunk(id: number, similarity: number): LegalChunk {
  return {
    id: `chunk-${id}`,
    content: `Section ${id} content about consumer protection rights and remedies.`,
    embedding: [],
    metadata: {
      actName: 'Consumer Protection Act 2019',
      sectionNumber: `Section ${id}`,
      chapter: `Chapter ${Math.ceil(id / 3)}`,
    },
    similarityScore: similarity,
  };
}

function createChunks(count: number, startSimilarity: number, step: number = 0.02): LegalChunk[] {
  return Array.from({ length: count }, (_, i) =>
    createChunk(i + 1, Math.round((startSimilarity - i * step) * 100) / 100)
  );
}

// --- Tests ---

describe('ShodhakAgent', () => {
  describe('Successful Search', () => {
    it('should return results when initial threshold (0.7) yields 3+ results', async () => {
      const chunks = createChunks(5, 0.9);
      const kbClient = createMockKBClient(async () => ({
        chunks,
        status: 'success',
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output!.legalSections.length).toBe(5);
      expect(result.output!.searchMetadata.thresholdUsed).toBe(0.7);
    });

    it('should cap results at 10 even if KB returns more', async () => {
      const chunks = createChunks(15, 0.95, 0.01);
      const kbClient = createMockKBClient(async () => ({
        chunks,
        status: 'success',
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.legalSections.length).toBe(10);
    });

    it('should sort results by similarity descending', async () => {
      // Provide chunks in random order
      const chunks = [
        createChunk(1, 0.75),
        createChunk(2, 0.92),
        createChunk(3, 0.81),
        createChunk(4, 0.88),
        createChunk(5, 0.79),
      ];
      const kbClient = createMockKBClient(async () => ({
        chunks,
        status: 'success',
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      const scores = result.output!.legalSections.map((s) => s.similarityScore);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('should include correct metadata in output sections', async () => {
      const chunks = createChunks(3, 0.85);
      const kbClient = createMockKBClient(async () => ({
        chunks,
        status: 'success',
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      const section = result.output!.legalSections[0];
      expect(section.content).toBeTruthy();
      expect(section.actName).toBe('Consumer Protection Act 2019');
      expect(section.sectionNumber).toMatch(/^Section \d+$/);
      expect(section.chapter).toMatch(/^Chapter \d+$/);
      expect(section.similarityScore).toBeGreaterThan(0);
      expect(section.similarityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Adaptive Threshold', () => {
    it('should lower threshold when fewer than 3 results at 0.7', async () => {
      let callCount = 0;
      const kbClient = createMockKBClient(async (params: unknown) => {
        callCount++;
        const p = params as { similarityThreshold: number };
        // Return 2 results at 0.7, 2 at 0.65, 4 at 0.6
        if (p.similarityThreshold >= 0.65) {
          return { chunks: createChunks(2, 0.72), status: 'success' as const };
        }
        return { chunks: createChunks(4, 0.65), status: 'success' as const };
      });
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.searchMetadata.thresholdUsed).toBe(0.6);
      expect(callCount).toBeGreaterThan(1);
    });

    it('should not lower threshold below 0.5', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(1, 0.52),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.searchMetadata.thresholdUsed).toBe(0.5);
    });

    it('should return fewer than 3 results if threshold reaches 0.5 with insufficient matches', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(2, 0.55),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.legalSections.length).toBe(2);
      expect(result.output!.searchMetadata.thresholdUsed).toBe(0.5);
    });

    it('should use threshold 0.7 when first search yields enough results', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(5, 0.85),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.searchMetadata.thresholdUsed).toBe(0.7);
      expect((kbClient.search as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    it('should decrement threshold by exactly 0.05 each step', async () => {
      const thresholds: number[] = [];
      const kbClient = createMockKBClient(async (params: unknown) => {
        const p = params as { similarityThreshold: number };
        thresholds.push(p.similarityThreshold);
        // Only return enough results at 0.55
        if (p.similarityThreshold <= 0.55) {
          return { chunks: createChunks(4, 0.58), status: 'success' as const };
        }
        return { chunks: createChunks(1, 0.72), status: 'success' as const };
      });
      const agent = new ShodhakAgent(kbClient);

      await agent.execute(sampleInput);

      // Should have tried: 0.7, 0.65, 0.6, 0.55
      expect(thresholds).toContain(0.7);
      expect(thresholds).toContain(0.65);
      expect(thresholds).toContain(0.6);
      expect(thresholds).toContain(0.55);
    });
  });

  describe('Knowledge Base Integration', () => {
    it('should pass correct legalDomain to KB search', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(5, 0.85),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      await agent.execute({
        extractedFacts: sampleFacts,
        legalDomain: 'rera_2016',
      });

      const searchCall = (kbClient.search as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(searchCall.legalDomain).toBe('rera_2016');
    });

    it('should generate embedding from extracted facts', async () => {
      const kbClient = createMockKBClient(
        async () => ({ chunks: createChunks(5, 0.85), status: 'success' as const }),
        async (text: string) => {
          expect(text).toContain('defective washing machine');
          return new Array(1536).fill(0.1);
        }
      );
      const agent = new ShodhakAgent(kbClient);

      await agent.execute(sampleInput);

      expect(kbClient.generateEmbedding).toHaveBeenCalledTimes(1);
    });

    it('should include grievanceSummary in query text', async () => {
      let capturedText = '';
      const kbClient = createMockKBClient(
        async () => ({ chunks: createChunks(5, 0.85), status: 'success' as const }),
        async (text: string) => {
          capturedText = text;
          return new Array(1536).fill(0.1);
        }
      );
      const agent = new ShodhakAgent(kbClient);

      await agent.execute(sampleInput);

      expect(capturedText).toContain('defective washing machine');
    });

    it('should include reliefSought in query text', async () => {
      let capturedText = '';
      const kbClient = createMockKBClient(
        async () => ({ chunks: createChunks(5, 0.85), status: 'success' as const }),
        async (text: string) => {
          capturedText = text;
          return new Array(1536).fill(0.1);
        }
      );
      const agent = new ShodhakAgent(kbClient);

      await agent.execute(sampleInput);

      expect(capturedText).toContain('Full refund of Rs 35,000');
    });

    it('should handle "not provided" fields gracefully in query text', async () => {
      let capturedText = '';
      const incompleteFacts: ArzdarOutput = {
        complainantName: 'not provided',
        respondentName: 'not provided',
        incidentDates: 'not provided',
        grievanceSummary: 'Issue with a product',
        reliefSought: 'not provided',
        originalLanguage: 'en',
        extractionComplete: true,
      };
      const kbClient = createMockKBClient(
        async () => ({ chunks: createChunks(5, 0.85), status: 'success' as const }),
        async (text: string) => {
          capturedText = text;
          return new Array(1536).fill(0.1);
        }
      );
      const agent = new ShodhakAgent(kbClient);

      await agent.execute({
        extractedFacts: incompleteFacts,
        legalDomain: 'consumer_protection_2019',
      });

      // Should include grievanceSummary but not "not provided" fields
      expect(capturedText).toContain('Issue with a product');
      expect(capturedText).not.toContain('not provided');
    });
  });

  describe('Error Handling', () => {
    it('should return dependency_failure when KB search returns search_error', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'search_error' as const,
        error: 'Connection timeout',
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('dependency_failure');
      expect(result.error?.description).toContain('Knowledge Base');
    });

    it('should return dependency_failure when embedding generation fails', async () => {
      const kbClient = createMockKBClient(
        async () => ({ chunks: createChunks(5, 0.85), status: 'success' as const }),
        async () => {
          throw new Error('Embedding generation failed: 500 Internal Server Error');
        }
      );
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('dependency_failure');
      expect(result.error?.description).toContain('Embedding');
    });

    it('should return unhandled_exception for unexpected errors', async () => {
      const kbClient = createMockKBClient(
        async () => {
          throw new Error('Unexpected runtime error');
        },
        async () => new Array(1536).fill(0.1)
      );
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('unhandled_exception');
    });

    it('should handle search_error during adaptive threshold lowering', async () => {
      let callCount = 0;
      const kbClient = createMockKBClient(async () => {
        callCount++;
        if (callCount === 1) {
          return { chunks: createChunks(1, 0.72), status: 'success' as const };
        }
        // Second call fails
        return { chunks: [], status: 'search_error' as const, error: 'DB connection lost' };
      });
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('dependency_failure');
    });
  });

  describe('Output Validation', () => {
    it('should validate correct output successfully', () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'no_matches' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const validOutput = {
        legalSections: [
          {
            content: 'Section content',
            actName: 'Consumer Protection Act 2019',
            sectionNumber: 'Section 35',
            chapter: 'Chapter IV',
            similarityScore: 0.85,
          },
        ],
        searchMetadata: {
          thresholdUsed: 0.7,
          totalResultsFound: 1,
        },
      };

      const result = agent.validateOutput(validOutput);
      expect(result).not.toBeNull();
    });

    it('should reject output with empty content', () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'no_matches' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const invalidOutput = {
        legalSections: [
          {
            content: '',
            actName: 'Consumer Protection Act 2019',
            sectionNumber: 'Section 35',
            chapter: 'Chapter IV',
            similarityScore: 0.85,
          },
        ],
        searchMetadata: {
          thresholdUsed: 0.7,
          totalResultsFound: 1,
        },
      };

      const result = agent.validateOutput(invalidOutput);
      expect(result).toBeNull();
    });

    it('should reject output with similarity score > 1', () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'no_matches' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const invalidOutput = {
        legalSections: [
          {
            content: 'Content',
            actName: 'Act',
            sectionNumber: 'Section 1',
            chapter: 'Chapter I',
            similarityScore: 1.5,
          },
        ],
        searchMetadata: {
          thresholdUsed: 0.7,
          totalResultsFound: 1,
        },
      };

      const result = agent.validateOutput(invalidOutput);
      expect(result).toBeNull();
    });

    it('should reject output with similarity score < 0', () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'no_matches' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const invalidOutput = {
        legalSections: [
          {
            content: 'Content',
            actName: 'Act',
            sectionNumber: 'Section 1',
            chapter: 'Chapter I',
            similarityScore: -0.1,
          },
        ],
        searchMetadata: {
          thresholdUsed: 0.7,
          totalResultsFound: 1,
        },
      };

      const result = agent.validateOutput(invalidOutput);
      expect(result).toBeNull();
    });

    it('should reject output with thresholdUsed > 1', () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'no_matches' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const invalidOutput = {
        legalSections: [],
        searchMetadata: {
          thresholdUsed: 1.5,
          totalResultsFound: 0,
        },
      };

      const result = agent.validateOutput(invalidOutput);
      expect(result).toBeNull();
    });

    it('should reject output missing searchMetadata', () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'no_matches' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const invalidOutput = {
        legalSections: [],
      };

      const result = agent.validateOutput(invalidOutput);
      expect(result).toBeNull();
    });
  });

  describe('Duration Tracking', () => {
    it('should record execution duration on success', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(5, 0.85),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should record duration even on failure', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: [],
        status: 'search_error' as const,
        error: 'Failed',
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('No Results Handling', () => {
    it('should handle no_matches status from KB', async () => {
      let callCount = 0;
      const kbClient = createMockKBClient(async () => {
        callCount++;
        return { chunks: [], status: 'no_matches' as const };
      });
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      // Should have tried multiple thresholds
      expect(callCount).toBeGreaterThan(1);
      expect(result.success).toBe(true);
      expect(result.output!.legalSections.length).toBe(0);
      expect(result.output!.searchMetadata.thresholdUsed).toBe(0.5);
    });
  });

  describe('Search Metadata', () => {
    it('should report correct totalResultsFound', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(7, 0.9),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.searchMetadata.totalResultsFound).toBe(7);
    });

    it('should report totalResultsFound capped at 10', async () => {
      const kbClient = createMockKBClient(async () => ({
        chunks: createChunks(15, 0.95, 0.01),
        status: 'success' as const,
      }));
      const agent = new ShodhakAgent(kbClient);

      const result = await agent.execute(sampleInput);

      expect(result.success).toBe(true);
      expect(result.output!.searchMetadata.totalResultsFound).toBe(10);
    });
  });
});
