/**
 * Authentication Utilities
 *
 * Handles API key management and authentication headers.
 */

/**
 * Authentication header name for sim API
 * Uses x-admin-key for admin API endpoints
 */
export const AUTH_HEADER = 'x-admin-key';

/**
 * Authorization header for bearer tokens
 */
export const BEARER_HEADER = 'Authorization';

/**
 * Create authentication headers for API requests
 *
 * @param apiKey - The API key for authentication
 * @returns Headers object with authentication
 */
export function createAuthHeaders(apiKey: string): Record<string, string> {
  return {
    [AUTH_HEADER]: apiKey,
  };
}

/**
 * Create bearer token headers (for internal JWT auth)
 *
 * @param token - The bearer token
 * @returns Headers object with bearer authentication
 */
export function createBearerHeaders(token: string): Record<string, string> {
  return {
    [BEARER_HEADER]: `Bearer ${token}`,
  };
}

/**
 * Mask API key for logging (show first and last 4 characters)
 *
 * @param apiKey - The API key to mask
 * @returns Masked API key string
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '****';
  }
  const start = apiKey.slice(0, 4);
  const end = apiKey.slice(-4);
  return `${start}...${end}`;
}

/**
 * Validate API key format
 *
 * @param apiKey - The API key to validate
 * @returns true if the API key format is valid
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Basic validation: non-empty string with reasonable length
  return typeof apiKey === 'string' && apiKey.length >= 16 && apiKey.length <= 256;
}

/**
 * API key configuration
 */
export interface AuthConfig {
  /** The API key for authentication */
  apiKey: string;
  /** Whether to validate the API key format */
  validateFormat?: boolean;
}

/**
 * Create an auth manager for handling API key operations
 */
export class AuthManager {
  private apiKey: string;

  constructor(config: AuthConfig) {
    if (config.validateFormat && !isValidApiKeyFormat(config.apiKey)) {
      throw new Error('Invalid API key format');
    }
    this.apiKey = config.apiKey;
  }

  /**
   * Get authentication headers for requests
   */
  getHeaders(): Record<string, string> {
    return createAuthHeaders(this.apiKey);
  }

  /**
   * Update the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get masked API key for logging
   */
  getMaskedKey(): string {
    return maskApiKey(this.apiKey);
  }

  /**
   * Check if API key is set
   */
  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }
}
