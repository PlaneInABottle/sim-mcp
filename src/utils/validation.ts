/**
 * Input Validation Utilities
 *
 * Shared helpers for validating required tool parameters before API calls.
 * Throws ValidationError with clear, actionable messages when parameters are missing.
 */

import { ValidationError } from '../client/errors.js';

/**
 * Validate that a single required string parameter is present and non-empty.
 *
 * @param value - The parameter value to validate
 * @param name - The parameter name (for error messages)
 * @param toolName - The tool name (for error messages)
 * @throws ValidationError if the value is missing or empty
 */
export function requireParam(
  value: unknown,
  name: string,
  toolName: string
): asserts value is string {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(
      `Missing required parameter '${name}' for ${toolName}`,
      { parameter: name, tool: toolName }
    );
  }
}

/**
 * Validate that all required parameters in a record are present and non-empty.
 *
 * @param params - Record of parameter names to their values
 * @param toolName - The tool name (for error messages)
 * @throws ValidationError listing all missing parameters
 */
export function requireParams(
  params: Record<string, unknown>,
  toolName: string
): void {
  const missing: string[] = [];

  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(name);
    }
  }

  if (missing.length === 1) {
    throw new ValidationError(
      `Missing required parameter '${missing[0]}' for ${toolName}`,
      { parameter: missing[0], tool: toolName }
    );
  }

  if (missing.length > 1) {
    throw new ValidationError(
      `Missing required parameters ${missing.map((p) => `'${p}'`).join(', ')} for ${toolName}`,
      { parameters: missing, tool: toolName }
    );
  }
}
