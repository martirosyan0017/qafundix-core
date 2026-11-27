# QAFundix — A Foundation for QA Automation

[![CI](https://github.com/martirosyan0017/qafundix-core/actions/workflows/ci.yml/badge.svg)](https://github.com/martirosyan0017/qafundix-core/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/martirosyan0017/qafundix-core/blob/main/LICENSE)

Ready-made building blocks for any TypeScript test project: settings from `.env`, logging that hides secrets, clear errors, and retries. Works with any test framework.

## Start your project

Pick one guide. Each one takes you from an empty folder to a passing test.

| I want to test…      | Guide                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Mobile apps          | [Appium + WebdriverIO](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/mobile-automation.md) |
| Websites             | [Playwright](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/web-automation.md)              |
| REST APIs            | [Playwright API](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/api-automation.md)          |
| PostgreSQL databases | [PostgreSQL](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/database-automation.md)         |

## Install

You need Node.js 22.18 or later.

1. Create a [GitHub token](https://github.com/settings/tokens/new?scopes=read:packages&description=qafundix) with `read:packages`, and set it in your terminal as `NODE_AUTH_TOKEN` ([how](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/getting-started.md#option-a-install-from-github-packages)).
2. Add a `.npmrc` file to your project:

   ```ini
   @martirosyan0017:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

3. Install:

   ```bash
   npm install @martirosyan0017/qafundix-core
   ```

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

[Getting started](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/getting-started.md) ·
[Configuration](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/configuration.md) ·
[Logging](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/logging.md) ·
[Retry](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/retry.md) ·
[Errors](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/errors.md) ·
[Utilities](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/utilities.md) ·
[Troubleshooting](https://github.com/martirosyan0017/qafundix-core/blob/main/docs/troubleshooting.md)

## Contributing

See [CONTRIBUTING.md](https://github.com/martirosyan0017/qafundix-core/blob/main/CONTRIBUTING.md) and the [changelog](https://github.com/martirosyan0017/qafundix-core/blob/main/CHANGELOG.md). Report security problems privately: [SECURITY.md](https://github.com/martirosyan0017/qafundix-core/blob/main/SECURITY.md).

[MIT](https://github.com/martirosyan0017/qafundix-core/blob/main/LICENSE) © 2026 Karen Martirosyan
