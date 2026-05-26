/**
 * Nyayadoot (Review Agent) - Reviews generated complaint documents for quality.
 * Scores documents across four categories: completeness, legal reference validity,
 * formatting compliance, and factual consistency.
 *
 * Approval logic:
 * - Score ≥ 70 → approved with empty issues array
 * - Score < 70 → needs_revision with 1-10 issues
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { NyayadootOutputSchema, type NyayadootOutput } from '../schemas/nyayadoot-schema';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import type { LegalDomain } from '../types';
import { OpenRouterClient, type ChatMessage } from '../openrouter-client';

// --- Interfaces ---

export interface NyayadootInput {
  complaintDocument: string;
  legalDomain: LegalDomain;
  extractedFacts: ArzdarOutput;
}

// Re-export for convenience
export type { NyayadootOutput } from '../schemas/nyayadoot-schema';

// --- System Prompt ---

const NYAYADOOT_SYSTEM_PROMPT = `You are Nyayadoot, the Review Agent of the AI Vakeel legal assistant system. Your role is to review generated legal complaint documents against a domain-specific quality checklist.

You MUST evaluate the document across four categories and produce a quality score from 0 to 100:
1. **Completeness** (0-25 points): Are all required sections present? Are all facts from the intake included?
2. **Legal Reference Validity** (0-25 points): Are cited legal sections correct and applicable? Are section numbers accurate?
3. **Formatting Compliance** (0-25 points): Does the document follow the correct format for the legal domain (CDRC/RERA Authority/RTI PIO)?
4. **Factual Consistency** (0-25 points): Are the facts in the document consistent with the extracted facts? No contradictions or fabrications?

DOMAIN-SPECIFIC CHECKLISTS:

Consumer Protection Act 2019 (CDRC format):
- Complainant and opposite party details present
- Jurisdiction statement citing Consumer Protection Act 2019
- Facts in numbered paragraphs
- Specific sections cited from Consumer Protection Act
- Relief claimed with amounts
- Verification/affidavit section

RERA Act 2016 (Authority format):
- Project and promoter details
- Allottee details
- RERA registration reference
- Chronological facts
- RERA section citations
- Relief sought section

RTI Act 2005 (PIO format):
- Addressed to PIO
- Applicant details
- Subject line
- Information sought as numbered items
- Period specification
- Mode of receiving information

APPROVAL LOGIC:
- If qualityScore >= 70: set approvalStatus to "approved" and issues to an empty array []
- If qualityScore < 70: set approvalStatus to "needs_revision" and list 1-10 specific issues

ISSUE FORMAT:
Each issue must have:
- section: which section of the document has the issue
- deficiencyType: one of "missing_element", "incorrect_reference", "formatting_error", "factual_inconsistency"
- description: what the issue is
- suggestedCorrection: how to fix it

You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.
NEVER use em-dashes (—) in the finalDocument. Use commas, periods, or colons instead.

Response format:
{
  "qualityScore": <0-100>,
  "approvalStatus": "approved" | "needs_revision",
  "issues": [
    {
      "section": "<section name>",
      "deficiencyType": "missing_element" | "incorrect_reference" | "formatting_error" | "factual_inconsistency",
      "description": "<description of the issue>",
      "suggestedCorrection": "<how to fix>"
    }
  ],
  "finalDocument": "<the document, corrected if needed, or original if approved>"
}`;

// --- Agent Implementation ---

export class NyayadootAgent implements BaseAgent<NyayadootInput, NyayadootOutput> {
  name = 'Nyayadoot' as const;
  systemPrompt = NYAYADOOT_SYSTEM_PROMPT;
  outputSchema: JSONSchema = NyayadootOutputSchema as unknown as JSONSchema;

  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  /**
   * Validates raw output against NyayadootOutputSchema.
   * Enforces approval logic: score ≥ 70 → approved + empty issues; score < 70 → needs_revision + 1-10 issues.
   * Returns typed output if valid, null otherwise.
   */
  validateOutput(raw: unknown): NyayadootOutput | null {
    const result = NyayadootOutputSchema.safeParse(raw);
    if (result.success) {
      const output = result.data;

      // Enforce approval logic
      if (output.qualityScore >= 70) {
        output.approvalStatus = 'approved';
        output.issues = [];
      } else {
        output.approvalStatus = 'needs_revision';
        // Ensure at least 1 issue and at most 10
        if (output.issues.length === 0) {
          output.issues = [{
            section: 'General',
            deficiencyType: 'missing_element',
            description: 'Document quality is below threshold',
            suggestedCorrection: 'Review and improve the document to meet quality standards',
          }];
        }
        if (output.issues.length > 10) {
          output.issues = output.issues.slice(0, 10);
        }
      }

      return output;
    }
    return null;
  }

  /**
   * Execute the Nyayadoot agent to review a complaint document.
   */
  async execute(input: NyayadootInput): Promise<AgentExecutionResult<NyayadootOutput>> {
    const startTime = Date.now();

    try {
      const messages = this.buildMessages(input);
      const response = await this.client.chatCompletion(messages);

      // Extract content from LLM response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'LLM returned empty response content',
          },
          durationMs: Date.now() - startTime,
        };
      }

      // Parse JSON from response
      const parsed = this.parseJsonResponse(content);
      if (!parsed) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'Failed to parse LLM response as JSON',
          },
          durationMs: Date.now() - startTime,
        };
      }

      // Validate output against schema
      const validated = this.validateOutput(parsed);
      if (!validated) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'LLM output does not conform to NyayadootOutputSchema',
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

      // Check if it's an OpenRouter error
      if (typeof err === 'object' && err !== null && 'type' in err) {
        const openRouterErr = err as { type: string; message: string };
        if (openRouterErr.type === 'timeout' || openRouterErr.type === 'exhausted_retries') {
          return {
            success: false,
            error: {
              category: 'llm_timeout',
              description: openRouterErr.message,
            },
            durationMs,
          };
        }
        return {
          success: false,
          error: {
            category: 'unhandled_exception',
            description: openRouterErr.message,
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
   * Build chat messages for the LLM request.
   */
  private buildMessages(input: NyayadootInput): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: this.buildUserMessage(input) },
    ];

    return messages;
  }

  /**
   * Build the user message incorporating the document and facts for review.
   */
  private buildUserMessage(input: NyayadootInput): string {
    const { complaintDocument, legalDomain, extractedFacts } = input;

    let message = 'Please review the following legal complaint document for quality.\n\n';

    message += `## Legal Domain\n`;
    message += `Domain: ${legalDomain}\n\n`;

    message += `## Extracted Facts (for consistency check)\n`;
    message += `Complainant: ${extractedFacts.complainantName}\n`;
    message += `Respondent: ${extractedFacts.respondentName}\n`;
    message += `Incident Dates: ${Array.isArray(extractedFacts.incidentDates) ? extractedFacts.incidentDates.join(', ') : extractedFacts.incidentDates}\n`;
    message += `Grievance Summary: ${extractedFacts.grievanceSummary}\n`;
    message += `Relief Sought: ${extractedFacts.reliefSought}\n`;
    message += `Original Language: ${extractedFacts.originalLanguage}\n\n`;

    message += `## Complaint Document to Review\n\n`;
    message += complaintDocument;

    return message;
  }

  /**
   * Parse JSON from LLM response, handling potential markdown code blocks.
   */
  private parseJsonResponse(content: string): Record<string, unknown> | null {
    try {
      // Try direct JSON parse first
      return JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          return null;
        }
      }

      // Try finding JSON object in the response
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          return null;
        }
      }

      return null;
    }
  }
}
