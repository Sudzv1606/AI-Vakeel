/**
 * Arzdar (Intake Agent) - Extracts key facts from user's legal problem description.
 * Supports English and Hindi input. Generates follow-up questions (max 3) when
 * essential facts are missing. Marks missing fields as "not provided" after exhaustion.
 */

import { ArzdarOutputSchema, type ArzdarOutput } from '../schemas/arzdar-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import { OpenRouterClient, type ChatMessage } from '../openrouter-client';

// --- Interfaces ---

export interface ArzdarInput {
  problemDescription: string;
  followUpResponses?: string[]; // responses to clarifying questions
}

// Re-export for convenience
export type { ArzdarOutput } from '../schemas/arzdar-schema';

// --- Constants ---

const MIN_DESCRIPTION_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_FOLLOW_UP_QUESTIONS = 3;

// --- System Prompt ---

const ARZDAR_SYSTEM_PROMPT = `You are Arzdar, the Intake Agent of the AI Vakeel legal assistant system. Your role is to extract key facts from a user's legal problem description.

You MUST extract the following fields from the user's problem description:

CORE FIELDS:
1. complainantName - The name of the person filing the complaint
2. complainantAddress - The address of the complainant (if mentioned)
3. allOppositeParties - ALL opposite parties as an array. Each party has:
   - name: the entity/person name
   - role: their role (e.g. "seller", "manufacturer", "service provider", "marketplace", "builder")
   - liabilityType: one of "product_seller", "product_manufacturer", "service_provider", "other"
4. respondentName - Set to the FIRST party name from allOppositeParties (for backward compatibility)
5. productName - The specific product or service name
6. productAmount - The numeric amount paid (number or null if not stated)
7. incidentDates - Any dates mentioned related to the incident (as an array of strings)
8. timeline - Structured timeline as array of {date, event} objects in chronological order
9. grievanceSummary - A concise summary of the legal grievance
10. reliefSought - What the complainant wants as resolution/compensation
11. financialClaims - Breakdown: { productRefund: number|null, compensation: number|null, total: number|null }
12. originalLanguage - Detect whether the input is primarily in English ("en") or Hindi ("hi")
13. missingFields - Explicit list of field names that could not be extracted

RULES:
- If a field cannot be determined from the description, set it to "not provided" (for strings) or null (for numbers)
- For allOppositeParties, extract ALL entities the complainant is against (seller, manufacturer, platform, service provider). If only one is mentioned, the array has one entry.
- For incidentDates, extract all date references (exact dates, approximate dates, date ranges)
- For timeline, create chronological {date, event} pairs from the narrative
- For financialClaims, break down: productRefund = price paid, compensation = additional damages sought, total = sum
- For originalLanguage, detect based on the predominant language of the input text
- If the input contains Hindi script (Devanagari), set originalLanguage to "hi"
- respondentName MUST equal the name of the first entry in allOppositeParties (backward compatibility)
- missingFields should list any field names that are "not provided" or null
- If essential facts are missing (complainantName, respondentName, grievanceSummary, or reliefSought), generate specific follow-up questions to gather the missing information
- Generate at most 3 follow-up questions
- Each follow-up question should target a specific missing field
- If follow-up responses are provided, incorporate them into the extraction

When extraction is complete (all essential facts are present OR follow-up questions have been exhausted), set extractionComplete to true.
When essential facts are still missing and no follow-up responses have been provided yet, set extractionComplete to false and include followUpQuestions.

You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.

Response format:
{
  "complainantName": "<extracted name or 'not provided'>",
  "complainantAddress": "<extracted address or 'not provided'>",
  "allOppositeParties": [
    {"name": "<party name>", "role": "<role>", "liabilityType": "<product_seller|product_manufacturer|service_provider|other>"}
  ],
  "respondentName": "<first opposite party name or 'not provided'>",
  "productName": "<product/service name or 'not provided'>",
  "productAmount": <number or null>,
  "incidentDates": ["<date1>", "<date2>"] or "not provided",
  "timeline": [{"date": "<date>", "event": "<what happened>"}],
  "grievanceSummary": "<summary or 'not provided'>",
  "reliefSought": "<relief or 'not provided'>",
  "financialClaims": {"productRefund": <number|null>, "compensation": <number|null>, "total": <number|null>},
  "originalLanguage": "en" or "hi",
  "followUpQuestions": ["<question1>", "<question2>"],
  "extractionComplete": true or false,
  "missingFields": ["<field1>", "<field2>"]
}

You must respond with a single JSON object. Do not include markdown code blocks. Do not include any text before or after the JSON. Begin your response with { and end with }.`;

// --- Agent Implementation ---

export class ArzdarAgent implements BaseAgent<ArzdarInput, ArzdarOutput> {
  name = 'Arzdar' as const;
  systemPrompt = ARZDAR_SYSTEM_PROMPT;
  outputSchema: JSONSchema = ArzdarOutputSchema as unknown as JSONSchema;

  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  /**
   * Validates input length constraints.
   * Returns an error message if invalid, or null if valid.
   */
  validateInput(input: ArzdarInput): string | null {
    const len = input.problemDescription.length;
    if (len < MIN_DESCRIPTION_LENGTH) {
      return `Problem description must be at least ${MIN_DESCRIPTION_LENGTH} characters. Got ${len}.`;
    }
    if (len > MAX_DESCRIPTION_LENGTH) {
      return `Problem description must not exceed ${MAX_DESCRIPTION_LENGTH} characters. Got ${len}.`;
    }
    return null;
  }

  /**
   * Validates raw output against ArzdarOutputSchema.
   * Returns typed output if valid, null otherwise.
   */
  validateOutput(raw: unknown): ArzdarOutput | null {
    const result = ArzdarOutputSchema.safeParse(raw);
    if (result.success) {
      // Enforce max follow-up questions constraint
      if (result.data.followUpQuestions && result.data.followUpQuestions.length > MAX_FOLLOW_UP_QUESTIONS) {
        result.data.followUpQuestions = result.data.followUpQuestions.slice(0, MAX_FOLLOW_UP_QUESTIONS);
      }
      return result.data;
    }
    return null;
  }

  /**
   * Execute the Arzdar agent to extract facts from the problem description.
   */
  async execute(input: ArzdarInput): Promise<AgentExecutionResult<ArzdarOutput>> {
    const startTime = Date.now();

    // Validate input length
    const validationError = this.validateInput(input);
    if (validationError) {
      return {
        success: false,
        error: {
          category: 'schema_validation',
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

      // Handle follow-up exhaustion: if follow-up responses were provided,
      // mark extraction as complete and clear follow-up questions
      if (input.followUpResponses && input.followUpResponses.length >= MAX_FOLLOW_UP_QUESTIONS) {
        parsed.extractionComplete = true;
        delete parsed.followUpQuestions;
      }

      // Validate output against schema
      const validated = this.validateOutput(parsed);
      if (!validated) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'LLM output does not conform to ArzdarOutputSchema',
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
  private buildMessages(input: ArzdarInput): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: this.buildUserMessage(input) },
    ];

    return messages;
  }

  /**
   * Build the user message incorporating the problem description and any follow-up responses.
   */
  private buildUserMessage(input: ArzdarInput): string {
    let message = `Problem Description:\n${input.problemDescription}`;

    if (input.followUpResponses && input.followUpResponses.length > 0) {
      message += '\n\nFollow-up Responses:\n';
      input.followUpResponses.forEach((response, index) => {
        message += `${index + 1}. ${response}\n`;
      });
      message += '\nPlease incorporate these responses into the fact extraction. If all essential facts are now available, set extractionComplete to true.';
    }

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
