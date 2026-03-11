/**
 * Error Types and Handlers
 *
 * Custom error classes for the sim-mcp server.
 * Provides structured error handling for API operations.
 */

/**
 * Error code enumeration for consistent error identification
 */
export enum SimErrorCode {
  // Authentication errors (401)
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_API_KEY = 'INVALID_API_KEY',

  // Authorization errors (403)
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  BLOCK_NOT_FOUND = 'BLOCK_NOT_FOUND',
  EDGE_NOT_FOUND = 'EDGE_NOT_FOUND',
  EXECUTION_NOT_FOUND = 'EXECUTION_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Rate limiting (429)
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Error details for structured error responses
 */
export interface ErrorDetails {
  /** Additional context about the error */
  [key: string]: unknown;
}

/**
 * Base error class for sim API errors
 */
export class SimApiError extends Error {
  /** HTTP status code associated with the error */
  public readonly statusCode: number;

  /** Error code for programmatic handling */
  public readonly code: SimErrorCode;

  /** Additional error details */
  public readonly details?: ErrorDetails;

  /** Whether this error is retryable */
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: SimErrorCode,
    details?: ErrorDetails,
    retryable = false
  ) {
    super(message);
    this.name = 'SimApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.retryable = retryable;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON for logging or API response
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

/**
 * Authentication error - Invalid or missing API key
 */
export class AuthenticationError extends SimApiError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, SimErrorCode.AUTHENTICATION_ERROR, undefined, false);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - Access denied
 */
export class AuthorizationError extends SimApiError {
  constructor(message = 'Access denied') {
    super(message, 403, SimErrorCode.AUTHORIZATION_ERROR, undefined, false);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error - Resource does not exist
 */
export class NotFoundError extends SimApiError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404, SimErrorCode.NOT_FOUND, {
      resource,
      id,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error - Invalid input data
 */
export class ValidationError extends SimApiError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 400, SimErrorCode.VALIDATION_ERROR, details, false);
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit error - Too many requests
 */
export class RateLimitError extends SimApiError {
  /** Time in seconds until rate limit resets */
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      429,
      SimErrorCode.RATE_LIMIT_ERROR,
      {
        retryAfter,
      },
      true
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Network error - Connection or transport failure
 */
export class NetworkError extends SimApiError {
  constructor(message: string, originalError?: Error) {
    super(
      message,
      0,
      SimErrorCode.NETWORK_ERROR,
      {
        originalMessage: originalError?.message,
      },
      true
    );
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error - Request exceeded timeout
 */
export class TimeoutError extends SimApiError {
  constructor(timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      0,
      SimErrorCode.TIMEOUT_ERROR,
      {
        timeoutMs,
      },
      true
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Internal error - Server-side error
 */
export class InternalError extends SimApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, SimErrorCode.INTERNAL_ERROR, undefined, true);
    this.name = 'InternalError';
  }
}

/**
 * Map HTTP status code to appropriate error class
 */
export function mapHttpError(
  statusCode: number,
  message?: string,
  details?: ErrorDetails
): SimApiError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message ?? 'Invalid request', details);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError('Resource', (details?.id as string) ?? 'unknown');
    case 429: {
      const retryAfter = details?.retryAfter as number | undefined;
      return new RateLimitError(retryAfter);
    }
    case 500:
    case 502:
    case 503:
    case 504:
      return new InternalError(message);
    default:
      return new SimApiError(
        message ?? 'Unknown error',
        statusCode,
        SimErrorCode.INTERNAL_ERROR,
        details,
        statusCode >= 500
      );
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SimApiError) {
    return error.retryable;
  }
  return false;
}

/**
 * Format error for MCP response
 */
export function formatMcpError(error: unknown): {
  code: string;
  message: string;
  statusCode?: number;
  data?: Record<string, unknown>;
} {
  if (error instanceof SimApiError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      data: error.details ? { details: error.details } : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      code: SimErrorCode.INTERNAL_ERROR,
      message: error.message,
    };
  }

  return {
    code: SimErrorCode.INTERNAL_ERROR,
    message: 'An unknown error occurred',
  };
}
