/**
 * Knowledge Base Client for Supabase pgvector semantic search.
 * Provides vector similarity search over legal text chunks and embedding generation.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LegalDomain } from './types';

/**
 * Represents a legal text chunk returned from vector search.
 */
export interface LegalChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    actName: string;
    sectionNumber: string;
    chapter: string;
  };
  similarityScore: number;
}

/**
 * Parameters for performing a vector similarity search.
 */
export interface VectorSearchParams {
  queryEmbedding: number[];
  legalDomain: LegalDomain;
  similarityThreshold: number;
  maxResults: number; // max 20
}

/**
 * Result of a vector similarity search operation.
 */
export interface VectorSearchResult {
  chunks: LegalChunk[];
  status: 'success' | 'no_matches' | 'search_error';
  error?: string;
}

/**
 * Maps LegalDomain enum values to the act_name strings stored in the database.
 */
const DOMAIN_TO_ACT_NAME: Record<LegalDomain, string> = {
  consumer_protection_2019: 'Consumer Protection Act 2019',
  rera_2016: 'RERA Act 2016',
  rti_2005: 'RTI Act 2005',
};

/**
 * Maximum number of chunks that can be returned from a search.
 */
const MAX_CHUNKS = 20;

/**
 * Maximum number of retry attempts on failure (2 additional retries = 3 total attempts).
 */
const MAX_RETRIES = 2;

/**
 * Delay between retries in milliseconds (doubles each retry).
 */
const INITIAL_RETRY_DELAY_MS = 500;

/**
 * Client for performing semantic search over the legal knowledge base
 * stored in Supabase pgvector.
 */
export class KnowledgeBaseClient {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Performs a vector similarity search against the legal_chunks table
   * using the match_legal_chunks RPC function.
   *
   * Results are sorted by cosine similarity in descending order.
   * Returns at most 20 chunks.
   *
   * Implements retry logic: 2 additional retries on failure with exponential backoff.
   */
  async search(params: VectorSearchParams): Promise<VectorSearchResult> {
    const maxResults = Math.min(params.maxResults, MAX_CHUNKS);
    const actName = DOMAIN_TO_ACT_NAME[params.legalDomain];

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.executeSearch(
          params.queryEmbedding,
          params.similarityThreshold,
          maxResults,
          actName
        );
        return result;
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : 'Unknown search error';

        // If we have retries remaining, wait with exponential backoff
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    return {
      chunks: [],
      status: 'search_error',
      error: lastError ?? 'Search failed after all retry attempts',
    };
  }

  /**
   * Generates a vector embedding for the given text.
   *
   * This method uses the OpenRouter/OpenAI-compatible embedding endpoint.
   * Can be swapped for any embedding provider by changing the implementation.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing OPENROUTER_API_KEY environment variable for embedding generation'
      );
    }

    const response = await fetch(
      'https://openrouter.ai/api/v1/embeddings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small',
          input: text,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Embedding generation failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const embedding: number[] = data?.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response: missing embedding array');
    }

    return embedding;
  }

  /**
   * Executes the actual Supabase RPC call to match_legal_chunks.
   * Throws on error so the retry logic in search() can handle it.
   */
  private async executeSearch(
    queryEmbedding: number[],
    matchThreshold: number,
    matchCount: number,
    filterActName: string
  ): Promise<VectorSearchResult> {
    const { data, error } = await this.supabase.rpc('match_legal_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_act_name: filterActName,
    });

    if (error) {
      throw new Error(`Supabase RPC error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        chunks: [],
        status: 'no_matches',
      };
    }

    // Map RPC results to LegalChunk interface, sorted by similarity descending
    const chunks: LegalChunk[] = data
      .sort(
        (a: { similarity: number }, b: { similarity: number }) =>
          b.similarity - a.similarity
      )
      .map(
        (row: {
          id: string;
          content: string;
          act_name: string;
          section_number: string;
          chapter: string;
          similarity: number;
        }) => ({
          id: row.id,
          content: row.content,
          embedding: [], // Embedding not returned from search for efficiency
          metadata: {
            actName: row.act_name,
            sectionNumber: row.section_number,
            chapter: row.chapter,
          },
          similarityScore: row.similarity,
        })
      );

    return {
      chunks,
      status: 'success',
    };
  }

  /**
   * Utility sleep function for retry backoff.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
