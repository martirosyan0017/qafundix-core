import { FrameworkError } from './framework-error.js';

/** Codes of the `FrameworkError`s that Core itself throws. */
export const ERROR_CODES = Object.freeze({
  CONFIG_VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',
  INVALID_ENVIRONMENT: 'INVALID_ENVIRONMENT',
  MISSING_ENVIRONMENT_VARIABLE: 'MISSING_ENVIRONMENT_VARIABLE',
  MISSING_ENVIRONMENT_VARIABLES: 'MISSING_ENVIRONMENT_VARIABLES',
  INVALID_ENVIRONMENT_VARIABLE: 'INVALID_ENVIRONMENT_VARIABLE',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  RETRY_TIMEOUT: 'RETRY_TIMEOUT',
  RETRY_ABORTED: 'RETRY_ABORTED',
  RETRY_ATTEMPT_TIMEOUT: 'RETRY_ATTEMPT_TIMEOUT',
} as const);

export type CoreErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Returns true when `error` is a `FrameworkError`, optionally with the given `code`.
 * Works as a TypeScript type guard: `if (isFrameworkError(error, ERROR_CODES.RETRY_TIMEOUT)) { … }`.
 */
export function isFrameworkError(error: unknown, code?: string): error is FrameworkError {
  return error instanceof FrameworkError && (code === undefined || error.code === code);
}
