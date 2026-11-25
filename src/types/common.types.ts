export const ENVIRONMENTS = ['development', 'staging', 'production', 'test'] as const;
export type EnvironmentName = (typeof ENVIRONMENTS)[number];
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface CommonConfig {
  environment: EnvironmentName;
  logLevel: LogLevel;
}

/** Details passed to `RetryOptions.onRetry` before the next attempt starts. */
export interface RetryAttemptInfo {
  /** The attempt that just failed, starting at 1. */
  attempt: number;
  /** The error thrown by the failed attempt. */
  error: unknown;
  /** How long the helper will wait before the next attempt. */
  delayMs: number;
}

export interface RetryOptions {
  /** Total number of attempts, including the first one. */
  attempts: number;
  /** Base delay between attempts. Defaults to 0. */
  delayMs?: number;
  /** `fixed` waits `delayMs` every time; `exponential` doubles it after each failure. */
  backoff?: 'fixed' | 'exponential';
  /** Upper limit for a single wait, applied after backoff. */
  maxDelayMs?: number;
  /** When true, each wait is a random value between 0 and the computed delay. */
  jitter?: boolean;
  /**
   * Decides whether a failure is worth another attempt. Returning false rethrows the
   * original error immediately. Defaults to retrying every error.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
  /** Called after a retryable failure, before waiting for the next attempt. */
  onRetry?: (info: RetryAttemptInfo) => void | Promise<void>;
  /** Cancels the run, including a running attempt or a wait. Throws `RETRY_ABORTED`. */
  signal?: AbortSignal;
  /** Time limit for the whole run, including waits. Throws `RETRY_TIMEOUT` when it passes. */
  timeoutMs?: number;
  /**
   * Time limit for each attempt. A slow attempt fails with `RETRY_ATTEMPT_TIMEOUT`
   * and counts as a normal failure, so it can be retried.
   */
  attemptTimeoutMs?: number;
}

export interface FrameworkErrorOptions {
  code: string;
  metadata?: Readonly<Record<string, unknown>>;
  cause?: unknown;
}
