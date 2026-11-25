# Configuration and environment variables

[← Back to README](../README.md)

Core has two tools for settings:

- [`EnvironmentManager`](#read-environment-variables) reads environment variables and `.env` files, with typed getters.
- [`ConfigLoader`](#validate-objects-with-a-schema) validates any object against a Zod schema.

## Read environment variables

`new EnvironmentManager()` reads `process.env` and loads the `.env` file from the current folder the first time it is created. Variables already set in the shell or CI are never overridden by `.env`.

Pass an object instead to make code independent of the machine it runs on, for example in unit tests. In that case no `.env` file is loaded:

```ts
import { EnvironmentManager } from '@martirosyan0017/qafundix-core';

const env = new EnvironmentManager({
  NODE_ENV: 'staging',
  BASE_URL: 'https://staging.example.com',
  TIMEOUT_MS: '15000',
  HEADLESS: 'yes',
  BROWSER: 'firefox',
  API_TOKEN: '  secret-value  ',
});

env.name; // 'staging'
env.get('API_TOKEN'); // '  secret-value  ' (raw value, or undefined)
env.require('API_TOKEN'); // 'secret-value' (trimmed; throws if missing or empty)
env.validateRequired(['BASE_URL', 'API_TOKEN']); // throws once, listing every missing name

env.getNumber('TIMEOUT_MS', 30_000, { integer: true, min: 1_000 }); // 15000
env.getBoolean('HEADLESS', true); // true
env.getUrl('BASE_URL')?.origin; // 'https://staging.example.com' (undefined if not set)
env.oneOf('BROWSER', ['chromium', 'firefox', 'webkit'], 'chromium'); // 'firefox'
env.getNumber('RETRIES'); // undefined: missing and no default
```

| Method                                            | Returns                                                | When missing or blank                            | When the value is invalid                                         |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------- |
| `name`                                            | `'development' \| 'staging' \| 'production' \| 'test'` | `'development'`                                  | `FrameworkError` `INVALID_ENVIRONMENT`                            |
| `get(key)`                                        | Raw `string`                                           | `undefined`                                      | Never throws                                                      |
| `require(key)`                                    | Trimmed `string`                                       | `FrameworkError` `MISSING_ENVIRONMENT_VARIABLE`  | n/a                                                               |
| `validateRequired(keys)`                          | `void`                                                 | `FrameworkError` `MISSING_ENVIRONMENT_VARIABLES` | n/a                                                               |
| `getNumber(key, default?, { integer, min, max })` | `number`                                               | `default` or `undefined`                         | `FrameworkError` `INVALID_ENVIRONMENT_VARIABLE`                   |
| `getBoolean(key, default?)`                       | `boolean`                                              | `default` or `undefined`                         | Same. Accepted: `true/false`, `1/0`, `yes/no`, `on/off`, any case |
| `getUrl(key, default?)`                           | `URL` object                                           | `default` as `URL`, or `undefined`               | Same. Only absolute `http:` or `https:` URLs                      |
| `oneOf(key, allowed, default?)`                   | One of `allowed` (typed)                               | `default` or `undefined`                         | Same. The message lists the allowed values                        |

Good to know:

- `NODE_ENV` accepts only `development`, `staging`, `production`, or `test`. To choose a target environment with other names (for example `qa` or `uat`), use your own variable: `env.oneOf('TEST_ENV', ['qa', 'uat', 'prod'], 'qa')`.
- Error messages and metadata name the variable but never include its value, in case it is a secret.
- Numbers are parsed with JavaScript `Number()` after trimming.

## Validate objects with a schema

`ConfigLoader.load(value, schema)` validates any value against a [Zod](https://zod.dev) schema and returns the typed result. It works for configuration objects and equally for API responses or test data. It needs Zod 4 in your project: `npm install zod@4`.

`commonConfigSchema` covers the two settings every project has, `environment` and `logLevel`. Extend it with your own:

```ts
import { z } from 'zod';
import {
  ConfigLoader,
  EnvironmentManager,
  FrameworkError,
  commonConfigSchema,
} from '@martirosyan0017/qafundix-core';

const projectSchema = commonConfigSchema.extend({
  baseUrl: z.url(),
  timeoutMs: z.coerce.number().int().positive(),
  users: z.object({ admin: z.string().min(1) }),
});

const env = new EnvironmentManager();

try {
  const config = ConfigLoader.load(
    {
      environment: env.name,
      logLevel: env.get('LOG_LEVEL') ?? 'info',
      baseUrl: env.get('BASE_URL') ?? 'http://localhost:3000',
      timeoutMs: env.get('TIMEOUT_MS') ?? '30000',
      users: { admin: env.get('ADMIN_USER') ?? 'admin@example.com' },
    },
    projectSchema,
  );
  config.timeoutMs; // number, typed from the schema
} catch (error) {
  if (error instanceof FrameworkError && error.code === 'CONFIG_VALIDATION_FAILED') {
    // Message example: "Configuration validation failed: baseUrl: Invalid URL; users.admin: ..."
    console.error(error.message);
    console.error(error.metadata.issues); // [{ path, code, message }, ...]
  }
  throw error;
}
```

When validation fails, Core throws `FrameworkError` with code `CONFIG_VALIDATION_FAILED`:

- The message lists every problem as `path: message` (`<root>` for the top level).
- `metadata.issues` holds the same list as data.
- `cause` is the original `ZodError`.
- Input values are never copied into the message, so secrets in the input stay out of logs.

## Related

- [Errors](errors.md): all error codes Core throws
- [Troubleshooting](troubleshooting.md): `.env` not loaded, unsupported `NODE_ENV`, Zod version problems
