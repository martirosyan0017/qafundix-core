# API automation — Playwright API

You need **Node.js 22.18+** and [access to Core](getting-started.md#option-a-install-from-github-packages) (a GitHub token in `NODE_AUTH_TOKEN` and a `.npmrc` file). No browser is needed.

## 1. Create the project

```bash
mkdir my-api-tests
cd my-api-tests
npm init -y
npm pkg set type=module
npm install @martirosyan0017/qafundix-core zod@4
npm install --save-dev @playwright/test typescript @types/node
```

## 2. Add the files

```text
my-api-tests/
├── support/core.ts
├── tests/posts.spec.ts
├── .env
└── playwright.config.ts
```

The example calls the free test API [JSONPlaceholder](https://jsonplaceholder.typicode.com). Put your own service in `API_URL`.

```dotenv
# .env
LOG_LEVEL=info
API_URL=https://jsonplaceholder.typicode.com
```

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'api-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
```

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

Add `.env` to `.gitignore`, and keep API keys there, never in code.

## 3. Run

```bash
npx playwright test
```

You should see `1 passed`.

## Problems?

| Error                        | Fix                                                                  |
| ---------------------------- | -------------------------------------------------------------------- |
| `E401` when installing Core  | Set `NODE_AUTH_TOKEN` again in this terminal.                        |
| `CONFIG_VALIDATION_FAILED`   | The response doesn't match the schema; the message lists the fields. |
| `401` or `403` from your API | Add the API key to `.env` and to `extraHTTPHeaders`.                 |

More: [Troubleshooting](troubleshooting.md) · Next: [Configuration](configuration.md#validate-objects-with-a-schema), [Retry](retry.md)
