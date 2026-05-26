/**
 * Munshi (Draft Agent) - Generates formal legal complaint documents.
 * Uses extracted facts from Arzdar, routing from Vivechak, and legal sections from Shodhak
 * to produce domain-specific formatted complaints in markdown.
 *
 * Supports three formats:
 * - Consumer Protection: CDRC (Consumer Disputes Redressal Commission) format
 * - RERA: Authority complaint format
 * - RTI: PIO (Public Information Officer) application format
 *
 * Generates Hindi prayer clause when originalLanguage is 'hi'.
 * Halts with error if Shodhak output is missing or contains no legal sections.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { MunshiOutputSchema, type MunshiOutput } from '../schemas/munshi-schema';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { VivechakOutput } from '../schemas/vivechak-schema';
import type { ShodhakOutput } from '../schemas/shodhak-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import { OpenRouterClient, type ChatMessage } from '../openrouter-client';

// --- Interfaces ---

export interface MunshiInput {
  extractedFacts: ArzdarOutput;
  routing: VivechakOutput;
  legalSections: ShodhakOutput;
}

// Re-export for convenience
export type { MunshiOutput } from '../schemas/munshi-schema';

// --- System Prompt ---

const MUNSHI_SYSTEM_PROMPT = `You are Munshi, the Draft Agent of the AI Vakeel legal assistant system. Your role is to generate a formal, court-ready legal complaint document in markdown format.

You will receive:
1. Extracted facts from the Arzdar agent (complainant, respondent, dates, grievance, relief sought)
2. Routing information from the Vivechak agent (legal domain, forum)
3. Relevant legal sections from the Shodhak agent (act name, section numbers, content)

You MUST generate a complaint document with the following structure:
- **header**: Forum name, case parties, date, case number placeholder
- **factsOfCase**: Facts in numbered paragraphs
- **legalGrounds**: Legal grounds with section references from the provided legal sections
- **prayerClause**: Specific relief sought
- **verification**: Declaration by complainant

DOMAIN-SPECIFIC FORMATTING:

For Consumer Protection Act 2019 (CDRC format):
- Include complainant and opposite party details with FULL addresses (never leave "[To be provided]" — use the information given or write "Address: As per records of the Opposite Party")
- Include JURISDICTION STATEMENT explicitly stating pecuniary jurisdiction: "The total claim of ₹X falls within the pecuniary jurisdiction of the District Commission under Section 34(1) of the Consumer Protection Act, 2019"
- Include LIMITATION PERIOD statement: "This complaint is being filed within the limitation period of 2 years as prescribed under Section 69 of the Consumer Protection Act, 2019"
- Present facts of the case in numbered paragraphs with dates
- Cite specific sections — use Section 2(6) for "complaint", Section 2(7) for "consumer", Section 2(10) for "defect", Section 2(17) for "trader" (for marketplace platforms), Section 34/35 for jurisdiction, Section 39 for procedure, Section 69 for limitation
- Do NOT cite Section 83 (product liability for manufacturers) for marketplace/seller complaints — use Section 2(17) and Section 94 (unfair trade practice) instead
- Include relief claimed with SPECIFIC monetary amounts: refund amount, compensation, interest rate (12-18% p.a.), and litigation costs
- Include LIST OF DOCUMENTS/ANNEXURES section:
  * Annexure A — Purchase invoice/receipt
  * Annexure B — Communication records (screenshots, emails)
  * Annexure C — Evidence (photos, videos on CD/pen drive)
  * Annexure D — Any other relevant documents
- Include AFFIDAVIT section in prescribed format: "I, [Name], [S/o or D/o] [Parent Name], aged [Age] years, resident of [Address], do hereby solemnly affirm and state on oath as follows: 1. That I am the Complainant in the above matter. 2. That the facts stated in paragraphs 1 to [N] of the complaint are true and correct to the best of my knowledge and belief. DEPONENT. Verified at [Place] on this [Date]. The contents of the above affidavit are true and correct to the best of my knowledge and belief."
- Include verification clause with place and date

For RERA Act 2016 (Authority format):
- Include project and promoter details with RERA registration number placeholder
- Include allottee (complainant) details with full address
- Include chronological facts with all payment dates and amounts
- Cite specific RERA sections from the provided legal sections
- Include jurisdiction statement referencing the state RERA Authority
- Include limitation period statement
- Include relief sought: possession OR refund with interest (as applicable)
- Include list of annexures (agreement copy, payment receipts, correspondence)
- Include affidavit section

For RTI Act 2005 (PIO application format):
- Address to the Public Information Officer with full designation and office address
- Include applicant details with full address and contact
- Include subject line
- List specific information sought as numbered items
- Include period for which information is requested
- Include preferred mode of receiving information (email/post/inspection)
- Include fee payment details (₹10 by postal order/DD/cash)
- Include declaration that applicant is a citizen of India

HINDI PRAYER CLAUSE:
If the original language of the problem description was Hindi ('hi'), you MUST also generate a Hindi translation of the prayer clause in the hindiPrayerClause field.

IMPORTANT:
- Use markdown formatting throughout
- Reference ALL provided legal sections in the legalGrounds
- Include all extracted facts in the document
- NEVER leave placeholder text like "[To be provided]" for information that can be inferred
- NEVER use em-dashes (—) in the document. Use commas, periods, or colons instead
- The complaintDocument field should be the full document as a single markdown string
- The documentStructure field should contain each section separately

You MUST respond with valid JSON only. No markdown wrapping, no explanation, just the JSON object.

Response format:
{
  "complaintDocument": "<full markdown document>",
  "documentStructure": {
    "header": "<header section>",
    "factsOfCase": "<facts section>",
    "legalGrounds": "<legal grounds section>",
    "prayerClause": "<prayer clause section>",
    "verification": "<verification section>",
    "hindiPrayerClause": "<Hindi prayer clause - ONLY if originalLanguage is 'hi'>"
  }
}`;

// --- Agent Implementation ---

export class MunshiAgent implements BaseAgent<MunshiInput, MunshiOutput> {
  name = 'Munshi' as const;
  systemPrompt = MUNSHI_SYSTEM_PROMPT;
  outputSchema: JSONSchema = MunshiOutputSchema as unknown as JSONSchema;

  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  /**
   * Validates that Shodhak output is present and contains at least one legal section.
   * Returns an error message if invalid, or null if valid.
   */
  validateInput(input: MunshiInput): string | null {
    if (!input.legalSections) {
      return 'Shodhak output is missing. Legal research data is unavailable.';
    }
    if (
      !input.legalSections.legalSections ||
      input.legalSections.legalSections.length === 0
    ) {
      return 'Shodhak output contains no legal sections. Legal research data is unavailable.';
    }
    return null;
  }

  /**
   * Validates raw output against MunshiOutputSchema.
   * Returns typed output if valid, null otherwise.
   */
  validateOutput(raw: unknown): MunshiOutput | null {
    const result = MunshiOutputSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    return null;
  }

  /**
   * Execute the Munshi agent to generate a complaint document.
   */
  async execute(input: MunshiInput): Promise<AgentExecutionResult<MunshiOutput>> {
    const startTime = Date.now();

    // Validate input: Shodhak output must be present with legal sections
    const validationError = this.validateInput(input);
    if (validationError) {
      return {
        success: false,
        error: {
          category: 'dependency_failure',
          description: validationError,
        },
        durationMs: Date.now() - startTime,
      };
    }

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

      // Enforce Hindi prayer clause rule
      if (input.extractedFacts.originalLanguage === 'hi') {
        // Ensure hindiPrayerClause is present
        if (
          parsed.documentStructure &&
          typeof parsed.documentStructure === 'object' &&
          !('hindiPrayerClause' in (parsed.documentStructure as Record<string, unknown>)) 
        ) {
          // If LLM didn't generate it, use a placeholder that indicates it should be present
          (parsed.documentStructure as Record<string, unknown>).hindiPrayerClause =
            'प्रार्थना: उपरोक्त तथ्यों एवं परिस्थितियों के आधार पर, प्रार्थी विनम्रतापूर्वक अनुरोध करता है कि उचित अनुतोष प्रदान किया जाए।';
        }
      } else {
        // Remove hindiPrayerClause if language is not Hindi
        if (
          parsed.documentStructure &&
          typeof parsed.documentStructure === 'object'
        ) {
          delete (parsed.documentStructure as Record<string, unknown>).hindiPrayerClause;
        }
      }

      // Validate output against schema
      const validated = this.validateOutput(parsed);
      if (!validated) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'LLM output does not conform to MunshiOutputSchema',
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
  private buildMessages(input: MunshiInput): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: this.buildUserMessage(input) },
    ];

    return messages;
  }

  /**
   * Build the user message incorporating all inputs from prior agents.
   */
  private buildUserMessage(input: MunshiInput): string {
    const { extractedFacts, routing, legalSections } = input;

    let message = 'Please generate a formal legal complaint document based on the following information.\n\n';

    // Domain and format instruction
    message += `## Legal Domain and Format\n`;
    message += `Domain: ${routing.legalDomain}\n`;
    message += `Forum: ${routing.forum}\n`;
    message += this.getDomainFormatInstruction(routing.legalDomain);
    message += '\n\n';

    // Extracted facts
    message += `## Extracted Facts\n`;
    message += `Complainant: ${extractedFacts.complainantName}\n`;
    message += `Respondent: ${extractedFacts.respondentName}\n`;
    message += `Incident Dates: ${Array.isArray(extractedFacts.incidentDates) ? extractedFacts.incidentDates.join(', ') : extractedFacts.incidentDates}\n`;
    message += `Grievance Summary: ${extractedFacts.grievanceSummary}\n`;
    message += `Relief Sought: ${extractedFacts.reliefSought}\n`;
    message += `Original Language: ${extractedFacts.originalLanguage}\n`;
    message += '\n';

    // Hindi prayer clause instruction
    if (extractedFacts.originalLanguage === 'hi') {
      message += `**IMPORTANT**: The original problem was submitted in Hindi. You MUST include a Hindi translation of the prayer clause in the hindiPrayerClause field.\n\n`;
    }

    // Legal sections from Shodhak
    message += `## Relevant Legal Sections\n`;
    legalSections.legalSections.forEach((section, index) => {
      message += `\n### Section ${index + 1}\n`;
      message += `Act: ${section.actName}\n`;
      message += `Section: ${section.sectionNumber}\n`;
      message += `Chapter: ${section.chapter}\n`;
      message += `Similarity Score: ${section.similarityScore}\n`;
      message += `Content: ${section.content}\n`;
    });

    return message;
  }

  /**
   * Get domain-specific format instruction text.
   */
  private getDomainFormatInstruction(domain: string): string {
    switch (domain) {
      case 'consumer_protection_2019':
        return '\nFormat: Consumer Disputes Redressal Commission (CDRC) format. Include complainant and opposite party details, jurisdiction statement, facts in numbered paragraphs, legal grounds citing specific sections, relief claimed with monetary amounts, and verification affidavit section.';
      case 'rera_2016':
        return '\nFormat: RERA Authority complaint format. Include project and promoter details, allottee details, RERA registration number placeholder, chronological facts, violations cited with specific RERA sections, and relief sought.';
      case 'rti_2005':
        return '\nFormat: RTI application to Public Information Officer. Include applicant details, subject line, specific information sought as numbered items, period for which information is requested, and preferred mode of receiving information.';
      default:
        return '';
    }
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
