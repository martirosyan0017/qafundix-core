import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentManager, FrameworkError } from '../src/index.js';

const env = (variables: Record<string, string>) => new EnvironmentManager(variables);

describe('EnvironmentManager basics', () => {
  it('defaults to development and reads required variables', () => {
    const manager = env({ API_URL: ' https://example.test ' });
    expect(manager.name).toBe('development');
    expect(manager.require('API_URL')).toBe('https://example.test');
    expect(manager.get('API_URL')).toBe(' https://example.test ');
    expect(() => manager.validateRequired(['API_URL'])).not.toThrow();
  });

  it('accepts every supported environment name', () => {
    for (const name of ['development', 'staging', 'production', 'test'])
      expect(env({ NODE_ENV: name }).name).toBe(name);
  });

  it('rejects invalid environments and missing variables', () => {
    expect(() => env({ NODE_ENV: 'qa' }).name).toThrow(FrameworkError);
    expect(() => env({}).require('TOKEN')).toThrow('TOKEN');
    expect(() => env({ A: ' ', B: '' }).validateRequired(['A', 'B'])).toThrow('A, B');
    expect(() => env({}).validateRequired([])).not.toThrow();
  });
});

describe('EnvironmentManager .env loading', () => {
  afterEach(() => {
    vi.doUnmock('dotenv');
    vi.resetModules();
  });

  async function loadWithMockedDotenv() {
    vi.resetModules();
    const config = vi.fn(() => ({ parsed: {} }));
    vi.doMock('dotenv', () => ({ config }));
    const { EnvironmentManager: Manager } = await import('../src/environment/environment.js');
    return { Manager, config };
  }

  it('loads the default .env file quietly, once per process', async () => {
    const { Manager, config } = await loadWithMockedDotenv();
    new Manager();
    new Manager();
    new Manager(process.env);
    expect(config).toHaveBeenCalledTimes(1);
    expect(config).toHaveBeenCalledWith({ quiet: true });
  });

  it('never loads .env when variables are injected', async () => {
    const { Manager, config } = await loadWithMockedDotenv();
    new Manager({ NODE_ENV: 'test' });
    expect(config).not.toHaveBeenCalled();
  });
});

describe('EnvironmentManager.getNumber', () => {
  it('parses numbers and falls back to the default for missing or empty values', () => {
    expect(env({ TIMEOUT: ' 1500 ' }).getNumber('TIMEOUT')).toBe(1500);
    expect(env({ RATIO: '0.25' }).getNumber('RATIO')).toBe(0.25);
    expect(env({}).getNumber('TIMEOUT')).toBeUndefined();
    expect(env({ TIMEOUT: '  ' }).getNumber('TIMEOUT', 30_000)).toBe(30_000);
  });

  it('rejects text, non-integers and out-of-range values', () => {
    expect(() => env({ TIMEOUT: 'abc' }).getNumber('TIMEOUT')).toThrow('TIMEOUT must be a number');
    expect(() => env({ WORKERS: '2.5' }).getNumber('WORKERS', 1, { integer: true })).toThrow(
      'an integer',
    );
    expect(() => env({ WORKERS: '0' }).getNumber('WORKERS', 1, { min: 1, max: 8 })).toThrow(
      '>= 1 <= 8',
    );
    expect(() => env({ WORKERS: 'Infinity' }).getNumber('WORKERS')).toThrow(FrameworkError);
  });
});

describe('EnvironmentManager.getBoolean', () => {
  it('accepts common true and false spellings in any case', () => {
    for (const value of ['true', 'TRUE', '1', 'yes', 'On'])
      expect(env({ FLAG: value }).getBoolean('FLAG')).toBe(true);
    for (const value of ['false', '0', 'No', 'off'])
      expect(env({ FLAG: value }).getBoolean('FLAG')).toBe(false);
    expect(env({}).getBoolean('FLAG', true)).toBe(true);
    expect(env({}).getBoolean('FLAG')).toBeUndefined();
  });

  it('rejects anything else', () => {
    expect(() => env({ HEADLESS: 'maybe' }).getBoolean('HEADLESS')).toThrow(
      expect.objectContaining({ code: 'INVALID_ENVIRONMENT_VARIABLE' }),
    );
  });
});

describe('EnvironmentManager.getUrl', () => {
  it('returns a URL object for http and https values', () => {
    expect(env({ BASE_URL: 'https://example.test/api' }).getUrl('BASE_URL')?.pathname).toBe('/api');
    expect(env({}).getUrl('BASE_URL', 'http://localhost:3000').port).toBe('3000');
    expect(env({}).getUrl('BASE_URL')).toBeUndefined();
  });

  it('rejects relative URLs and other protocols without echoing the value', () => {
    expect(() => env({ BASE_URL: '/relative' }).getUrl('BASE_URL')).toThrow('absolute URL');
    try {
      env({ DB_URL: 'postgres://user:hunter2@db' }).getUrl('DB_URL');
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toContain('http or https');
      expect(JSON.stringify(error)).not.toContain('hunter2');
      expect((error as Error).message).not.toContain('hunter2');
    }
  });
});

describe('EnvironmentManager.oneOf', () => {
  it('returns allowed values and the default when missing', () => {
    const browsers = ['chromium', 'firefox', 'webkit'] as const;
    expect(env({ BROWSER: 'firefox' }).oneOf('BROWSER', browsers)).toBe('firefox');
    expect(env({}).oneOf('BROWSER', browsers, 'chromium')).toBe('chromium');
  });

  it('lists the allowed values when the value is not allowed', () => {
    expect(() => env({ BROWSER: 'safari' }).oneOf('BROWSER', ['chromium', 'webkit'])).toThrow(
      'must be one of: chromium, webkit',
    );
  });
});
