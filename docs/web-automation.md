# Web automation — Playwright

You need **Node.js 22.18+** and [access to Core](getting-started.md#option-a-install-from-github-packages) (a GitHub token in `NODE_AUTH_TOKEN` and a `.npmrc` file).

## 1. Create the project

```bash
mkdir my-web-tests
cd my-web-tests
npm init -y
npm pkg set type=module
npm install @martirosyan0017/qafundix-core
npm install --save-dev @playwright/test typescript @types/node
npx playwright install chromium
```

## 2. Add the files

```text
my-web-tests/
├── support/core.ts
├── tests/fixtures.ts
├── tests/home.spec.ts
├── .env
└── playwright.config.ts
```

```dotenv
# .env
LOG_LEVEL=info
BASE_URL=https://playwright.dev
HEADLESS=true
WORKERS=2
```

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'web-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { env } from './support/core.js';

export default defineConfig({
  testDir: './tests',
  workers: env.getNumber('WORKERS', 2, { integer: true, min: 1 }),
  use: {
    baseURL: env.getUrl('BASE_URL', 'https://playwright.dev').toString(),
    headless: env.getBoolean('HEADLESS', true),
  },
});
```

```ts
// tests/fixtures.ts
import { test as base } from '@playwright/test';
import type { Logger } from '@martirosyan0017/qafundix-core';
import { logger } from '../support/core.js';

export const test = base.extend<{ log: Logger }>({
  log: async ({}, use, testInfo) => {
    await use(logger.child({ test: testInfo.title, worker: testInfo.workerIndex }));
  },
});

export { expect } from '@playwright/test';
```

```ts
// tests/home.spec.ts
import { expect, test } from './fixtures.js';

test('home page has the expected title', async ({ page, log }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Playwright/);
  log.info('Home page checked', { url: page.url() });
});
```

Add `.env` to `.gitignore`. Imports end in `.js` even for `.ts` files; Playwright handles that.

## 3. Run

```bash
npx playwright test
```

You should see `1 passed`. Open the report with `npx playwright show-report`.

## Problems?

| Error                          | Fix                                                           |
| ------------------------------ | ------------------------------------------------------------- |
| `E401` when installing Core    | Set `NODE_AUTH_TOKEN` again in this terminal.                 |
| `Executable doesn't exist`     | Run `npx playwright install chromium`.                        |
| `INVALID_ENVIRONMENT_VARIABLE` | Check the value in `.env`, for example a full `https://` URL. |

More: [Troubleshooting](troubleshooting.md) · Next: [Configuration](configuration.md), [Logging](logging.md), [Retry](retry.md)
