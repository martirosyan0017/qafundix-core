# API automation with Playwright API

[← Back to README](../README.md)

## 1. What you will build

A test project for REST and HTTP services. Playwright's `request` fixture sends HTTP requests directly, so no browser is needed. QAFundix Core reads settings from `.env`, retries requests that are safe to repeat, and validates the response shape with a schema. At the end you will run one test that calls an endpoint and checks the response.

The example uses [JSONPlaceholder](https://jsonplaceholder.typicode.com), a free public test API. Replace it with your own service when you are ready.

## 2. Prerequisites

| You need       | How to check                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Node.js 22.18+ | `node -v` prints `v22.18.0` or higher. Install the LTS version from [nodejs.org](https://nodejs.org/).               |
| npm            | `npm -v` prints a version. npm comes with Node.js.                                                                   |
| A GitHub token | A personal access token (classic) with `read:packages`. Created in [step 5](#5-install-and-configure-qafundix-core). |
| Network access | The machine must reach the API you test.                                                                             |

## 3. Create a new project

Open a terminal in the folder where you keep your projects and run:

```bash
mkdir my-api-tests
cd my-api-tests
npm init -y
npm pkg set type=module
```

`npm init -y` creates `package.json`. `type=module` tells Node.js to use modern `import` syntax, which Core and these examples use.

All following commands run inside `my-api-tests`.

## 4. Install dependencies

```bash
npm install zod@4
npm install --save-dev @playwright/test typescript @types/node
```

- `zod` describes the expected shape of a response (a _schema_) so the test can check it.
- `@playwright/test` is the test runner; its `request` fixture sends HTTP requests.
- `typescript` and `@types/node` give your editor type checking and autocompletion.

API tests do not need `npx playwright install`, because no browser is started.

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
my-api-tests/
├── support/
│   └── core.ts            creates env and logger once
├── tests/
│   └── posts.spec.ts      the first test
├── .env                   local settings (not committed)
├── .gitignore
├── .npmrc
├── package.json
└── playwright.config.ts   base URL and default headers
```

## 7. Required configuration files

**`.env`** holds the service address and log level. Put API keys here too, never in code:

```dotenv
# .env
LOG_LEVEL=info
API_URL=https://jsonplaceholder.typicode.com
```

Create **`.gitignore`**:

```text
node_modules/
.env
test-results/
playwright-report/
```

**`support/core.ts`** reads `.env` and creates the logger:

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'api-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
```

**`playwright.config.ts`** sets the base URL, so tests can call `request.get('/posts/1')`:

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { env } from './support/core.js';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: env.getUrl('API_URL', 'https://jsonplaceholder.typicode.com').toString(),
    extraHTTPHeaders: { accept: 'application/json' },
  },
});
```

If your API needs a key, read it with `env.require('API_KEY')` and add it to `extraHTTPHeaders`. Use a header name such as `authorization` or `x-api-key`; the logger hides those keys if you log headers.

## 8. First working automated test

**`tests/posts.spec.ts`** gets one post, retries only server errors, and checks the response against a schema:

```ts
// tests/posts.spec.ts
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { ConfigLoader, retry } from '@martirosyan0017/qafundix-core';
import { logger } from '../support/core.js';

const postSchema = z.object({
  id: z.number(),
  userId: z.number(),
  title: z.string().min(1),
});

class ServerError extends Error {}

test('GET /posts/1 returns a valid post', async ({ request }) => {
  const log = logger.child({ test: 'GET /posts/1' });

  // GET is safe to repeat, so retry only server errors (5xx). Never retry payments or other
  // operations that change data unless the API guarantees they are idempotent.
  const body = await retry(
    async () => {
      const response = await request.get('/posts/1');
      if (response.status() >= 500) throw new ServerError(`Server returned ${response.status()}`);
      expect(response.status()).toBe(200);
      return response.json();
    },
    { attempts: 3, delayMs: 500, shouldRetry: (error) => error instanceof ServerError },
  );

  // Validates the response shape; throws FrameworkError CONFIG_VALIDATION_FAILED with every problem.
  const post = ConfigLoader.load(body, postSchema);
  log.info('Post received', { id: post.id, userId: post.userId });
  expect(post.id).toBe(1);
});
```

What each part does:

- `retry` repeats the request up to 3 times, but only when `shouldRetry` says so (here: server errors). A wrong status such as 404 fails the test at once.
- `ConfigLoader.load(body, postSchema)` checks the response against the schema and returns typed data. Despite the name, it works for any value, not only configuration.

## 9. How to execute tests

```bash
npx playwright test
```

Run one file with `npx playwright test tests/posts.spec.ts`. Open the HTML report with `npx playwright show-report`.

## 10. Expected result

The output contains a log line from Core and ends with:

```text
  1 passed
```

```text
{"level":30,"time":1767225600000,"pid":1234,"hostname":"my-pc","name":"api-tests","test":"GET /posts/1","id":1,"userId":1,"msg":"Post received"}
```

## 11. Common problems and solutions

| Problem                                               | Solution                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm error code E401` while installing Core           | `NODE_AUTH_TOKEN` is not set in this terminal. Repeat step 5.2.                      |
| `E404 Not Found` with `registry.npmjs.org` in the URL | `.npmrc` is missing or not in the project folder. Repeat step 5.3.                   |
| `CONFIG_VALIDATION_FAILED` in the test                | The response does not match `postSchema`. The message lists each field that differs. |
| `RETRY_EXHAUSTED`                                     | The service returned 5xx three times. Check that it is running.                      |
| `expect(received).toBe(expected)` with `401` or `403` | The API needs authentication. Add the key to `.env` and `extraHTTPHeaders`.          |
| `ECONNREFUSED` or `getaddrinfo ENOTFOUND`             | `API_URL` is wrong or the service is not reachable from this machine.                |

More installation and environment problems: [Troubleshooting](troubleshooting.md).

## Next steps

- Validate more complex responses: [Configuration and validation](configuration.md#validate-objects-with-a-schema)
- Retry rules, timeouts and cancellation: [Retry](retry.md)
- Keep tokens out of logs: [Logging](logging.md#secret-redaction)
