/**
 * Structured Logging Utility
 *
 * Provides a consistent logging interface with structured output.
 * Supports log levels and context metadata.
 *
 * Note: Uses stderr for all output to keep stdout clean for MCP communication.
 */

import type { LogLevel } from '../config/index.js';

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Log entry metadata
 */
export interface LogContext {
  /** Request or operation identifier */
  requestId?: string;
  /** Operation being performed */
  operation?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Additional structured data */
  [key: string]: unknown;
}

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private readonly level: LogLevel;
  private readonly prefix: string;

  constructor(config: LoggerConfig) {
    this.level = config.level;
    this.prefix = config.prefix ?? 'sim-mcp';
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  /**
   * Format and output a log entry
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    // Output to stderr to keep stdout clean for MCP protocol
    const output = JSON.stringify({
      ...entry,
      prefix: this.prefix,
    });
    process.stderr.write(`${output}\n`);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with additional context prefix
   */
  child(childPrefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix}:${childPrefix}`,
    });
  }
}

/**
 * Default logger instance
 * Will be initialized with config on server start
 */
let defaultLogger: Logger | null = null;

/**
 * Initialize the default logger with configuration
 */
export function initializeLogger(level: LogLevel): Logger {
  defaultLogger = new Logger({ level });
  return defaultLogger;
}

/**
 * Get the default logger instance
 * Falls back to info level if not initialized
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger({ level: 'info' });
  }
  return defaultLogger;
}

/**
 * Log request/response for debugging
 */
export function logRequest(
  logger: Logger,
  method: string,
  url: string,
  requestId: string,
  durationMs?: number
): void {
  logger.debug(`HTTP ${method} ${url}`, {
    requestId,
    operation: 'http_request',
    ...(durationMs !== undefined ? { durationMs } : {}),
  });
}

/**
 * Log API errors with structured context
 */
export function logApiError(
  logger: Logger,
  message: string,
  statusCode: number,
  requestId?: string,
  details?: Record<string, unknown>
): void {
  logger.error(message, {
    operation: 'api_error',
    statusCode,
    ...(requestId ? { requestId } : {}),
    ...(details ?? {}),
  });
}
