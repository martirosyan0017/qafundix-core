import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameworkError, retry, type RetryAttemptInfo } from '../src/index.js';

function failingTimes(failures: number, error: unknown = new Error('temporary')) {
  let calls = 0;
  const operation = vi.fn(async () => {
    calls += 1;
    if (calls <= failures) throw error;
    return 'ok';
  });
  return operation;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('retry basics', () => {
  it('returns the first successful result and passes the attempt number', async () => {
    const seen: number[] = [];
    await expect(
      retry(
        async (attempt) => {
          seen.push(attempt);
          if (attempt < 2) throw new Error('temporary');
          return 'ok';
        },
        { attempts: 3 },
      ),
    ).resolves.toBe('ok');
    expect(seen).toEqual([1, 2]);
  });

  it('preserves the last failure as cause', async () => {
    const cause = new Error('persistent');
    await expect(
      retry(
        async () => {
          throw cause;
        },
        { attempts: 2 },
      ),
    ).rejects.toMatchObject({
      code: 'RETRY_EXHAUSTED',
      message: 'Operation failed after 2 attempts',
      metadata: { attempts: 2 },
      cause,
    });
    await expect(
      retry(
        async () => {
          throw cause;
        },
        { attempts: 1 },
      ),
    ).rejects.toThrow('after 1 attempt');
  });

  it.each([
    [{ attempts: 0 }, 'attempts must be a positive integer'],
    [{ attempts: 1.5 }, 'attempts must be a positive integer'],
    [{ attempts: 1, delayMs: -1 }, 'delayMs must be a non-negative'],
    [{ attempts: 1, delayMs: Infinity }, 'delayMs must be a non-negative'],
    [{ attempts: 1, maxDelayMs: -1 }, 'maxDelayMs must be a non-negative'],
    [{ attempts: 1, timeoutMs: Number.NaN }, 'timeoutMs must be a non-negative'],
    [{ attempts: 1, attemptTimeoutMs: -5 }, 'attemptTimeoutMs must be a non-negative'],
  ])('rejects invalid options %o', async (options, message) => {
    const operation = vi.fn(async () => 'ok');
    await expect(retry(operation, options)).rejects.toThrow(RangeError);
    await expect(retry(operation, options)).rejects.toThrow(message);
    expect(operation).not.toHaveBeenCalled();
  });
});

describe('retry timeouts', () => {
  it('fails a slow attempt with RETRY_ATTEMPT_TIMEOUT and retries it', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const operation = vi.fn(async (attempt: number, signal: AbortSignal) => {
      signals.push(signal);
      if (attempt === 1) await new Promise(() => {}); // hangs forever
      return 'ok';
    });
    const errors: unknown[] = [];
    const result = retry(operation, {
      attempts: 2,
      attemptTimeoutMs: 100,
      onRetry: ({ error }) => {
        errors.push(error);
      },
    });
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe('ok');
    expect(errors[0]).toMatchObject({ code: 'RETRY_ATTEMPT_TIMEOUT', metadata: { attempt: 1 } });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it('exhausts with RETRY_ATTEMPT_TIMEOUT as cause when every attempt is slow', async () => {
    vi.useFakeTimers();
    const result = retry(() => new Promise<string>(() => {}), {
      attempts: 2,
      attemptTimeoutMs: 50,
    });
    const assertion = expect(result).rejects.toMatchObject({
      code: 'RETRY_EXHAUSTED',
      cause: { code: 'RETRY_ATTEMPT_TIMEOUT' },
    });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('stops the whole run with RETRY_TIMEOUT, even during an attempt', async () => {
    vi.useFakeTimers();
    let received: AbortSignal | undefined;
    const result = retry(
      (_attempt, signal) => {
        received = signal;
        return new Promise<string>(() => {});
      },
      { attempts: 5, timeoutMs: 1_000 },
    );
    const assertion = expect(result).rejects.toMatchObject({
      code: 'RETRY_TIMEOUT',
      message: 'Retry timed out after 1000 ms',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    expect(received?.aborted).toBe(true);
  });

  it('stops the whole run with RETRY_TIMEOUT during a wait', async () => {
    vi.useFakeTimers();
    const operation = failingTimes(9);
    const result = retry(operation, { attempts: 5, delayMs: 10_000, timeoutMs: 500 });
    const assertion = expect(result).rejects.toMatchObject({ code: 'RETRY_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('clears its timers after success', async () => {
    vi.useFakeTimers();
    await retry(async () => 'ok', { attempts: 1, timeoutMs: 1_000, attemptTimeoutMs: 100 });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('retry delays', () => {
  it('doubles the delay with exponential backoff and caps it with maxDelayMs', async () => {
    const delays: number[] = [];
    await retry(failingTimes(4), {
      attempts: 5,
      delayMs: 1,
      backoff: 'exponential',
      maxDelayMs: 5,
      onRetry: ({ delayMs }) => {
        delays.push(delayMs);
      },
    });
    expect(delays).toEqual([1, 2, 4, 5]);
  });

  it('keeps a fixed delay by default', async () => {
    const delays: number[] = [];
    await retry(failingTimes(2), {
      attempts: 3,
      delayMs: 1,
      onRetry: ({ delayMs }) => {
        delays.push(delayMs);
      },
    });
    expect(delays).toEqual([1, 1]);
  });

  it('applies full jitter between 0 and the computed delay', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const delays: number[] = [];
    await retry(failingTimes(1), {
      attempts: 2,
      delayMs: 4,
      jitter: true,
      onRetry: ({ delayMs }) => {
        delays.push(delayMs);
      },
    });
    expect(delays).toEqual([2]);
  });

  it('actually waits before the next attempt', async () => {
    vi.useFakeTimers();
    const operation = failingTimes(1);
    const result = retry(operation, { attempts: 2, delayMs: 1000 });
    await vi.advanceTimersByTimeAsync(999);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('retry decisions', () => {
  it('rethrows the original error when shouldRetry returns false', async () => {
    const fatal = new Error('wrong password');
    const operation = failingTimes(5, fatal);
    await expect(
      retry(operation, { attempts: 5, shouldRetry: (error) => error !== fatal }),
    ).rejects.toBe(fatal);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('passes the error and attempt number to shouldRetry and onRetry', async () => {
    const error = new Error('temporary');
    const seen: Array<[unknown, number]> = [];
    const infos: RetryAttemptInfo[] = [];
    await retry(failingTimes(2, error), {
      attempts: 3,
      shouldRetry: async (e, attempt) => {
        seen.push([e, attempt]);
        return true;
      },
      onRetry: (info) => {
        infos.push(info);
      },
    });
    expect(seen).toEqual([
      [error, 1],
      [error, 2],
    ]);
    expect(infos).toEqual([
      { attempt: 1, error, delayMs: 0 },
      { attempt: 2, error, delayMs: 0 },
    ]);
  });

  it('does not call onRetry after the final attempt', async () => {
    const onRetry = vi.fn();
    await expect(retry(failingTimes(9), { attempts: 2, onRetry })).rejects.toMatchObject({
      code: 'RETRY_EXHAUSTED',
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('retry cancellation', () => {
  it('does not start when the signal is already aborted', async () => {
    const operation = vi.fn(async () => 'ok');
    const controller = new AbortController();
    controller.abort(new Error('stop'));
    await expect(
      retry(operation, { attempts: 3, signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'RETRY_ABORTED' });
    expect(operation).not.toHaveBeenCalled();
  });

  it('stops waiting as soon as the signal aborts', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const operation = failingTimes(9);
    const result = retry(operation, { attempts: 5, delayMs: 60_000, signal: controller.signal });
    const assertion = expect(result).rejects.toBeInstanceOf(FrameworkError);
    await vi.advanceTimersByTimeAsync(10);
    const reason = new Error('test timed out');
    controller.abort(reason);
    await assertion;
    await expect(result).rejects.toMatchObject({ code: 'RETRY_ABORTED', cause: reason });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('passes a signal to the operation that follows the caller signal', async () => {
    const controller = new AbortController();
    let received: AbortSignal | undefined;
    await retry(
      async (_attempt, signal) => {
        received = signal;
        return 'ok';
      },
      { attempts: 1, signal: controller.signal },
    );
    expect(received?.aborted).toBe(false);
    controller.abort();
    expect(received?.aborted).toBe(true);
  });

  it('does not wait when onRetry aborts the run', async () => {
    const controller = new AbortController();
    const operation = failingTimes(9);
    await expect(
      retry(operation, {
        attempts: 3,
        delayMs: 60_000,
        signal: controller.signal,
        onRetry: () => controller.abort('stop now'),
      }),
    ).rejects.toMatchObject({ code: 'RETRY_ABORTED', cause: 'stop now' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('stops waiting for a running attempt when the signal aborts', async () => {
    const controller = new AbortController();
    const result = retry(() => new Promise<string>(() => {}), {
      attempts: 3,
      signal: controller.signal,
    });
    controller.abort('cancelled by test');
    await expect(result).rejects.toMatchObject({
      code: 'RETRY_ABORTED',
      cause: 'cancelled by test',
    });
  });
});
