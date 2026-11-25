// Basic consumer setup: environment, configuration, logging and a simple retry.
import {
  ConfigLoader,
  EnvironmentManager,
  Logger,
  commonConfigSchema,
  retry,
} from '@martirosyan0017/qafundix-core';

const env = new EnvironmentManager();
const config = ConfigLoader.load(
  { environment: env.name, logLevel: env.get('LOG_LEVEL') ?? 'info' },
  commonConfigSchema,
);

// Typed values: missing -> default, invalid -> FrameworkError INVALID_ENVIRONMENT_VARIABLE.
const baseUrl = env.getUrl('BASE_URL', 'http://localhost:3000');
const workers = env.getNumber('WORKERS', 2, { integer: true, min: 1, max: 16 });
const headless = env.getBoolean('HEADLESS', true);
const browser = env.oneOf('BROWSER', ['chromium', 'firefox', 'webkit'], 'chromium');

const logger = new Logger({ name: 'consumer-example', level: config.logLevel });

const result = await retry(async () => 'healthy', {
  attempts: 3,
  delayMs: 100,
  backoff: 'exponential',
});

logger.info('Health check completed', {
  environment: config.environment,
  baseUrl: baseUrl.origin,
  workers,
  headless,
  browser,
  result,
});
