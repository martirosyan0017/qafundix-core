# Retry, timeouts and cancellation

[← Back to README](../README.md)

`retry(operation, options)` runs an async function until it succeeds or a limit is reached. The function receives the attempt number (starting at 1) and an `AbortSignal`.

Use `retry` for operations your framework does not already retry, such as API setup calls, test data creation, or waiting for a backend. For UI elements, prefer your framework's own waiting (Playwright `expect`, WebdriverIO `waitUntil`).

> [!WARNING]
> Only retry operations that are safe to run twice, such as reads. Retrying a payment, a transfer, or any other write can perform it twice, especially after a timeout, when the first attempt may still complete on the server. Use `shouldRetry` to retry only errors that prove nothing happened, and use the API's idempotency key if it offers one.

## Example

```ts
import { FrameworkError, Logger, retry } from '@martirosyan0017/qafundix-core';

const logger = new Logger({ name: 'retry-example' });

class HttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function getStatus(url: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new HttpError(response.status);
  return response.status;
}

try {
  const status = await retry((attempt, signal) => getStatus('https://example.com', signal), {
    attempts: 4, // first try + up to 3 retries
    delayMs: 250, // wait 250, 500, 1000 ms ...
    backoff: 'exponential',
    maxDelayMs: 2_000, // ... but never more than 2 s
    jitter: true, // randomize waits so parallel workers do not retry together
    shouldRetry: (error) => !(error instanceof HttpError && error.status < 500), // 4xx: stop now
    onRetry: ({ attempt, delayMs, error }) =>
      logger.warn('Retrying', { attempt, delayMs, error: String(error) }),
    attemptTimeoutMs: 5_000, // a single slow attempt fails and is retried
    timeoutMs: 20_000, // the whole run gives up after 20 s
  });
  logger.info('Service is up', { status });
} catch (error) {
  if (error instanceof FrameworkError) {
    logger.error('Service check failed', { code: error.code }); // e.g. RETRY_EXHAUSTED
  } else {
    logger.error('Permanent failure', { error }); // rethrown from shouldRetry === false
  }
}
```

## Options

| Option             | Default   | Description                                                                                                  |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------ |
| `attempts`         | required  | Total attempts including the first. Must be a positive integer.                                              |
| `delayMs`          | `0`       | Base wait between attempts.                                                                                  |
| `backoff`          | `'fixed'` | `'fixed'` waits `delayMs` each time. `'exponential'` waits `delayMs × 2^(attempt − 1)`: 1×, 2×, 4×, …        |
| `maxDelayMs`       | no limit  | Upper limit for one wait, applied after backoff.                                                             |
| `jitter`           | `false`   | When `true`, each wait is a random value from 0 up to the computed wait.                                     |
| `shouldRetry`      | retry all | `(error, attempt) => boolean \| Promise<boolean>`. Return `false` to stop and rethrow the original error.    |
| `onRetry`          | none      | `({ attempt, error, delayMs }) => void`. Runs after a retryable failure, before the wait.                    |
| `attemptTimeoutMs` | no limit  | Fails one attempt with `RETRY_ATTEMPT_TIMEOUT` and aborts its signal. Counts as a normal failure.            |
| `timeoutMs`        | no limit  | Limit for the whole run, including waits. Throws `RETRY_TIMEOUT`.                                            |
| `signal`           | none      | Your own `AbortSignal`. Aborting it stops the run, also during an attempt or a wait. Throws `RETRY_ABORTED`. |

With only `attempts`, `delayMs` and `backoff`, `retry` behaves exactly as in version 1.0.

## How a run ends

| Situation                     | Result                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| An attempt succeeds           | Its value is returned.                                         |
| All attempts fail             | `FrameworkError` `RETRY_EXHAUSTED`; `cause` is the last error. |
| `shouldRetry` returns `false` | The original error is rethrown unchanged.                      |
| `timeoutMs` passes            | `FrameworkError` `RETRY_TIMEOUT`.                              |
| `signal` aborts               | `FrameworkError` `RETRY_ABORTED`; `cause` is the abort reason. |
| Invalid options               | `RangeError` naming the option and the received value.         |

> [!NOTE]
> JavaScript cannot force-stop a running function. On a timeout or abort, `retry` stops **waiting** and aborts the signal it passed to your operation. Pass that signal on (for example to `fetch`) so the abandoned work actually stops.

## Related

- [Errors](errors.md): all `RETRY_*` codes
- [Logging](logging.md): what `onRetry` should log
