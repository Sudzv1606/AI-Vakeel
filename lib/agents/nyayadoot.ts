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
import { NYAYADOOT_CHECKLISTS, SECTION_CITATION_RULES, getDomainKey } from './rules';

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
}

You must respond with a single JSON object. Do not include markdown code blocks. Do not include any text before or after the JSON. Begin your response with { and end with }.`;

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
      // Run programmatic checks before LLM call
      const programmaticIssues = this.programmaticCheck(input.complaintDocument, input.legalDomain, input.extractedFacts);

      const messages = this.buildMessages(input, programmaticIssues);
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
   * Programmatic pre-checks that run BEFORE the LLM call.
   * Catches deterministic errors that don't need LLM reasoning.
   */
  private programmaticCheck(document: string, legalDomain: string, extractedFacts?: ArzdarOutput): Array<{section: string; deficiencyType: string; description: string; suggestedCorrection: string}> {
    const issues: Array<{section: string; deficiencyType: string; description: string; suggestedCorrection: string}> = [];

    // Check for "Forum" instead of "Commission" (CPA 2019)
    if (legalDomain.includes('consumer') && /forum/i.test(document) && !/information/i.test(document)) {
      issues.push({
        section: 'Header',
        deficiencyType: 'formatting_error',
        description: 'Uses "Forum" instead of "Commission". CPA 2019 uses Commission.',
        suggestedCorrection: 'Replace all instances of "Forum" with "Commission"',
      });
    }

    // Check for forbidden Section 36
    if (legalDomain.includes('consumer') && /section\s*36/i.test(document) && !/section\s*36.*proceedings/i.test(document)) {
      issues.push({
        section: 'Legal Grounds',
        deficiencyType: 'incorrect_reference',
        description: 'Section 36 cited. This section is about Commission composition, not unfair trade practices.',
        suggestedCorrection: 'Remove Section 36 citation. Use Section 2(47) for unfair trade practices.',
      });
    }

    // Check for forbidden Section 89 in consumer complaints
    if (legalDomain.includes('consumer') && /section\s*89/i.test(document)) {
      issues.push({
        section: 'Legal Grounds',
        deficiencyType: 'incorrect_reference',
        description: 'Section 89 cited. This is a criminal penalty for false advertising, not relevant to consumer complaints.',
        suggestedCorrection: 'Remove Section 89. Use Section 83/84/86 for product liability.',
      });
    }

    // Check interest rate > 9%
    const interestMatch = document.match(/(\d+)%\s*(?:per annum|p\.?a\.?)/i);
    if (interestMatch && parseInt(interestMatch[1]) > 9) {
      issues.push({
        section: 'Prayer Clause',
        deficiencyType: 'factual_inconsistency',
        description: `Interest rate of ${interestMatch[1]}% is too high. Consumer Commissions award 6-9%.`,
        suggestedCorrection: 'Change to "9% per annum or such rate as the Commission deems fit"',
      });
    }

    // Check for Section 21 in RTI
    if (legalDomain.includes('rti') && /section\s*21/i.test(document)) {
      issues.push({
        section: 'Legal Grounds',
        deficiencyType: 'incorrect_reference',
        description: 'Section 21 cited. This protects officers, not applicants.',
        suggestedCorrection: 'Remove Section 21 citation.',
      });
    }

    // Check all opposite parties are named in the document
    if (extractedFacts?.allOppositeParties && extractedFacts.allOppositeParties.length > 1) {
      extractedFacts.allOppositeParties.forEach((party, i) => {
        if (party.name !== 'not provided' && !document.includes(party.name)) {
          issues.push({
            section: 'Header / Parties',
            deficiencyType: 'missing_element',
            description: `${party.name} (${party.role}) is named in the complaint facts but missing from the document as Opposite Party ${i + 1}.`,
            suggestedCorrection: `Add ${party.name} as Opposite Party ${i + 1} and cite ${party.liabilityType === 'product_manufacturer' ? 'Section 84' : 'Section 86'}.`,
          });
        }
      });
    }

    return issues;
  }

  /**
   * Build chat messages for the LLM request.
   */
  private buildMessages(input: NyayadootInput, programmaticIssues: Array<{section: string; deficiencyType: string; description: string; suggestedCorrection: string}>): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: this.buildUserMessage(input, programmaticIssues) },
    ];

    return messages;
  }

  /**
   * Build the user message incorporating the document and facts for review.
   * Injects section citation rules, domain-specific review checklist, and programmatic pre-check results.
   */
  private buildUserMessage(input: NyayadootInput, programmaticIssues: Array<{section: string; deficiencyType: string; description: string; suggestedCorrection: string}>): string {
    const { complaintDocument, legalDomain, extractedFacts } = input;
    const domainKey = getDomainKey(legalDomain);

    let message = 'Please review the following legal complaint document for quality.\n\n';

    // Inject programmatic pre-check results if any
    if (programmaticIssues.length > 0) {
      message += `## KNOWN ISSUES (already detected programmatically, MUST include in your issues list)\n`;
      programmaticIssues.forEach((issue, i) => {
        message += `${i + 1}. [${issue.section}] ${issue.deficiencyType}: ${issue.description} → Fix: ${issue.suggestedCorrection}\n`;
      });
      message += `\nThese issues are CONFIRMED defects. Include them in your issues array and deduct points accordingly.\n\n`;
    }

    // Inject verified section citation rules (so Nyayadoot knows what's correct)
    message += `## VERIFIED SECTION CITATION RULES (use to verify correctness)\n${SECTION_CITATION_RULES}\n\n`;

    // Inject domain-specific review checklist
    const checklist = NYAYADOOT_CHECKLISTS[domainKey];
    if (checklist) {
      message += `## DOMAIN-SPECIFIC REVIEW CHECKLIST (score against this)\n${checklist}\n\n`;
    }

    message += `## Legal Domain\n`;
    message += `Domain: ${legalDomain}\n\n`;

    message += `## Extracted Facts (for consistency check)\n`;
    message += `Complainant: ${extractedFacts.complainantName}\n`;
    if (extractedFacts.allOppositeParties && extractedFacts.allOppositeParties.length > 0) {
      message += `All Opposite Parties (ALL must appear in document):\n`;
      extractedFacts.allOppositeParties.forEach((p, i) => {
        message += `  ${i + 1}. ${p.name} - ${p.role} - liability: ${p.liabilityType}\n`;
      });
    } else {
      message += `Respondent: ${extractedFacts.respondentName}\n`;
    }
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
