// Retry with timeouts and cancellation, child loggers with custom redaction, and string helpers.
import {
  FrameworkError,
  Logger,
  normalizeWhitespace,
  retry,
  toCamelCase,
} from '@martirosyan0017/qafundix-core';

// A plain field instead of a constructor parameter property keeps this file runnable with
// `node examples/resilient-checks.ts` (Node.js only strips types; it does not transform syntax).
class HttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

const logger = new Logger({
  name: 'resilient-checks',
  redaction: { keys: ['iban'], censor: '***' },
});

// Every line from this child carries the test name and worker; its bindings are redacted too.
const testLogger = logger.child({ testName: toCamelCase('Checkout Flow'), worker: 1 });

async function fetchStatus(url: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new HttpError(response.status);
  return response.status;
}

try {
  const status = await retry((_attempt, signal) => fetchStatus('https://example.com', signal), {
    attempts: 4,
    delayMs: 200,
    backoff: 'exponential',
    maxDelayMs: 2_000,
    jitter: true,
    // Client errors (4xx) will not fix themselves, so fail fast on them.
    shouldRetry: (error) => !(error instanceof HttpError && error.status < 500),
    onRetry: ({ attempt, delayMs, error }) =>
      testLogger.warn('Retrying status check', { attempt, delayMs, error }),
    attemptTimeoutMs: 5_000,
    timeoutMs: 20_000,
  });
  testLogger.info('Status check passed', { status, iban: 'AM00 0000' }); // iban is logged as ***
} catch (error) {
  if (error instanceof FrameworkError) {
    // RETRY_EXHAUSTED, RETRY_TIMEOUT or RETRY_ABORTED
    testLogger.error(normalizeWhitespace(`Status check failed: ${error.code}`), { error });
  } else {
    testLogger.error('Status check failed with a permanent error', { error });
  }
}
