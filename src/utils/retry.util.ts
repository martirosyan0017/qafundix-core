import { ERROR_CODES } from '../errors/error-codes.js';
import { FrameworkError } from '../errors/framework-error.js';
import type { RetryOptions } from '../types/common.types.js';

const TOTAL_TIMEOUT = Symbol('retry-total-timeout');

function validate(options: RetryOptions): void {
  const { attempts, delayMs = 0, maxDelayMs, timeoutMs, attemptTimeoutMs } = options;
  if (!Number.isInteger(attempts) || attempts < 1)
    throw new RangeError(`attempts must be a positive integer, received ${String(attempts)}`);
  if (!Number.isFinite(delayMs) || delayMs < 0)
    throw new RangeError(`delayMs must be a non-negative number, received ${String(delayMs)}`);
  for (const [name, value] of [
    ['maxDelayMs', maxDelayMs],
    ['timeoutMs', timeoutMs],
    ['attemptTimeoutMs', attemptTimeoutMs],
  ] as const) {
    if (value !== undefined && (Number.isNaN(value) || value < 0))
      throw new RangeError(`${name} must be a non-negative number, received ${String(value)}`);
  }
}

/** Builds the error thrown when the run stops because of `signal` or `timeoutMs`. */
function stoppedError(signal: AbortSignal, attempt: number, timeoutMs?: number): FrameworkError {
  if (signal.reason === TOTAL_TIMEOUT) {
    return new FrameworkError(`Retry timed out after ${timeoutMs} ms`, {
      code: ERROR_CODES.RETRY_TIMEOUT,
      metadata: { attempt, timeoutMs },
    });
  }
  return new FrameworkError('Retry was aborted', {
    code: ERROR_CODES.RETRY_ABORTED,
    metadata: { attempt },
    cause: signal.reason,
  });
}

/** Resolves after `ms`, or rejects with `onAbort()` as soon as `signal` aborts. */
function wait(ms: number, signal: AbortSignal, onAbort: () => unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(onAbort());
      return;
    }
    const abort = (): void => {
      clearTimeout(timer);
      reject(onAbort());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** A promise that rejects with `onAbort()` when `signal` aborts; call `cleanup` when done with it. */
function whenAborted(
  signal: AbortSignal,
  onAbort: () => unknown,
): { promise: Promise<never>; cleanup: () => void } {
  let abort = (): void => {};
  const promise = new Promise<never>((_, reject) => {
    abort = (): void => reject(onAbort());
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
  return { promise, cleanup: () => signal.removeEventListener('abort', abort) };
}

/** Computes the wait that follows the failed `attempt`. */
function delayFor(attempt: number, options: RetryOptions): number {
  const { delayMs = 0, backoff = 'fixed', maxDelayMs = Infinity, jitter = false } = options;
  const base = backoff === 'exponential' ? delayMs * 2 ** (attempt - 1) : delayMs;
  const capped = Math.min(base, maxDelayMs);
  return jitter ? Math.floor(Math.random() * capped) : capped;
}

/**
 * Runs one attempt. With `attemptTimeoutMs`, the attempt fails with `RETRY_ATTEMPT_TIMEOUT`
 * if it takes longer, and the signal passed to the operation is aborted so it can clean up.
 */
async function runAttempt<T>(
  operation: (attempt: number, signal: AbortSignal) => Promise<T>,
  attempt: number,
  runSignal: AbortSignal,
  attemptTimeoutMs: number | undefined,
): Promise<T> {
  if (attemptTimeoutMs === undefined) return operation(attempt, runSignal);

  const attemptController = new AbortController();
  const signal = AbortSignal.any([runSignal, attemptController.signal]);
  const timeoutError = new FrameworkError(
    `Attempt ${attempt} timed out after ${attemptTimeoutMs} ms`,
    { code: ERROR_CODES.RETRY_ATTEMPT_TIMEOUT, metadata: { attempt, attemptTimeoutMs } },
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      attemptController.abort(timeoutError);
      reject(timeoutError);
    }, attemptTimeoutMs);
  });
  try {
    return await Promise.race([operation(attempt, signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs an async operation with explicit retry settings.
 *
 * - Exhausted attempts throw `FrameworkError` `RETRY_EXHAUSTED` with the last error as `cause`.
 * - When `shouldRetry` returns false, the original error is rethrown unchanged.
 * - When `signal` aborts, `FrameworkError` `RETRY_ABORTED` is thrown.
 * - When `timeoutMs` passes, `FrameworkError` `RETRY_TIMEOUT` is thrown.
 * - An attempt longer than `attemptTimeoutMs` fails with `RETRY_ATTEMPT_TIMEOUT` and may be retried.
 */
export async function retry<T>(
  operation: (attempt: number, signal: AbortSignal) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  validate(options);
  const { attempts, shouldRetry, onRetry, signal: callerSignal, timeoutMs } = options;

  const totalController = new AbortController();
  const totalTimer =
    timeoutMs === undefined
      ? undefined
      : setTimeout(() => totalController.abort(TOTAL_TIMEOUT), timeoutMs);
  const runSignal = callerSignal
    ? AbortSignal.any([callerSignal, totalController.signal])
    : totalController.signal;

  try {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const stop = (): FrameworkError => stoppedError(runSignal, attempt, timeoutMs);
      if (runSignal.aborted) throw stop();
      try {
        const attemptResult = runAttempt(operation, attempt, runSignal, options.attemptTimeoutMs);
        // Stop waiting for a running attempt as soon as the whole run is aborted or times out.
        const aborted = whenAborted(runSignal, stop);
        try {
          return await Promise.race([attemptResult, aborted.promise]);
        } finally {
          aborted.cleanup();
        }
      } catch (error) {
        if (runSignal.aborted) throw stop();
        lastError = error;
        if (shouldRetry && !(await shouldRetry(error, attempt))) throw error;
        if (attempt < attempts) {
          const nextDelay = delayFor(attempt, options);
          await onRetry?.({ attempt, error, delayMs: nextDelay });
          if (nextDelay > 0) await wait(nextDelay, runSignal, stop);
        }
      }
    }
    throw new FrameworkError(
      `Operation failed after ${attempts} attempt${attempts === 1 ? '' : 's'}`,
      { code: ERROR_CODES.RETRY_EXHAUSTED, metadata: { attempts }, cause: lastError },
    );
  } finally {
    clearTimeout(totalTimer);
  }
}
