/**
 * Vivechak (Router Agent) - Classifies legal domain and selects appropriate forum.
 * Determines whether the case falls under Consumer Protection Act 2019, RERA Act 2016,
 * or RTI Act 2005, and selects the correct forum based on domain-specific rules.
 * Outputs a confidence score and flags low-confidence classifications for user confirmation.
 */

import { VivechakOutputSchema, type VivechakOutput } from '../schemas/vivechak-schema';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import { OpenRouterClient, type ChatMessage } from '../openrouter-client';

// --- Interfaces ---

export interface VivechakInput {
  extractedFacts: ArzdarOutput;
}

// Re-export for convenience
export type { VivechakOutput } from '../schemas/vivechak-schema';

// --- System Prompt ---

const VIVECHAK_SYSTEM_PROMPT = `You are Vivechak, the Router Agent of the AI Vakeel legal assistant system. Your role is to classify the user's legal case into the correct legal domain and select the appropriate forum for filing.

You MUST classify the case into exactly ONE of these legal domains:
1. "consumer_protection_2019" — Consumer Protection Act 2019: Cases involving defective goods, deficient services, unfair trade practices, or misleading advertisements by businesses/service providers.
2. "rera_2016" — RERA Act 2016: Cases involving real estate disputes — delayed possession, builder fraud, project registration issues, or violations by promoters/developers.
3. "rti_2005" — RTI Act 2005: Cases where a citizen seeks information from a public authority/government body.

FORUM SELECTION RULES:

For Consumer Protection Act 2019:
- District Commission (District Consumer Disputes Redressal Commission): If the claimed compensation value is up to ₹1 crore (≤ ₹1,00,00,000)
- State Commission (State Consumer Disputes Redressal Commission): If the claimed compensation value is above ₹1 crore and up to ₹10 crore (> ₹1,00,00,000 and ≤ ₹10,00,00,000)
- National Commission (National Consumer Disputes Redressal Commission): If the claimed compensation value is above ₹10 crore (> ₹10,00,00,000)
- If the compensation value cannot be determined from the facts, default to "District Consumer Disputes Redressal Commission" and note this in reasoning.
- IMPORTANT: Under CPA 2019, the body is called "Commission" NOT "Forum". The term "Forum" was used under the repealed 1986 Act. NEVER use "Forum".

For RERA Act 2016:
- Forum: "RERA Authority of [state name]" where the real estate project is located
- If the state cannot be determined, use "RERA Authority of the concerned state" and note this in reasoning.

For RTI Act 2005:
- Forum: "Public Information Officer of [relevant public authority]"
- If the specific authority cannot be determined, use "Public Information Officer of the relevant public authority" and note this in reasoning.

CONFIDENCE SCORING:
- Assign a confidence score between 0.0 and 1.0
- High confidence (0.7-1.0): Clear indicators of the domain (e.g., explicit mention of product purchase, builder, government information request)
- Medium confidence (0.5-0.69): Some indicators present but case could potentially fall under multiple domains
- Low confidence (0.0-0.49): Ambiguous case with unclear domain indicators

IMPORTANT:
- Set requiresUserConfirmation to true if and only if confidenceScore < 0.5
- Set requiresUserConfirmation to false if confidenceScore >= 0.5
- Provide clear reasoning explaining why you chose this domain and forum

You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.

Response format:
{
  "legalDomain": "consumer_protection_2019" | "rera_2016" | "rti_2005",
  "forum": "<selected forum based on rules above>",
  "confidenceScore": <0.0 to 1.0>,
  "requiresUserConfirmation": true | false,
  "reasoning": "<explanation of classification and forum selection>"
}

You must respond with a single JSON object. Do not include markdown code blocks. Do not include any text before or after the JSON. Begin your response with { and end with }.`;

// --- Agent Implementation ---

export class VivechakAgent implements BaseAgent<VivechakInput, VivechakOutput> {
  name = 'Vivechak' as const;
  systemPrompt = VIVECHAK_SYSTEM_PROMPT;
  outputSchema: JSONSchema = VivechakOutputSchema as unknown as JSONSchema;

  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  /**
   * Validates raw output against VivechakOutputSchema.
   * Also enforces the business rule: requiresUserConfirmation must be true iff confidence < 0.5.
   * Returns typed output if valid, null otherwise.
   */
  validateOutput(raw: unknown): VivechakOutput | null {
    const result = VivechakOutputSchema.safeParse(raw);
    if (result.success) {
      // Enforce confidence threshold rule
      const output = result.data;
      output.requiresUserConfirmation = output.confidenceScore < 0.5;
      return output;
    }
    return null;
  }

  /**
   * Execute the Vivechak agent to classify legal domain and select forum.
   */
  async execute(input: VivechakInput): Promise<AgentExecutionResult<VivechakOutput>> {
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
            description: 'LLM output does not conform to VivechakOutputSchema',
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
  private buildMessages(input: VivechakInput): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: this.buildUserMessage(input) },
    ];

    return messages;
  }

  /**
   * Build the user message from extracted facts.
   */
  private buildUserMessage(input: VivechakInput): string {
    const facts = input.extractedFacts;

    let message = 'Please classify the following legal case and select the appropriate forum.\n\n';
    message += `Complainant: ${facts.complainantName}\n`;
    if (facts.allOppositeParties && facts.allOppositeParties.length > 0) {
      message += `All Opposite Parties:\n`;
      facts.allOppositeParties.forEach((p, i) => {
        message += `  ${i + 1}. ${p.name} (${p.role} - ${p.liabilityType})\n`;
      });
    } else {
      message += `Respondent: ${facts.respondentName}\n`;
    }
    message += `Incident Dates: ${Array.isArray(facts.incidentDates) ? facts.incidentDates.join(', ') : facts.incidentDates}\n`;
    message += `Grievance Summary: ${facts.grievanceSummary}\n`;
    message += `Relief Sought: ${facts.reliefSought}\n`;
    message += `Original Language: ${facts.originalLanguage}\n`;

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
