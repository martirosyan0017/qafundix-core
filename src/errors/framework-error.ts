import type { FrameworkErrorOptions } from '../types/common.types.js';

/** Error raised by Core, with a stable `code` for filtering and optional `metadata` and `cause`. */
export class FrameworkError extends Error {
  readonly code: string;
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(message: string, options: FrameworkErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'FrameworkError';
    this.code = options.code;
    this.metadata = options.metadata ?? {};
  }
}
