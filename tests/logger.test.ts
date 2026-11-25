import { describe, expect, it } from 'vitest';
import { DEFAULT_REDACT_KEYS, Logger, type LogLevel, type RedactionOptions } from '../src/index.js';

function capture(level: LogLevel = 'trace', redaction?: RedactionOptions) {
  const lines: Array<Record<string, unknown>> = [];
  const logger = new Logger({
    level,
    destination: { write: (line: string) => lines.push(JSON.parse(line)) },
    ...(redaction ? { redaction } : {}),
  });
  return { logger, lines };
}

describe('Logger basics', () => {
  it('honors the configured level and exposes structured methods', () => {
    const logger = new Logger({ level: 'silent', name: 'unit-test' });
    expect(logger.level).toBe('silent');
    expect(() => {
      logger.debug('debug', { token: 'secret' });
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
    }).not.toThrow();
  });

  it('defaults to info and includes the name', () => {
    const { lines } = capture('info');
    const named = new Logger({
      name: 'web-checks',
      destination: { write: (line: string) => lines.push(JSON.parse(line)) },
    });
    expect(named.level).toBe('info');
    named.debug('hidden');
    named.info('shown');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ name: 'web-checks', msg: 'shown' });
  });

  it('redacts credential fields in nested structured data, arrays and errors', () => {
    const { logger, lines } = capture('info');
    const nestedError = Object.assign(new Error('failure'), { token: 'error-secret' });
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    logger.info('credentials', {
      accessToken: 'top-secret',
      nested: { password: 'also-secret', safe: 'visible' },
      list: [{ apiKey: 'list-secret' }],
      timestamp,
      error: nestedError,
    });
    const text = JSON.stringify(lines);
    expect(text).toContain('[REDACTED]');
    expect(text).toContain('visible');
    expect(text).toContain(timestamp.toISOString());
    for (const secret of ['top-secret', 'also-secret', 'list-secret', 'error-secret'])
      expect(text).not.toContain(secret);
    expect(lines[0]).toMatchObject({ error: { type: 'Error', message: 'failure' } });
  });

  it('handles cyclic structured data without recursing forever', () => {
    const { logger, lines } = capture('info');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => logger.info('cycle', circular)).not.toThrow();
    expect(JSON.stringify(lines)).toContain('[Circular]');
  });

  it('does not mark repeated (non-cyclic) references as circular', () => {
    const { logger, lines } = capture('info');
    const shared = { value: 1 };
    logger.info('shared', { a: shared, b: shared });
    expect(lines[0]).toMatchObject({ a: { value: 1 }, b: { value: 1 } });
  });
});

describe('Logger redaction options', () => {
  it('exposes the default key list as read-only', () => {
    expect(DEFAULT_REDACT_KEYS).toContain('password');
    expect(Object.isFrozen(DEFAULT_REDACT_KEYS)).toBe(true);
  });

  it('adds custom string and RegExp keys to the defaults', () => {
    const { logger, lines } = capture('info', { keys: ['iban', /^x-.*-id$/i] });
    logger.info('custom', { customerIban: 'AM00', 'X-Tenant-Id': 't1', password: 'p', ok: 1 });
    expect(lines[0]).toMatchObject({
      customerIban: '[REDACTED]',
      'X-Tenant-Id': '[REDACTED]',
      password: '[REDACTED]',
      ok: 1,
    });
  });

  it('can replace the defaults and change the censor text', () => {
    const { logger, lines } = capture('info', {
      keys: ['pin'],
      replaceDefaults: true,
      censor: '***',
    });
    logger.info('custom', { pin: '1234', password: 'kept-on-purpose' });
    expect(lines[0]).toMatchObject({ pin: '***', password: 'kept-on-purpose' });
  });

  it('handles global RegExps consistently across keys', () => {
    const { logger, lines } = capture('info', { keys: [/card/g] });
    logger.info('cards', { cardA: '1', cardB: '2', cardC: '3' });
    expect(lines[0]).toMatchObject({
      cardA: '[REDACTED]',
      cardB: '[REDACTED]',
      cardC: '[REDACTED]',
    });
  });

  it('children inherit the parent redaction rules', () => {
    const { logger, lines } = capture('info', { keys: ['iban'], censor: '#' });
    logger.child({ iban: 'AM00' }).info('child', { iban: 'AM11', token: 't' });
    expect(lines[0]).toMatchObject({ iban: '#', token: '#' });
  });

  it('rejects empty string keys with a clear message', () => {
    expect(() => new Logger({ redaction: { keys: [' '] } })).toThrow(
      'Redaction keys must be non-empty strings or RegExp objects',
    );
  });
});

describe('Logger levels', () => {
  it('writes trace and fatal lines', () => {
    const { logger, lines } = capture();
    logger.trace('tracing', { step: 1 });
    logger.fatal('stopping');
    expect(lines.map((line) => [line.level, line.msg])).toEqual([
      [10, 'tracing'],
      [60, 'stopping'],
    ]);
  });
});

describe('Logger.child', () => {
  it('adds bindings to every line and shares the destination', () => {
    const { logger, lines } = capture('info');
    const child = logger.child({ testName: 'login', worker: 2 });
    child.info('started', { page: 'home' });
    logger.info('parent');
    expect(lines[0]).toMatchObject({ testName: 'login', worker: 2, page: 'home', msg: 'started' });
    expect(lines[1]).not.toHaveProperty('testName');
  });

  it('redacts secret-looking bindings', () => {
    const { logger, lines } = capture('info');
    logger.child({ sessionId: 'abc-123', user: 'qa' }).info('hello');
    expect(lines[0]).toMatchObject({ sessionId: '[REDACTED]', user: 'qa' });
  });

  it('can use its own level and nest', () => {
    const { logger, lines } = capture('info');
    const quiet = logger.child({ scope: 'quiet' }, { level: 'error' });
    quiet.info('hidden');
    quiet.child({ step: 'checkout' }).error('shown');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ scope: 'quiet', step: 'checkout', msg: 'shown' });
    expect(quiet.level).toBe('error');
  });

  it('does not affect loggers created afterwards', () => {
    const { logger } = capture('info');
    logger.child({ scope: 'child' }, { level: 'error' });
    expect(new Logger({ level: 'debug' }).level).toBe('debug');
  });
});

describe('Logger redaction keys', () => {
  it('redacts cookies, sessions, bearer values, passphrases and private keys', () => {
    const { logger, lines } = capture('info');
    logger.info('request', {
      cookie: 'c',
      'set-cookie': 'sc',
      sessionToken: 's',
      bearer: 'b',
      passphrase: 'p',
      private_key: 'k',
      privateKey: 'k2',
      url: 'https://example.test',
    });
    expect(lines[0]).toMatchObject({
      cookie: '[REDACTED]',
      'set-cookie': '[REDACTED]',
      sessionToken: '[REDACTED]',
      bearer: '[REDACTED]',
      passphrase: '[REDACTED]',
      private_key: '[REDACTED]',
      privateKey: '[REDACTED]',
      url: 'https://example.test',
    });
  });
});
