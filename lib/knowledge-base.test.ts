/**
 * Unit tests for KnowledgeBaseClient.
 * Tests search behavior, retry logic, status distinction, and result sorting.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeBaseClient } from './knowledge-base';
import type { VectorSearchParams } from './knowledge-base';

// Mock Supabase client factory
function createMockSupabase(rpcMock: ReturnType<typeof vi.fn>) {
  return { rpc: rpcMock } as any;
}

describe('KnowledgeBaseClient', () => {
  let rpcMock: ReturnType<typeof vi.fn>;
  let client: KnowledgeBaseClient;

  const defaultParams: VectorSearchParams = {
    queryEmbedding: Array(1536).fill(0.1),
    legalDomain: 'consumer_protection_2019',
    similarityThreshold: 0.7,
    maxResults: 10,
  };

  beforeEach(() => {
    rpcMock = vi.fn();
    client = new KnowledgeBaseClient(createMockSupabase(rpcMock));
    vi.useFakeTimers();
  });

  describe('search', () => {
    it('returns success with chunks sorted by similarity descending', async () => {
      rpcMock.mockResolvedValueOnce({
        data: [
          { id: '1', content: 'Section 35', act_name: 'Consumer Protection Act 2019', section_number: 'Section 35', chapter: 'Chapter IV', similarity: 0.8 },
          { id: '2', content: 'Section 12', act_name: 'Consumer Protection Act 2019', section_number: 'Section 12', chapter: 'Chapter II', similarity: 0.9 },
          { id: '3', content: 'Section 21', act_name: 'Consumer Protection Act 2019', section_number: 'Section 21', chapter: 'Chapter III', similarity: 0.75 },
        ],
        error: null,
      });

      const result = await client.search(defaultParams);

      expect(result.status).toBe('success');
      expect(result.chunks).toHaveLength(3);
      // Verify sorted by similarity descending
      expect(result.chunks[0].similarityScore).toBe(0.9);
      expect(result.chunks[1].similarityScore).toBe(0.8);
      expect(result.chunks[2].similarityScore).toBe(0.75);
    });

    it('maps LegalDomain to correct act_name filter', async () => {
      rpcMock.mockResolvedValueOnce({ data: [], error: null });

      await client.search({
        ...defaultParams,
        legalDomain: 'rera_2016',
      });

      expect(rpcMock).toHaveBeenCalledWith('match_legal_chunks', {
        query_embedding: defaultParams.queryEmbedding,
        match_threshold: 0.7,
        match_count: 10,
        filter_act_name: 'RERA Act 2016',
      });
    });

    it('maps rti_2005 domain to correct act_name', async () => {
      rpcMock.mockResolvedValueOnce({ data: [], error: null });

      await client.search({
        ...defaultParams,
        legalDomain: 'rti_2005',
      });

      expect(rpcMock).toHaveBeenCalledWith('match_legal_chunks', {
        query_embedding: defaultParams.queryEmbedding,
        match_threshold: 0.7,
        match_count: 10,
        filter_act_name: 'RTI Act 2005',
      });
    });

    it('caps maxResults at 20', async () => {
      rpcMock.mockResolvedValueOnce({ data: [], error: null });

      await client.search({
        ...defaultParams,
        maxResults: 50,
      });

      expect(rpcMock).toHaveBeenCalledWith('match_legal_chunks', {
        query_embedding: defaultParams.queryEmbedding,
        match_threshold: 0.7,
        match_count: 20,
        filter_act_name: 'Consumer Protection Act 2019',
      });
    });

    it('returns no_matches when search succeeds but no results', async () => {
      rpcMock.mockResolvedValueOnce({ data: [], error: null });

      const result = await client.search(defaultParams);

      expect(result.status).toBe('no_matches');
      expect(result.chunks).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('returns no_matches when data is null', async () => {
      rpcMock.mockResolvedValueOnce({ data: null, error: null });

      const result = await client.search(defaultParams);

      expect(result.status).toBe('no_matches');
      expect(result.chunks).toHaveLength(0);
    });

    it('returns search_error when RPC fails after all retries', async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const searchPromise = client.search(defaultParams);

      // Advance through retry delays
      await vi.advanceTimersByTimeAsync(500); // first retry delay
      await vi.advanceTimersByTimeAsync(1000); // second retry delay

      const result = await searchPromise;

      expect(result.status).toBe('search_error');
      expect(result.error).toContain('Connection timeout');
      expect(result.chunks).toHaveLength(0);
      // 3 total attempts (1 initial + 2 retries)
      expect(rpcMock).toHaveBeenCalledTimes(3);
    });

    it('retries on failure and succeeds on second attempt', async () => {
      rpcMock
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Temporary failure' },
        })
        .mockResolvedValueOnce({
          data: [
            { id: '1', content: 'Section 1', act_name: 'Consumer Protection Act 2019', section_number: 'Section 1', chapter: 'Chapter I', similarity: 0.85 },
          ],
          error: null,
        });

      const searchPromise = client.search(defaultParams);

      // Advance past first retry delay
      await vi.advanceTimersByTimeAsync(500);

      const result = await searchPromise;

      expect(result.status).toBe('success');
      expect(result.chunks).toHaveLength(1);
      expect(rpcMock).toHaveBeenCalledTimes(2);
    });

    it('maps chunk metadata correctly', async () => {
      rpcMock.mockResolvedValueOnce({
        data: [
          { id: 'abc-123', content: 'Legal text content', act_name: 'Consumer Protection Act 2019', section_number: 'Section 42', chapter: 'Chapter V', similarity: 0.92 },
        ],
        error: null,
      });

      const result = await client.search(defaultParams);

      expect(result.chunks[0]).toEqual({
        id: 'abc-123',
        content: 'Legal text content',
        embedding: [],
        metadata: {
          actName: 'Consumer Protection Act 2019',
          sectionNumber: 'Section 42',
          chapter: 'Chapter V',
        },
        similarityScore: 0.92,
      });
    });
  });
});
