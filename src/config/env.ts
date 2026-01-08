/**
 * Environment Configuration Schema
 *
 * Validates and provides typed access to environment variables.
 * Uses Zod for runtime validation and type inference.
 */

import { z } from 'zod';

/**
 * Log level enum for structured logging
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * Environment variable schema with validation rules
 */
export const EnvSchema = z.object({
  /**
   * Base URL of the sim backend API
   * @example "http://localhost:3000" or "https://api.sim.example.com"
   */
  SIM_API_BASE_URL: z
    .string()
    .url('SIM_API_BASE_URL must be a valid URL')
    .describe('Base URL of the sim backend API'),

  /**
   * API key for authentication with the sim backend
   * Must be a non-empty string
   */
  SIM_API_KEY: z
    .string()
    .min(1, 'SIM_API_KEY is required')
    .describe('API key for sim authentication'),

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  SIM_TIMEOUT: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 30000))
    .pipe(z.number().min(1000).max(300000))
    .describe('Request timeout in milliseconds'),

  /**
   * Number of retry attempts for failed requests
   * @default 3
   */
  SIM_RETRIES: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : 3))
    .pipe(z.number().min(0).max(10))
    .describe('Number of retry attempts'),

  /**
   * Log level for structured logging
   * @default "info"
   */
  LOG_LEVEL: LogLevelSchema.optional().default('info'),
});

/**
 * Inferred type from the environment schema
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * Validated configuration object type
 */
export interface SimMcpConfig {
  /** Base URL of the sim API */
  apiBaseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts */
  retries: number;
  /** Logging level */
  logLevel: LogLevel;
}

/**
 * Configuration validation error
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Load and validate environment variables
 *
 * @throws {ConfigurationError} When required environment variables are missing or invalid
 * @returns Validated environment configuration
 */
export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues;
    const errorMessages = issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new ConfigurationError(`Invalid configuration:\n${errorMessages}`, issues);
  }

  return result.data;
}

/**
 * Convert raw environment to typed configuration object
 *
 * @param env - Validated environment variables
 * @returns Typed configuration object
 */
export function createConfig(env: Env): SimMcpConfig {
  return {
    apiBaseUrl: env.SIM_API_BASE_URL,
    apiKey: env.SIM_API_KEY,
    timeout: env.SIM_TIMEOUT,
    retries: env.SIM_RETRIES,
    logLevel: env.LOG_LEVEL,
  };
}

/**
 * Load environment and create configuration in one step
 *
 * @throws {ConfigurationError} When configuration is invalid
 * @returns Typed configuration object
 */
export function loadConfig(): SimMcpConfig {
  const env = loadEnv();
  return createConfig(env);
}
