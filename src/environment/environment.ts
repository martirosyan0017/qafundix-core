import { config as loadDotEnv } from 'dotenv';
import { ERROR_CODES } from '../errors/error-codes.js';
import { FrameworkError } from '../errors/framework-error.js';
import { ENVIRONMENTS, type EnvironmentName } from '../types/common.types.js';

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

let dotEnvLoaded = false;

/** Options for `EnvironmentManager.getNumber`. */
export interface NumberVariableOptions {
  integer?: boolean;
  min?: number;
  max?: number;
}

/** Reads environment variables as text, numbers, booleans, URLs or allowed values. */
export class EnvironmentManager {
  constructor(private readonly variables: NodeJS.ProcessEnv = process.env) {
    // Load the default .env file once per process, and only for the real process environment.
    if (variables === process.env && !dotEnvLoaded) {
      loadDotEnv({ quiet: true });
      dotEnvLoaded = true;
    }
  }

  get name(): EnvironmentName {
    const value = this.variables.NODE_ENV ?? 'development';
    if ((ENVIRONMENTS as readonly string[]).includes(value)) return value as EnvironmentName;
    throw new FrameworkError(`Unsupported NODE_ENV value: ${value}`, {
      code: ERROR_CODES.INVALID_ENVIRONMENT,
      metadata: { variable: 'NODE_ENV', value },
    });
  }

  get(key: string): string | undefined {
    return this.variables[key];
  }

  require(key: string): string {
    const value = this.get(key)?.trim();
    if (!value) {
      throw new FrameworkError(`Required environment variable ${key} is missing or empty`, {
        code: ERROR_CODES.MISSING_ENVIRONMENT_VARIABLE,
        metadata: { variable: key },
      });
    }
    return value;
  }

  validateRequired(keys: readonly string[]): void {
    const missing = keys.filter((key) => !this.variables[key]?.trim());
    if (missing.length) {
      throw new FrameworkError(`Missing required environment variables: ${missing.join(', ')}`, {
        code: ERROR_CODES.MISSING_ENVIRONMENT_VARIABLES,
        metadata: { variables: missing },
      });
    }
  }

  /** Reads a number. Missing or empty values return `defaultValue`; invalid values throw. */
  getNumber(
    key: string,
    defaultValue?: undefined,
    options?: NumberVariableOptions,
  ): number | undefined;
  getNumber(key: string, defaultValue: number, options?: NumberVariableOptions): number;
  getNumber(
    key: string,
    defaultValue?: number,
    options: NumberVariableOptions = {},
  ): number | undefined {
    const raw = this.#trimmed(key);
    if (raw === undefined) return defaultValue;
    const value = Number(raw);
    const { integer = false, min, max } = options;
    if (
      !Number.isFinite(value) ||
      (integer && !Number.isInteger(value)) ||
      (min !== undefined && value < min) ||
      (max !== undefined && value > max)
    ) {
      const rules = [
        integer ? 'an integer' : 'a number',
        min !== undefined ? `>= ${min}` : '',
        max !== undefined ? `<= ${max}` : '',
      ].filter(Boolean);
      throw this.#invalid(key, `must be ${rules.join(' ')}`);
    }
    return value;
  }

  /** Reads a boolean: true/false, 1/0, yes/no, on/off (any case). */
  getBoolean(key: string, defaultValue?: undefined): boolean | undefined;
  getBoolean(key: string, defaultValue: boolean): boolean;
  getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
    const raw = this.#trimmed(key)?.toLowerCase();
    if (raw === undefined) return defaultValue;
    if (TRUE_VALUES.has(raw)) return true;
    if (FALSE_VALUES.has(raw)) return false;
    throw this.#invalid(key, 'must be true/false, 1/0, yes/no, or on/off');
  }

  /** Reads an absolute http(s) URL. */
  getUrl(key: string, defaultValue?: undefined): URL | undefined;
  getUrl(key: string, defaultValue: string | URL): URL;
  getUrl(key: string, defaultValue?: string | URL): URL | undefined {
    const raw = this.#trimmed(key);
    if (raw === undefined) return defaultValue === undefined ? undefined : new URL(defaultValue);
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw this.#invalid(key, 'must be an absolute URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      throw this.#invalid(key, 'must use http or https');
    return url;
  }

  /** Reads a value that must be one of `allowed`. */
  oneOf<const T extends string>(
    key: string,
    allowed: readonly T[],
    defaultValue?: undefined,
  ): T | undefined;
  oneOf<const T extends string>(key: string, allowed: readonly T[], defaultValue: T): T;
  oneOf<const T extends string>(
    key: string,
    allowed: readonly T[],
    defaultValue?: T,
  ): T | undefined {
    const raw = this.#trimmed(key);
    if (raw === undefined) return defaultValue;
    if ((allowed as readonly string[]).includes(raw)) return raw as T;
    throw this.#invalid(key, `must be one of: ${allowed.join(', ')}`);
  }

  #trimmed(key: string): string | undefined {
    const value = this.variables[key]?.trim();
    return value ? value : undefined;
  }

  // The raw value is left out of the message and metadata in case it is a secret.
  #invalid(key: string, rule: string): FrameworkError {
    return new FrameworkError(`Environment variable ${key} ${rule}`, {
      code: ERROR_CODES.INVALID_ENVIRONMENT_VARIABLE,
      metadata: { variable: key },
    });
  }
}
