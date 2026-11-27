import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ConfigLoader,
  ERROR_CODES,
  EnvironmentManager,
  FrameworkError,
  commonConfigSchema,
  isFrameworkError,
  retry,
  type CoreErrorCode,
} from '../src/index.js';

describe('ERROR_CODES and isFrameworkError', () => {
  it('lists every code Core throws, frozen and keyed by its own value', () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
    for (const [key, value] of Object.entries(ERROR_CODES)) expect(value).toBe(key);
    expectTypeOf<CoreErrorCode>().toEqualTypeOf<
      | 'CONFIG_VALIDATION_FAILED'
      | 'INVALID_ENVIRONMENT'
      | 'MISSING_ENVIRONMENT_VARIABLE'
      | 'MISSING_ENVIRONMENT_VARIABLES'
      | 'INVALID_ENVIRONMENT_VARIABLE'
      | 'RETRY_EXHAUSTED'
      | 'RETRY_TIMEOUT'
      | 'RETRY_ABORTED'
      | 'RETRY_ATTEMPT_TIMEOUT'
    >();
  });

  it('matches the codes Core actually throws', async () => {
    const thrown = (fn: () => unknown) => {
      try {
        fn();
      } catch (error) {
        return error;
      }
      throw new Error('expected an error');
    };
    expect(
      isFrameworkError(
        thrown(() => ConfigLoader.load({}, commonConfigSchema)),
        ERROR_CODES.CONFIG_VALIDATION_FAILED,
      ),
    ).toBe(true);
    const env = new EnvironmentManager({ NODE_ENV: 'qa', N: 'x' });
    expect(
      isFrameworkError(
        thrown(() => env.name),
        ERROR_CODES.INVALID_ENVIRONMENT,
      ),
    ).toBe(true);
    expect(
      isFrameworkError(
        thrown(() => env.require('MISSING')),
        ERROR_CODES.MISSING_ENVIRONMENT_VARIABLE,
      ),
    ).toBe(true);
    expect(
      isFrameworkError(
        thrown(() => env.validateRequired(['MISSING'])),
        ERROR_CODES.MISSING_ENVIRONMENT_VARIABLES,
      ),
    ).toBe(true);
    expect(
      isFrameworkError(
        thrown(() => env.getNumber('N')),
        ERROR_CODES.INVALID_ENVIRONMENT_VARIABLE,
      ),
    ).toBe(true);
    const exhausted = await retry(
      async () => {
        throw new Error('x');
      },
      { attempts: 1 },
    ).catch((error: unknown) => error);
    expect(isFrameworkError(exhausted, ERROR_CODES.RETRY_EXHAUSTED)).toBe(true);
  });

  it('checks the class and, optionally, the code', () => {
    const error: unknown = new FrameworkError('x', { code: 'ORDER_NOT_FOUND' });
    expect(isFrameworkError(error)).toBe(true);
    expect(isFrameworkError(error, 'ORDER_NOT_FOUND')).toBe(true);
    expect(isFrameworkError(error, ERROR_CODES.RETRY_TIMEOUT)).toBe(false);
    expect(isFrameworkError(new Error('x'))).toBe(false);
    expect(isFrameworkError('ORDER_NOT_FOUND')).toBe(false);
    if (isFrameworkError(error)) expectTypeOf(error).toEqualTypeOf<FrameworkError>();
  });
});

describe('FrameworkError', () => {
  it('retains code, metadata, and cause', () => {
    const cause = new Error('original');
    const error = new FrameworkError('failed', {
      code: 'FAILED',
      metadata: { part: 'config' },
      cause,
    });
    expect(error.code).toBe('FAILED');
    expect(error.metadata).toEqual({ part: 'config' });
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('failed');
  });

  it('is a real Error subclass with its own name and stack', () => {
    const error = new FrameworkError('failed', { code: 'FAILED' });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FrameworkError);
    expect(error.name).toBe('FrameworkError');
    expect(error.stack).toContain('FrameworkError');
    expect(error.metadata).toEqual({});
  });

  it('keeps instanceof working for subclasses', () => {
    class NetworkError extends FrameworkError {}
    const error = new NetworkError('offline', { code: 'NETWORK' });
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(FrameworkError);
  });
});
