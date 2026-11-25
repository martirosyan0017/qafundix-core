import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';
import type { LogLevel } from '../types/common.types.js';

/** Key patterns redacted by default. Matching is case-insensitive and by substring. */
export const DEFAULT_REDACT_KEYS: readonly string[] = Object.freeze([
  'password',
  'passwd',
  'passphrase',
  'token',
  'secret',
  'authorization',
  'bearer',
  'api_key',
  'apikey',
  'api-key',
  'private_key',
  'privatekey',
  'private-key',
  'credential',
  'cookie',
  'session',
]);

/** Controls which structured-data keys the logger replaces with a censor value. */
export interface RedactionOptions {
  /**
   * Extra key patterns. Strings match case-insensitively as substrings; RegExps are tested as given.
   * They are added to `DEFAULT_REDACT_KEYS` unless `replaceDefaults` is true.
   */
  keys?: ReadonlyArray<string | RegExp>;
  /** Use only `keys` and drop the default list. Defaults to false. */
  replaceDefaults?: boolean;
  /** Replacement text. Defaults to `[REDACTED]`. */
  censor?: string;
}

/** Options for creating a `Logger`. */
export interface LoggerConstructorOptions {
  level?: LogLevel;
  name?: string;
  pinoOptions?: LoggerOptions;
  destination?: pino.DestinationStream;
  redaction?: RedactionOptions;
}

interface Redactor {
  isSecret: (key: string) => boolean;
  censor: string;
}

function createRedactor(options: RedactionOptions = {}): Redactor {
  const { keys = [], replaceDefaults = false, censor = '[REDACTED]' } = options;
  const patterns = [...(replaceDefaults ? [] : DEFAULT_REDACT_KEYS), ...keys];
  for (const pattern of patterns) {
    if (typeof pattern === 'string' && !pattern.trim())
      throw new TypeError('Redaction keys must be non-empty strings or RegExp objects');
  }
  const words = patterns
    .filter((pattern): pattern is string => typeof pattern === 'string')
    .map((word) => word.toLowerCase());
  const expressions = patterns.filter((pattern): pattern is RegExp => pattern instanceof RegExp);
  return {
    censor,
    isSecret: (key) => {
      const lower = key.toLowerCase();
      return (
        words.some((word) => lower.includes(word)) ||
        expressions.some((expression) => {
          expression.lastIndex = 0; // `g` and `y` RegExps remember where the last match ended
          return expression.test(key);
        })
      );
    },
  };
}

function redact(value: unknown, redactor: Redactor, seen = new WeakSet<object>()): unknown {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  const field = (key: string, item: unknown): unknown =>
    redactor.isSecret(key) ? redactor.censor : redact(item, redactor, seen);

  if (Array.isArray(value)) {
    const result = value.map((item) => redact(item, redactor, seen));
    seen.delete(value);
    return result;
  }

  if (value instanceof Error) {
    const fields = Object.fromEntries(
      Object.getOwnPropertyNames(value).map((key) => [
        key,
        field(key, (value as Error & Record<string, unknown>)[key]),
      ]),
    );
    seen.delete(value);
    return { type: value.name, ...fields };
  }

  // Class instances (Date, URL, Buffer, Map, your own classes) are passed to Pino unchanged:
  // copying their own enumerable keys would lose their state. Their fields are not redacted.
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    seen.delete(value);
    return value;
  }

  const result = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, field(key, item)]),
  );
  seen.delete(value);
  return result;
}

// `child()` needs a Logger that wraps an existing Pino child instead of creating a new Pino
// instance. Passing it through this variable keeps that out of the public constructor signature.
// It is set and consumed synchronously inside `child()`, so concurrent use cannot interleave.
let adopted: { instance: PinoLogger; redactor: Redactor } | undefined;

/** Structured Pino logger that redacts secret-looking keys in structured data and bindings. */
export class Logger {
  readonly #logger: PinoLogger;
  readonly #redactor: Redactor;

  constructor(options: LoggerConstructorOptions = {}) {
    if (adopted) {
      this.#logger = adopted.instance;
      this.#redactor = adopted.redactor;
      adopted = undefined;
      return;
    }
    this.#redactor = createRedactor(options.redaction);
    this.#logger = pino(
      {
        ...(options.name ? { name: options.name } : {}),
        level: options.level ?? 'info',
        ...options.pinoOptions,
      },
      options.destination,
    );
  }

  /**
   * Creates a logger that adds `bindings` to every line, for example a test name or worker id.
   * Bindings are redacted with the parent's rules. The child shares the parent's destination.
   */
  child(bindings: Record<string, unknown>, options: { level?: LogLevel } = {}): Logger {
    const safeBindings = redact(bindings, this.#redactor) as Record<string, unknown>;
    adopted = { instance: this.#logger.child(safeBindings, options), redactor: this.#redactor };
    return new Logger();
  }

  get level(): string {
    return this.#logger.level;
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.#logger.trace(this.#safe(data), message);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.#logger.debug(this.#safe(data), message);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.#logger.info(this.#safe(data), message);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.#logger.warn(this.#safe(data), message);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.#logger.error(this.#safe(data), message);
  }

  fatal(message: string, data?: Record<string, unknown>): void {
    this.#logger.fatal(this.#safe(data), message);
  }

  #safe(data: Record<string, unknown> | undefined): unknown {
    return redact(data ?? {}, this.#redactor);
  }
}
