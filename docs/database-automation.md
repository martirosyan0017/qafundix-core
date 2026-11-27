# Database testing — PostgreSQL

You need **Node.js 22.18+**, [access to Core](getting-started.md#option-a-install-from-github-packages) (a GitHub token in `NODE_AUTH_TOKEN` and a `.npmrc` file), and a PostgreSQL database you may test against.

No database yet? With [Docker](https://www.docker.com/):

```bash
docker run --name qa-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

## 1. Create the project

```bash
mkdir my-db-tests
cd my-db-tests
npm init -y
npm pkg set type=module
npm pkg set scripts.test="node --test tests/*.test.ts"
npm install @martirosyan0017/qafundix-core pg
npm install --save-dev @types/pg typescript @types/node
```

## 2. Add the files

```text
my-db-tests/
├── support/core.ts
├── tests/database.test.ts
├── .env
└── tsconfig.json
```

```dotenv
# .env
LOG_LEVEL=info
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "types": ["node"]
  }
}
```

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'db-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
```

```ts
// tests/database.test.ts
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { retry } from '@martirosyan0017/qafundix-core';
import { env, logger } from '../support/core.ts';

// The URL contains a password: pass it to the client, never to the logger.
const pool = new pg.Pool({ connectionString: env.require('DATABASE_URL'), max: 2 });
const log = logger.child({ suite: 'database' });

before(async () => {
  // The server may still be starting (for example in CI). SELECT 1 is safe to repeat.
  await retry(() => pool.query('SELECT 1'), {
    attempts: 5,
    delayMs: 1_000,
    backoff: 'exponential',
    timeoutMs: 30_000,
    onRetry: ({ attempt }) => log.warn('Database not ready, retrying', { attempt }),
  });
});

after(() => pool.end());

test('database answers a query', async () => {
  const result = await pool.query<{ answer: number }>('SELECT 40 + 2 AS answer');
  log.info('Query finished', { rows: result.rowCount });
  assert.equal(result.rows[0]?.answer, 42);
});
```

Add `.env` to `.gitignore`: it contains a password. Imports in this project end in `.ts`, because Node.js runs the files directly. Only retry reads; never retry `INSERT`, `UPDATE` or money transfers.

## 3. Run

```bash
npm test
```

You should see `pass 1` and `fail 0`.

## Problems?

| Error                                 | Fix                                                     |
| ------------------------------------- | ------------------------------------------------------- |
| `E401` when installing Core           | Set `NODE_AUTH_TOKEN` again in this terminal.           |
| `RETRY_EXHAUSTED` with `ECONNREFUSED` | The database isn't running, or `DATABASE_URL` is wrong. |
| `password authentication failed`      | Fix the user or password in `DATABASE_URL`.             |
| `ERR_UNKNOWN_FILE_EXTENSION ".ts"`    | Upgrade Node.js to 22.18 or later.                      |

More: [Troubleshooting](troubleshooting.md) · Next: [Configuration](configuration.md), [Retry](retry.md)
