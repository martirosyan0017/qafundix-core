import { describe, expect, it } from 'vitest';
import { ZodError, z } from 'zod';
import { ConfigLoader, FrameworkError, commonConfigSchema } from '../src/index.js';

describe('ConfigLoader', () => {
  it('returns parsed configuration', () => {
    expect(
      ConfigLoader.load({ environment: 'test', logLevel: 'debug' }, commonConfigSchema),
    ).toEqual({ environment: 'test', logLevel: 'debug' });
  });

  it('returns transformed values from the schema', () => {
    const schema = z.object({ port: z.coerce.number().int() });
    expect(ConfigLoader.load({ port: '8080' }, schema)).toEqual({ port: 8080 });
  });

  it('reports validation errors without including input secrets', () => {
    let caught: unknown;
    try {
      ConfigLoader.load(
        { username: 42, password: 'hidden-value' },
        z.object({ username: z.string(), password: z.number() }),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(FrameworkError);
    const error = caught as FrameworkError;
    expect(error.code).toBe('CONFIG_VALIDATION_FAILED');
    expect(error.message).toContain('username');
    expect(error.message).toContain('password');
    expect(error.message).not.toContain('hidden-value');
    expect(JSON.stringify(error.metadata)).not.toContain('hidden-value');
    expect(error.cause).toBeInstanceOf(ZodError);
  });

  it('labels root-level failures and nested paths', () => {
    expect(() => ConfigLoader.load('text', z.object({}))).toThrow('<root>');
    expect(() =>
      ConfigLoader.load({ db: { port: 'x' } }, z.object({ db: z.object({ port: z.number() }) })),
    ).toThrow('db.port');
  });

  it('rejects unknown environments and log levels in the common schema', () => {
    expect(() =>
      ConfigLoader.load({ environment: 'qa', logLevel: 'loud' }, commonConfigSchema),
    ).toThrow(/environment.*logLevel/);
  });
});
