import { describe, expect, it } from 'vitest';
import { FrameworkError } from '../src/index.js';

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
