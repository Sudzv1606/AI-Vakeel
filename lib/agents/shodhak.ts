/**
 * Shodhak (Research Agent) - Performs RAG-based legal research using vector similarity search.
 * Queries the Knowledge Base with extracted facts and classified legal domain,
 * implements adaptive threshold (0.7 → 0.5 in 0.05 decrements) to ensure 3-10 results,
 * and ranks results by similarity score descending.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { ShodhakOutputSchema, type ShodhakOutput } from '../schemas/shodhak-schema';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import type { LegalDomain } from '../types';
import { KnowledgeBaseClient, type LegalChunk } from '../knowledge-base';

// --- Interfaces ---

export interface ShodhakInput {
  extractedFacts: ArzdarOutput;
  legalDomain: LegalDomain;
}

// Re-export for convenience
export type { ShodhakOutput } from '../schemas/shodhak-schema';

// --- Constants ---

/** Initial similarity threshold for vector search */
const INITIAL_THRESHOLD = 0.5;

/** Minimum similarity threshold (floor) */
const MIN_THRESHOLD = 0.3;

/** Threshold decrement step */
const THRESHOLD_STEP = 0.05;

/** Minimum number of results required */
const MIN_RESULTS = 3;

/** Maximum number of results to return */
const MAX_RESULTS = 10;

/** Maximum results to request from KB (KB supports up to 20) */
const KB_MAX_RESULTS = 20;

// --- System Prompt ---

const SHODHAK_SYSTEM_PROMPT = `You are Shodhak, the Research Agent of the AI Vakeel legal assistant system. Your role is to identify and rank the most relevant legal sections for a given case.

You receive legal sections retrieved from a knowledge base via vector similarity search. Your job is to:
1. Evaluate the relevance of each retrieved section to the specific case facts
2. Rank sections by their applicability to the case
3. Filter out sections that are not directly relevant despite having high similarity scores

You help ensure that only the most pertinent legal provisions are used in the complaint document.

RULES:
- Return between 3 and 10 legal sections
- Sections must be sorted by relevance/similarity score in descending order
- Each section must include: content, actName, sectionNumber, chapter, and similarityScore
- Focus on sections that directly support the complainant's case

You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.`;

// --- Agent Implementation ---

export class ShodhakAgent implements BaseAgent<ShodhakInput, ShodhakOutput> {
  name = 'Shodhak' as const;
  systemPrompt = SHODHAK_SYSTEM_PROMPT;
  outputSchema: JSONSchema = ShodhakOutputSchema as unknown as JSONSchema;

  private kbClient: KnowledgeBaseClient;

  constructor(kbClient: KnowledgeBaseClient) {
    this.kbClient = kbClient;
  }

  /**
   * Validates raw output against ShodhakOutputSchema.
   * Returns typed output if valid, null otherwise.
   */
  validateOutput(raw: unknown): ShodhakOutput | null {
    const result = ShodhakOutputSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    return null;
  }

  /**
   * Execute the Shodhak agent to perform legal research via vector search.
   * Implements adaptive threshold: starts at 0.7, decrements by 0.05 until
   * at least 3 results are found or threshold reaches 0.5.
   */
  async execute(input: ShodhakInput): Promise<AgentExecutionResult<ShodhakOutput>> {
    const startTime = Date.now();

    try {
      // Build query text from extracted facts
      const queryText = this.buildQueryText(input);

      // Generate embedding for the query
      const queryEmbedding = await this.kbClient.generateEmbedding(queryText);

      // Perform adaptive threshold search
      const { chunks, thresholdUsed } = await this.adaptiveSearch(
        queryEmbedding,
        input.legalDomain
      );

      // Cap results at MAX_RESULTS and sort by similarity descending
      const sortedChunks = chunks
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, MAX_RESULTS);

      // Build output
      const output: ShodhakOutput = {
        legalSections: sortedChunks.map((chunk) => ({
          content: chunk.content,
          actName: chunk.metadata.actName,
          sectionNumber: chunk.metadata.sectionNumber,
          chapter: chunk.metadata.chapter,
          similarityScore: chunk.similarityScore,
        })),
        searchMetadata: {
          thresholdUsed,
          totalResultsFound: sortedChunks.length,
        },
      };

      // Validate output against schema
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

      // Check if it's a dependency failure (KB unavailable)
      if (err instanceof Error && err.message.includes('Knowledge Base')) {
        return {
          success: false,
          error: {
            category: 'dependency_failure',
            description: err.message,
          },
          durationMs,
        };
      }

      // Check if it's an embedding generation failure
      if (err instanceof Error && (err.message.includes('Embedding') || err.message.includes('embedding'))) {
        return {
          success: false,
          error: {
            category: 'dependency_failure',
            description: err.message,
          },
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
   * Performs adaptive threshold search.
   * Starts at INITIAL_THRESHOLD (0.7), decrements by THRESHOLD_STEP (0.05)
   * until at least MIN_RESULTS (3) are found or threshold reaches MIN_THRESHOLD (0.5).
   *
   * Returns the chunks found and the final threshold used.
   */
  async adaptiveSearch(
    queryEmbedding: number[],
    legalDomain: LegalDomain
  ): Promise<{ chunks: LegalChunk[]; thresholdUsed: number }> {
    let threshold = INITIAL_THRESHOLD;

    while (threshold >= MIN_THRESHOLD) {
      const result = await this.kbClient.search({
        queryEmbedding,
        legalDomain,
        similarityThreshold: threshold,
        maxResults: KB_MAX_RESULTS,
      });

      // If search encountered an error, throw to trigger dependency_failure
      if (result.status === 'search_error') {
        throw new Error(
          `Knowledge Base search failed: ${result.error || 'Unknown error'}`
        );
      }

      // If we have enough results, return them
      if (result.chunks.length >= MIN_RESULTS) {
        return { chunks: result.chunks, thresholdUsed: threshold };
      }

      // Decrement threshold and try again
      threshold = Math.round((threshold - THRESHOLD_STEP) * 100) / 100;
    }

    // If we've reached MIN_THRESHOLD and still don't have enough results,
    // do one final search at MIN_THRESHOLD and return whatever we get
    const finalResult = await this.kbClient.search({
      queryEmbedding,
      legalDomain,
      similarityThreshold: MIN_THRESHOLD,
      maxResults: KB_MAX_RESULTS,
    });

    if (finalResult.status === 'search_error') {
      throw new Error(
        `Knowledge Base search failed: ${finalResult.error || 'Unknown error'}`
      );
    }

    return { chunks: finalResult.chunks, thresholdUsed: MIN_THRESHOLD };
  }

  /**
   * Build a query text from extracted facts for embedding generation.
   * Combines grievance summary, relief sought, and other relevant facts.
   */
  private buildQueryText(input: ShodhakInput): string {
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

    // Add domain context
    parts.push(`Legal domain: ${input.legalDomain.replace(/_/g, ' ')}`);

    return parts.join('. ');
  }
}
