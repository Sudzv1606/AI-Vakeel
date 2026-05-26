import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OPENROUTER_API_KEY = "test-api-key";
    process.env.OPENROUTER_MODEL = "test-model";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load all environment variables into AppConfig", () => {
    const config = loadConfig();

    expect(config.openRouter.apiKey).toBe("test-api-key");
    expect(config.openRouter.model).toBe("test-model");
    expect(config.openRouter.maxInputTokens).toBe(4096);
    expect(config.openRouter.maxOutputTokens).toBe(4096);
    expect(config.openRouter.timeoutMs).toBe(60000);
    expect(config.openRouter.maxRetries).toBe(2);

    expect(config.supabase.url).toBe("https://test.supabase.co");
    expect(config.supabase.anonKey).toBe("test-anon-key");
    expect(config.supabase.serviceRoleKey).toBe("test-service-role-key");

    expect(config.pipeline.maxExecutionTimeMs).toBe(300000);
  });

  it("should use default model when OPENROUTER_MODEL is not set", () => {
    delete process.env.OPENROUTER_MODEL;

    const config = loadConfig();

    expect(config.openRouter.model).toBe("anthropic/claude-3.5-sonnet");
  });

  it("should throw when OPENROUTER_API_KEY is missing", () => {
    delete process.env.OPENROUTER_API_KEY;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable: OPENROUTER_API_KEY"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });

  it("should throw when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => loadConfig()).toThrow(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY"
    );
  });
});
