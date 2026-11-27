import type { ZodType } from 'zod';
import { ERROR_CODES } from '../errors/error-codes.js';
import { FrameworkError } from '../errors/framework-error.js';

/** Validates a value against a Zod schema and returns the parsed result. */
export class ConfigLoader {
  static load<T>(raw: unknown, schema: ZodType<T>): T {
    const result = schema.safeParse(raw);
    if (result.success) return result.data;

    const { issues } = result.error;
    const details = issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`);
    // Only paths and messages are copied; input values may contain secrets.
    throw new FrameworkError(`Configuration validation failed: ${details.join('; ')}`, {
      code: ERROR_CODES.CONFIG_VALIDATION_FAILED,
      metadata: { issues: issues.map(({ path, code, message }) => ({ path, code, message })) },
      cause: result.error,
    });
  }
}
