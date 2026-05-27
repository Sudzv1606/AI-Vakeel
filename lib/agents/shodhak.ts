/**
 * Shodhak (Research Agent) - Advanced RAG-based legal research.
 * 
 * Pipeline: Query Expansion → Multi-Query Vector Search → LLM Re-ranking
 * 
 * 1. Query Expansion: LLM reformulates the user's natural language into legal terminology
 * 2. Multi-Query Search: Searches with both the original and expanded queries
 * 3. LLM Re-ranking: LLM evaluates and re-ranks results by actual relevance to the case
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { ShodhakOutputSchema, type ShodhakOutput } from '../schemas/shodhak-schema';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import type { LegalDomain } from '../types';
import { KnowledgeBaseClient, type LegalChunk } from '../knowledge-base';
import { OpenRouterClient } from '../openrouter-client';

// --- Interfaces ---

export interface ShodhakInput {
  extractedFacts: ArzdarOutput;
  legalDomain: LegalDomain;
}

// Re-export for convenience
export type { ShodhakOutput } from '../schemas/shodhak-schema';

// --- Constants ---

const INITIAL_THRESHOLD = 0.45;
const MIN_THRESHOLD = 0.30;
const THRESHOLD_STEP = 0.05;
const MIN_RESULTS = 3;
const MAX_RESULTS = 10;
const KB_MAX_RESULTS = 20;

// --- Agent Implementation ---

export class ShodhakAgent implements BaseAgent<ShodhakInput, ShodhakOutput> {
  name = 'Shodhak' as const;
  systemPrompt = 'Legal research agent using vector search.';
  outputSchema: JSONSchema = ShodhakOutputSchema as unknown as JSONSchema;

  private kbClient: KnowledgeBaseClient;
  private llmClient: OpenRouterClient;

  constructor(kbClient: KnowledgeBaseClient, llmClient?: OpenRouterClient) {
    this.kbClient = kbClient;
    // LLM client is optional for backward compatibility with tests
    this.llmClient = llmClient as OpenRouterClient;
  }

  validateOutput(raw: unknown): ShodhakOutput | null {
    const result = ShodhakOutputSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    return null;
  }

  async execute(input: ShodhakInput): Promise<AgentExecutionResult<ShodhakOutput>> {
    const startTime = Date.now();

    try {
      // Step 1: Query Expansion (LLM reformulates into legal terms)
      const expandedQueries = await this.expandQuery(input);

      // Step 2: Multi-query vector search
      const allChunks = await this.multiQuerySearch(expandedQueries, input.legalDomain);

      // Step 3: Deduplicate results
      const uniqueChunks = this.deduplicateChunks(allChunks);

      // Step 4: LLM Re-ranking
      const rankedChunks = await this.rerankResults(uniqueChunks, input);

      // Cap at MAX_RESULTS
      const finalChunks = rankedChunks.slice(0, MAX_RESULTS);

      // Build output
      const output: ShodhakOutput = {
        legalSections: finalChunks.map((chunk) => ({
          content: chunk.content,
          actName: chunk.metadata.actName,
          sectionNumber: chunk.metadata.sectionNumber,
          chapter: chunk.metadata.chapter,
          similarityScore: chunk.similarityScore,
        })),
        searchMetadata: {
          thresholdUsed: INITIAL_THRESHOLD,
          totalResultsFound: finalChunks.length,
        },
      };

      const validated = this.validateOutput(output);
      if (!validated) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'Shodhak output does not conform to ShodhakOutputSchema',
          },
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        output: validated,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;

      if (err instanceof Error && (err.message.includes('Knowledge Base') || err.message.includes('Embedding') || err.message.includes('embedding'))) {
        return {
          success: false,
          error: { category: 'dependency_failure', description: err.message },
          durationMs,
        };
      }

      return {
        success: false,
        error: {
          category: 'unhandled_exception',
          description: err instanceof Error ? err.message : String(err),
        },
        durationMs,
      };
    }
  }

  /**
   * Step 1: Return base query only.
   * HyDE and LLM query expansion disabled to cut latency and reduce errors.
   */
  private async expandQuery(input: ShodhakInput): Promise<string[]> {
    return [this.buildBaseQuery(input)];
  }

  /**
   * Step 2: Multi-query vector search
   * Searches with each expanded query and combines results.
   * Uses hybrid search (vector + keyword) when available.
   */
  private async multiQuerySearch(
    queries: string[],
    legalDomain: LegalDomain
  ): Promise<LegalChunk[]> {
    const allChunks: LegalChunk[] = [];

    for (const query of queries) {
      const queryEmbedding = await this.kbClient.generateEmbedding(query);
      const { chunks } = await this.adaptiveSearch(queryEmbedding, legalDomain, query);
      allChunks.push(...chunks);
    }

    return allChunks;
  }

  /**
   * Step 3: Deduplicate chunks by ID
   * Keeps the highest similarity score for duplicates.
   */
  private deduplicateChunks(chunks: LegalChunk[]): LegalChunk[] {
    const seen = new Map<string, LegalChunk>();

    for (const chunk of chunks) {
      const key = chunk.id || `${chunk.metadata.actName}-${chunk.metadata.sectionNumber}-${chunk.content.substring(0, 50)}`;
      const existing = seen.get(key);
      if (!existing || chunk.similarityScore > existing.similarityScore) {
        seen.set(key, chunk);
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Step 4: Return chunks as-is sorted by similarity.
   * LLM re-ranking disabled to cut latency and reduce errors.
   */
  private async rerankResults(
    chunks: LegalChunk[],
    input: ShodhakInput
  ): Promise<LegalChunk[]> {
    return chunks;
  }

  /**
   * Adaptive threshold search with hybrid support.
   */
  async adaptiveSearch(
    queryEmbedding: number[],
    legalDomain: LegalDomain,
    queryText?: string
  ): Promise<{ chunks: LegalChunk[]; thresholdUsed: number }> {
    let threshold = INITIAL_THRESHOLD;

    while (threshold >= MIN_THRESHOLD) {
      const result = await this.kbClient.search({
        queryEmbedding,
        legalDomain,
        similarityThreshold: threshold,
        maxResults: KB_MAX_RESULTS,
        queryText, // Enables hybrid search if available
      });

      if (result.status === 'search_error') {
        throw new Error(`Knowledge Base search failed: ${result.error || 'Unknown error'}`);
      }

      if (result.chunks.length >= MIN_RESULTS) {
        return { chunks: result.chunks, thresholdUsed: threshold };
      }

      threshold = Math.round((threshold - THRESHOLD_STEP) * 100) / 100;
    }

    // Final attempt at minimum threshold
    const finalResult = await this.kbClient.search({
      queryEmbedding,
      legalDomain,
      similarityThreshold: MIN_THRESHOLD,
      maxResults: KB_MAX_RESULTS,
      queryText,
    });

    if (finalResult.status === 'search_error') {
      throw new Error(`Knowledge Base search failed: ${finalResult.error || 'Unknown error'}`);
    }

    return { chunks: finalResult.chunks, thresholdUsed: MIN_THRESHOLD };
  }

  /**
   * Build base query from extracted facts.
   */
  private buildBaseQuery(input: ShodhakInput): string {
    const facts = input.extractedFacts;
    const parts: string[] = [];

    if (facts.grievanceSummary && facts.grievanceSummary !== 'not provided') {
      parts.push(facts.grievanceSummary);
    }
    if (facts.reliefSought && facts.reliefSought !== 'not provided') {
      parts.push(`Relief sought: ${facts.reliefSought}`);
    }
    if (facts.respondentName && facts.respondentName !== 'not provided') {
      parts.push(`Against: ${facts.respondentName}`);
    }
    parts.push(`Legal domain: ${input.legalDomain.replace(/_/g, ' ')}`);

    return parts.join('. ');
  }
}
