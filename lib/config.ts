/**
 * Application configuration loaded from environment variables.
 * All required environment variables must be set for the application to start.
 */

export interface AppConfig {
  openRouter: {
    apiKey: string;
    model: string;
    maxInputTokens: number;
    maxOutputTokens: number;
    timeoutMs: number;
    maxRetries: number;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  pipeline: {
    maxExecutionTimeMs: number;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Loads and validates all required environment variables into a typed AppConfig.
 * Throws an error if any required variable is missing.
 */
export function loadConfig(): AppConfig {
  return {
    openRouter: {
      apiKey: getRequiredEnv("OPENROUTER_API_KEY"),
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
      maxInputTokens: 4096,
      maxOutputTokens: 4096,
      timeoutMs: 60000,
      maxRetries: 2,
    },
    supabase: {
      url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      serviceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    },
    pipeline: {
      maxExecutionTimeMs: 300000, // 5 minutes
    },
  };
}
