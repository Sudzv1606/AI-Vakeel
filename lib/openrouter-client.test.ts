import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OpenRouterClient,
  OpenRouterConfig,
  OpenRouterError,
  ChatMessage,
  ChatCompletionResponse,
} from './openrouter-client';

// --- Test Helpers ---

const defaultConfig: OpenRouterConfig = {
  apiKey: 'test-api-key',
  model: 'anthropic/claude-3.5-sonnet',
  maxInputTokens: 4096,
  maxOutputTokens: 4096,
  timeoutMs: 60000,
  maxRetries: 2,
};

const testMessages: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello' },
];

const successResponse: ChatCompletionResponse = {
  id: 'chatcmpl-123',
  choices: [
    {
      message: { role: 'assistant', content: 'Hello! How can I help?' },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
};

function mockFetchResponse(status: number, body?: unknown, headers?: Record<string, string>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers || {}),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

// --- Tests ---

describe('OpenRouterClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('successful requests', () => {
    it('should return a valid ChatCompletionResponse on success', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      const result = await client.chatCompletion(testMessages);

      expect(result).toEqual(successResponse);
    });

    it('should send correct headers and body', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      await client.chatCompletion(testMessages);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-api-key');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('anthropic/claude-3.5-sonnet');
      expect(body.messages).toEqual(testMessages);
      expect(body.max_tokens).toBe(4096);
    });
  });

  describe('4xx client errors (no retry)', () => {
    it('should throw immediately on 400 without retrying', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(400, 'Bad Request')
      );

      const client = new OpenRouterClient(defaultConfig);

      try {
        await client.chatCompletion(testMessages);
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as OpenRouterError;
        expect(error.type).toBe('client_error');
        expect(error.statusCode).toBe(400);
        expect(error.attemptsUsed).toBe(1);
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately on 401 without retrying', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(401, 'Unauthorized')
      );

      const client = new OpenRouterClient(defaultConfig);

      try {
        await client.chatCompletion(testMessages);
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as OpenRouterError;
        expect(error.type).toBe('client_error');
        expect(error.statusCode).toBe(401);
        expect(error.attemptsUsed).toBe(1);
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately on 403 without retrying', async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(403, 'Forbidden')
      );

      const client = new OpenRouterClient(defaultConfig);

      try {
        await client.chatCompletion(testMessages);
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as OpenRouterError;
        expect(error.type).toBe('client_error');
        expect(error.statusCode).toBe(403);
        expect(error.attemptsUsed).toBe(1);
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('5xx server errors (retry with backoff)', () => {
    it('should retry on 500 and succeed on second attempt', async () => {
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(500, 'Internal Server Error'))
        .mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages);

      // Advance past the 1s backoff delay
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toEqual(successResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry twice on consecutive 500s and succeed on third attempt', async () => {
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(500, 'Error'))
        .mockResolvedValueOnce(mockFetchResponse(502, 'Bad Gateway'))
        .mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages);

      // First retry: 1s delay
      await vi.advanceTimersByTimeAsync(1000);
      // Second retry: 2s delay
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toEqual(successResponse);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should throw exhausted_retries after max attempts on 5xx', async () => {
      fetchMock
        .mockResolvedValue(mockFetchResponse(503, 'Service Unavailable'));

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages).catch((err) => err);

      // Advance through all backoff delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const error = (await promise) as OpenRouterError;
      expect(error.type).toBe('exhausted_retries');
      expect(error.attemptsUsed).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('timeout handling', () => {
    it('should abort request after configured timeout', async () => {
      fetchMock.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            const abortError = new DOMException('The operation was aborted.', 'AbortError');
            reject(abortError);
          });
        });
      });

      const client = new OpenRouterClient({ ...defaultConfig, timeoutMs: 5000, maxRetries: 0 });
      const promise = client.chatCompletion(testMessages).catch((err) => err);

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(5000);

      const error = (await promise) as OpenRouterError;
      expect(error.type).toBe('exhausted_retries');
      expect(error.message).toContain('timed out');
      expect(error.attemptsUsed).toBe(1);
    });

    it('should retry on timeout with exponential backoff', async () => {
      let callCount = 0;
      fetchMock.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        callCount++;
        if (callCount < 3) {
          return new Promise((_, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });
        }
        return Promise.resolve(mockFetchResponse(200, successResponse));
      });

      const client = new OpenRouterClient({ ...defaultConfig, timeoutMs: 1000 });
      const promise = client.chatCompletion(testMessages);

      // First attempt times out after 1s
      await vi.advanceTimersByTimeAsync(1000);
      // Backoff 1s
      await vi.advanceTimersByTimeAsync(1000);
      // Second attempt times out after 1s
      await vi.advanceTimersByTimeAsync(1000);
      // Backoff 2s
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toEqual(successResponse);
      expect(callCount).toBe(3);
    });
  });

  describe('429 rate limit handling', () => {
    it('should wait retry-after seconds before retrying on 429', async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockFetchResponse(429, 'Rate Limited', { 'retry-after': '5' })
        )
        .mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages);

      // Wait the 5s retry-after
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;
      expect(result).toEqual(successResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should cap retry-after wait at 30 seconds', async () => {
      fetchMock
        .mockResolvedValueOnce(
          mockFetchResponse(429, 'Rate Limited', { 'retry-after': '120' })
        )
        .mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages);

      // Should wait max 30s, not 120s
      await vi.advanceTimersByTimeAsync(30000);

      const result = await promise;
      expect(result).toEqual(successResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw exhausted_retries if rate limited on all attempts', async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse(429, 'Rate Limited', { 'retry-after': '2' })
      );

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages).catch((err) => err);

      // Wait through all rate limit waits
      await vi.advanceTimersByTimeAsync(2000); // first retry-after
      await vi.advanceTimersByTimeAsync(2000); // second retry-after

      const error = (await promise) as OpenRouterError;
      expect(error.type).toBe('rate_limit');
      expect(error.statusCode).toBe(429);
      expect(error.attemptsUsed).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should default to 1s wait when retry-after header is missing', async () => {
      fetchMock
        .mockResolvedValueOnce(mockFetchResponse(429, 'Rate Limited'))
        .mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient(defaultConfig);
      const promise = client.chatCompletion(testMessages);

      // Default 1s wait
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result).toEqual(successResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('configuration', () => {
    it('should use custom model from config', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, successResponse));

      const client = new OpenRouterClient({
        ...defaultConfig,
        model: 'openai/gpt-4',
      });
      await client.chatCompletion(testMessages);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.model).toBe('openai/gpt-4');
    });

    it('should respect maxRetries=0 (no retries)', async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse(500, 'Error'));

      const client = new OpenRouterClient({ ...defaultConfig, maxRetries: 0 });

      try {
        await client.chatCompletion(testMessages);
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as OpenRouterError;
        expect(error.type).toBe('exhausted_retries');
        expect(error.attemptsUsed).toBe(1);
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
