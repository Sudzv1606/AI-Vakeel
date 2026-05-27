/**
 * OpenRouter HTTP client for LLM inference.
 * Handles retry with exponential backoff, rate-limit wait, and timeout.
 */

// --- Interfaces ---

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  maxInputTokens: number;  // 4096
  maxOutputTokens: number; // 4096
  timeoutMs: number;       // 60000
  maxRetries: number;      // 2
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface OpenRouterError {
  type: 'rate_limit' | 'client_error' | 'server_error' | 'timeout' | 'exhausted_retries';
  statusCode: number;
  message: string;
  attemptsUsed: number;
}

// --- Constants ---

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RATE_LIMIT_WAIT_MS = 30000;

// --- Helper ---

function isOpenRouterError(value: unknown): value is OpenRouterError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'statusCode' in value &&
    'message' in value &&
    'attemptsUsed' in value
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Client ---

export class OpenRouterClient {
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = config;
  }

  /**
   * Send a chat completion request to OpenRouter API.
   * Handles timeout, retries with exponential backoff for 5xx/timeout,
   * rate-limit wait for 429, and immediate failure for other 4xx errors.
   */
  async chatCompletion(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
    const maxAttempts = 1 + this.config.maxRetries; // 1 initial + up to maxRetries retries
    let lastError: OpenRouterError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.makeRequest(messages);

        if (response.ok) {
          const data = (await response.json()) as ChatCompletionResponse;
          // Validate the response has the expected structure
          if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            lastError = {
              type: 'server_error',
              statusCode: 200,
              message: `OpenRouter returned invalid response: missing choices array. Response: ${JSON.stringify(data).substring(0, 200)}`,
              attemptsUsed: attempt,
            };
            if (attempt < maxAttempts) {
              const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
              await sleep(delayMs);
              continue;
            }
            break;
          }
          return data;
        }

        // Handle non-OK responses
        const status = response.status;

        // 429 Rate Limit
        if (status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          const retryAfterMs = this.parseRetryAfter(retryAfterHeader);
          const waitMs = Math.min(retryAfterMs, MAX_RATE_LIMIT_WAIT_MS);

          if (attempt < maxAttempts) {
            await sleep(waitMs);
            continue;
          }

          // Exhausted retries on rate limit
          lastError = {
            type: 'rate_limit',
            statusCode: 429,
            message: `Rate limited after ${attempt} attempt(s). Retry-after: ${retryAfterMs}ms`,
            attemptsUsed: attempt,
          };
          break;
        }

        // 4xx Client Error (not 429) — no retry
        if (status >= 400 && status < 500) {
          const body = await this.safeReadBody(response);
          const error: OpenRouterError = {
            type: 'client_error',
            statusCode: status,
            message: body || `Client error: ${status}`,
            attemptsUsed: attempt,
          };
          throw error;
        }

        // 5xx Server Error — retry with backoff
        if (status >= 500) {
          lastError = {
            type: 'server_error',
            statusCode: status,
            message: `Server error: ${status}`,
            attemptsUsed: attempt,
          };

          if (attempt < maxAttempts) {
            const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            await sleep(delayMs);
            continue;
          }
          break;
        }

        // Unexpected status
        lastError = {
          type: 'server_error',
          statusCode: status,
          message: `Unexpected status: ${status}`,
          attemptsUsed: attempt,
        };
        break;
      } catch (err: unknown) {
        // Re-throw if it's already an OpenRouterError (e.g., 4xx)
        if (isOpenRouterError(err)) {
          throw err;
        }

        // Timeout or network error — retry with backoff
        const isTimeout =
          err instanceof DOMException && err.name === 'AbortError';

        lastError = {
          type: isTimeout ? 'timeout' : 'server_error',
          statusCode: 0,
          message: isTimeout
            ? `Request timed out after ${this.config.timeoutMs}ms`
            : `Network error: ${err instanceof Error ? err.message : String(err)}`,
          attemptsUsed: attempt,
        };

        if (attempt < maxAttempts) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delayMs);
          continue;
        }
        break;
      }
    }

    // All retries exhausted — preserve the original error type for rate_limit
    if (lastError && lastError.type === 'rate_limit') {
      throw { ...lastError, attemptsUsed: maxAttempts };
    }

    const finalError: OpenRouterError = lastError
      ? { ...lastError, type: 'exhausted_retries', attemptsUsed: maxAttempts }
      : {
          type: 'exhausted_retries',
          statusCode: 0,
          message: 'All retry attempts exhausted',
          attemptsUsed: maxAttempts,
        };

    throw finalError;
  }

  /**
   * Make a single HTTP request to OpenRouter with timeout via AbortController.
   */
  private async makeRequest(messages: ChatMessage[]): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxOutputTokens,
        }),
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse the retry-after header value.
   * Supports seconds (integer) format. Defaults to 1000ms if unparseable.
   */
  private parseRetryAfter(headerValue: string | null): number {
    if (!headerValue) {
      return INITIAL_RETRY_DELAY_MS;
    }

    const seconds = Number(headerValue);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }

    return INITIAL_RETRY_DELAY_MS;
  }

  /**
   * Safely read response body as text, returning empty string on failure.
   */
  private async safeReadBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}
