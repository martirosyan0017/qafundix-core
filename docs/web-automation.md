# Web automation with Playwright

[← Back to README](../README.md)

## 1. What you will build

A Playwright project that tests a website in a real browser. QAFundix Core reads your settings from a `.env` file and gives every test its own logger. At the end you will run one test that opens a page and checks its title.

## 2. Prerequisites

| You need       | How to check                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Node.js 22.18+ | `node -v` prints `v22.18.0` or higher. Install the LTS version from [nodejs.org](https://nodejs.org/).               |
| npm            | `npm -v` prints a version. npm comes with Node.js.                                                                   |
| A GitHub token | A personal access token (classic) with `read:packages`. Created in [step 5](#5-install-and-configure-qafundix-core). |
| A code editor  | Any editor; Visual Studio Code works well with TypeScript.                                                           |

No prior Playwright experience is needed. Basic familiarity with a terminal is enough.

## 3. Create a new project

Open a terminal in the folder where you keep your projects and run:

```bash
mkdir my-web-tests
cd my-web-tests
npm init -y
npm pkg set type=module
```

`npm init -y` creates `package.json`. `type=module` tells Node.js to use modern `import` syntax, which Core and these examples use.

All following commands run inside `my-web-tests`.

## 4. Install dependencies

```bash
npm install --save-dev @playwright/test typescript @types/node
npx playwright install chromium
```

- `@playwright/test` is the test runner and browser automation library.
- `typescript` and `@types/node` give your editor type checking and autocompletion.
- `npx playwright install chromium` downloads the Chromium browser that Playwright controls.

## 5. Install and configure QAFundix Core

Core is published to GitHub Packages, which requires a token even for reading.

1. Create a token on GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**. Tick only **`read:packages`** and copy the token.
2. Put the token into the `NODE_AUTH_TOKEN` environment variable of your current terminal. It is not stored anywhere and must be set again in a new terminal.

   Windows PowerShell (the token is hidden while you type):

   ```powershell
   $secureToken = Read-Host 'GitHub token' -AsSecureString
   $env:NODE_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
   ```

   macOS or Linux:

   ```bash
   read -rsp 'GitHub token: ' NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN && echo
   ```

3. Create a file named `.npmrc` in the project folder with these two lines. It contains no secret and can be committed:

   ```ini
   @martirosyan0017:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

4. Install Core:

   ```bash
   npm install @martirosyan0017/qafundix-core
   ```

Never paste the token into `.npmrc`, code, or chat. No token yet, or no version published? Use a [local package file](getting-started.md#option-b-install-from-a-local-package-file) instead.

## 6. Recommended folder structure

```text
my-web-tests/
├── support/
│   └── core.ts            creates env and logger once
├── tests/
│   ├── fixtures.ts        adds a per-test logger to Playwright
│   └── home.spec.ts       the first test
├── .env                   local settings (not committed)
├── .gitignore
├── .npmrc
├── package.json
└── playwright.config.ts   Playwright settings
```

Playwright runs every file ending in `.spec.ts` inside `tests/`.

## 7. Required configuration files

**`.env`** holds settings that differ between machines and environments:

```dotenv
# .env
LOG_LEVEL=info
BASE_URL=https://playwright.dev
HEADLESS=true
WORKERS=2
```

Create **`.gitignore`** so local settings and generated folders are not committed:

```text
node_modules/
.env
test-results/
playwright-report/
```

**`support/core.ts`** reads `.env` and creates the logger. Every other file imports from here:

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'web-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
```

**`playwright.config.ts`** takes its settings from `.env`. A wrong value, such as `BASE_URL=example`, stops the run before a browser starts:

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

Imports between your own files end in `.js` even though the files are `.ts`. That is how TypeScript's module system works; Playwright resolves them to the `.ts` files.

## 8. First working automated test

A Playwright _fixture_ is a value that Playwright prepares for each test. **`tests/fixtures.ts`** adds a `log` fixture: a child logger that writes the test title and worker number on every line.

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

**`tests/home.spec.ts`** is the test. It imports `test` from the fixtures file, not from `@playwright/test`, so it can use `log`:

```ts
// tests/home.spec.ts
import { expect, test } from './fixtures.js';

test('home page has the expected title', async ({ page, log }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Playwright/);
  log.info('Home page checked', { url: page.url() });
});
```

`page.goto('/')` opens `BASE_URL`, because the config sets it as `baseURL`.

## 9. How to execute tests

```bash
npx playwright test
```

Useful variants:

| Command                                  | What it does                              |
| ---------------------------------------- | ----------------------------------------- |
| `npx playwright test --headed`           | Shows the browser window while tests run. |
| `npx playwright test tests/home.spec.ts` | Runs one file.                            |
| `npx playwright show-report`             | Opens the HTML report of the last run.    |

## 10. Expected result

The output contains a JSON log line from Core and ends with:

```text
  1 passed
```

The log line looks like this (`time`, `pid`, and `hostname` differ):

```text
{"level":30,"time":1767225600000,"pid":1234,"hostname":"my-pc","name":"web-tests","test":"home page has the expected title","worker":0,"url":"https://playwright.dev/","msg":"Home page checked"}
```

## 11. Common problems and solutions

| Problem                                               | Solution                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `npm error code E401` while installing Core           | `NODE_AUTH_TOKEN` is not set in this terminal. Repeat step 5.2.      |
| `E404 Not Found` with `registry.npmjs.org` in the URL | `.npmrc` is missing or not in the project folder. Repeat step 5.3.   |
| `Executable doesn't exist at ...`                     | The browser is not installed. Run `npx playwright install chromium`. |
| `INVALID_ENVIRONMENT_VARIABLE` for `BASE_URL`         | Use a full URL that starts with `http://` or `https://`.             |
| `Test timeout of 30000ms exceeded` on `page.goto`     | The site is slow or unreachable. Check `BASE_URL` and your network.  |

More installation and environment problems: [Troubleshooting](troubleshooting.md).

## Next steps

- Read settings safely: [Configuration and environment variables](configuration.md)
- Log useful data without leaking secrets: [Logging](logging.md)
- Retry flaky setup calls: [Retry](retry.md)
