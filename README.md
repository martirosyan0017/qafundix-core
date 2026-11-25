# QAFundix — A Foundation for QA Automation

[![CI](https://github.com/martirosyan0017/qafundix-core/actions/workflows/ci.yml/badge.svg)](https://github.com/martirosyan0017/qafundix-core/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/martirosyan0017/qafundix-core/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

QAFundix gives every automation project the same starting point. Its package, `@martirosyan0017/qafundix-core` (**Core**), contains the code every test project needs and nobody wants to write again: reading settings, logging, error handling and retries. Core works with any test framework and contains nothing specific to one application.

## What Core provides

- **Environment variables**: loads `.env` and reads values as text, numbers, booleans, URLs or allowed options, with clear errors for wrong values. [→ Configuration](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/configuration.md)
- **Validation**: checks configuration, API responses or test data against a Zod schema. [→ Configuration](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/configuration.md#validate-objects-with-a-schema)
- **Logging**: JSON logs with per-test child loggers; passwords, tokens and cookies are hidden. [→ Logging](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/logging.md)
- **Errors**: one error class with stable codes, easy to filter in logs and reports. [→ Errors](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/errors.md)
- **Retry**: backoff, timeouts and cancellation for flaky setup calls. [→ Retry](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/retry.md)
- **Utilities**: small string and date helpers. [→ Utilities](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/utilities.md)

## Choose your automation type

Each guide starts from an empty folder and ends with a first test you can run. Follow only the one you need.

| I want to test…               | Stack                      | Guide                                                                                                      |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Android and iOS apps          | Appium + WebdriverIO       | [Mobile automation](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/mobile-automation.md)  |
| Websites in a real browser    | Playwright                 | [Web automation](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/web-automation.md)        |
| REST and HTTP services        | Playwright API             | [API automation](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/api-automation.md)        |
| Data in a PostgreSQL database | `pg` + Node.js test runner | [Database testing](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/database-automation.md) |

Another TypeScript project? See [Getting started](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/getting-started.md).

## Install Core

Core is published to GitHub Packages. In your project folder:

1. Create a GitHub personal access token (classic) with only the `read:packages` scope, and set it in your terminal as `NODE_AUTH_TOKEN` ([how](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/getting-started.md#option-a-install-from-github-packages)).
2. Create `.npmrc` in the project folder:

   ```ini
   @martirosyan0017:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

3. Install:

   ```bash
   npm install @martirosyan0017/qafundix-core
   ```

Never put the token itself into `.npmrc` or code. To try Core without a token, install a [local package file](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/getting-started.md#option-b-install-from-a-local-package-file).

```ts
import { EnvironmentManager, Logger, retry } from '@martirosyan0017/qafundix-core';

const env = new EnvironmentManager();
const logger = new Logger({ name: 'smoke' });
const baseUrl = env.getUrl('BASE_URL', 'https://example.com');

const status = await retry(async () => (await fetch(baseUrl)).status, {
  attempts: 3,
  delayMs: 500,
});
logger.info('Health check finished', { status, baseUrl: baseUrl.origin });
```

## Documentation

| Topic                                                                                                               | Contents                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Getting started](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/getting-started.md)               | Install, project setup and a first script for any project    |
| [Configuration](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/configuration.md)                   | Environment variables, `.env` files, schema validation       |
| [Logging](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/logging.md)                               | Log levels, child loggers, secret redaction rules            |
| [Retry](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/retry.md)                                   | Backoff, timeouts, cancellation, safe retries                |
| [Errors](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/errors.md)                                 | `FrameworkError` and every error code                        |
| [Utilities](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/utilities.md)                           | String and date helpers, exported types                      |
| [Troubleshooting](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/troubleshooting.md)               | Installation, authentication, TypeScript and `.env` problems |
| [Publishing to GitHub Packages](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/github-packages.md) | Tokens, publishing and package visibility (maintainers)      |

## Requirements

- Node.js 22.18 or later for the setup guides (Core itself needs 22.0 for `import`, 22.12 for `require()`).
- npm, which comes with Node.js.
- A GitHub account and a token with `read:packages` to install from GitHub Packages.

## Contributing

Development commands, project structure and the release process are in [CONTRIBUTING.md](https://github.com/martirosyan0017/qafundix-core/blob/main/CONTRIBUTING.md). Report problems at [github.com/martirosyan0017/qafundix-core/issues](https://github.com/martirosyan0017/qafundix-core/issues). Changes are listed in [CHANGELOG.md](https://github.com/martirosyan0017/qafundix-core/blob/main/CHANGELOG.md). Report security problems privately as described in [SECURITY.md](https://github.com/martirosyan0017/qafundix-core/blob/main/SECURITY.md).

QAFundix continues the earlier `qa-automation-core` project under a new name; the API is unchanged.

## License

[MIT](https://github.com/martirosyan0017/qafundix-core/blob/main/LICENSE) © 2026 Karen Martirosyan
