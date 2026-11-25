# Database testing with PostgreSQL

[← Back to README](../README.md)

## 1. What you will build

A test project that connects to a PostgreSQL database and checks data with SQL queries. It uses the [`pg`](https://node-postgres.com) client and the test runner built into Node.js, so no extra test framework is needed. QAFundix Core reads the connection string from `.env`, waits for the database with a safe retry, and logs results. At the end you will run one test that queries the database.

## 2. Prerequisites

| You need              | How to check                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Node.js 22.18+        | `node -v` prints `v22.18.0` or higher. Node.js runs the `.ts` test files directly from this version on.              |
| npm                   | `npm -v` prints a version. npm comes with Node.js.                                                                   |
| A GitHub token        | A personal access token (classic) with `read:packages`. Created in [step 5](#5-install-and-configure-qafundix-core). |
| A PostgreSQL database | Host, port, database name, user and password of a database you are allowed to test against.                          |

To start a local database for practice, install [Docker](https://www.docker.com/) and run:

```bash
docker run --name qa-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

This starts PostgreSQL 17 on port 5432 with user `postgres` and password `postgres`. Never point tests that change data at a production database.

## 3. Create a new project

Open a terminal in the folder where you keep your projects and run:

```bash
mkdir my-db-tests
cd my-db-tests
npm init -y
npm pkg set type=module
npm pkg set scripts.test="node --test tests/*.test.ts"
```

- `npm init -y` creates `package.json`.
- `type=module` tells Node.js to use modern `import` syntax.
- The last command adds `npm test`, which runs every `*.test.ts` file in `tests/` with the Node.js test runner.

All following commands run inside `my-db-tests`.

## 4. Install dependencies

```bash
npm install pg
npm install --save-dev @types/pg typescript @types/node
```

- `pg` is the PostgreSQL client for Node.js.
- `@types/pg`, `typescript` and `@types/node` give your editor type checking and autocompletion.

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
my-db-tests/
├── support/
│   └── core.ts              creates env and logger once
├── tests/
│   └── database.test.ts     the first test
├── .env                     connection string (not committed)
├── .gitignore
├── .npmrc
├── package.json
└── tsconfig.json            TypeScript settings for your editor
```

## 7. Required configuration files

**`.env`** holds the connection string in the form `postgres://user:password@host:port/database`. The example matches the Docker command above:

```dotenv
# .env
LOG_LEVEL=info
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
```

The connection string contains a password. Create **`.gitignore`** so it is never committed:

```text
node_modules/
.env
```

**`tsconfig.json`** configures TypeScript for your editor and for `npx tsc`:

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

Node.js runs these `.ts` files directly, so imports between your own files use the `.ts` extension. `allowImportingTsExtensions` lets TypeScript accept that, and `erasableSyntaxOnly` warns about syntax Node.js cannot run.

**`support/core.ts`** reads `.env` and creates the logger:

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'db-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
```

## 8. First working automated test

**`tests/database.test.ts`** connects once, waits until the database answers, runs a query, and closes the connection at the end:

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

What each part does:

- `env.require('DATABASE_URL')` stops with `MISSING_ENVIRONMENT_VARIABLE` if the setting is missing.
- `before` runs once before the tests. `retry` repeats `SELECT 1` with growing pauses (1, 2, 4, 8 seconds) until the database answers, and gives up after 30 seconds.
- `after` closes the connection pool so the process can exit.
- Replace the query with checks on your own tables, for example `SELECT count(*) FROM orders WHERE status = 'paid'`.

Retry only reads and statements that are safe to run twice. Never wrap `INSERT`, `UPDATE`, or money transfers in `retry`: a repeated write can duplicate data.

## 9. How to execute tests

```bash
npm test
```

To check types without running the tests, run `npx tsc`. No output means no type errors.

## 10. Expected result

The test runner prints a log line from Core and a summary that includes:

```text
pass 1
fail 0
```

Depending on the Node.js version, the summary lines start with `ℹ` or `#`.

If the database cannot be reached, you see several `Database not ready, retrying` warnings and then a failure with `RETRY_EXHAUSTED` after about 15 seconds.

## 11. Common problems and solutions

| Problem                                               | Solution                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm error code E401` while installing Core           | `NODE_AUTH_TOKEN` is not set in this terminal. Repeat step 5.2.            |
| `E404 Not Found` with `registry.npmjs.org` in the URL | `.npmrc` is missing or not in the project folder. Repeat step 5.3.         |
| `RETRY_EXHAUSTED` with `ECONNREFUSED` as the cause    | The server is not running, or the host or port in `DATABASE_URL` is wrong. |
| `password authentication failed for user`             | Fix the user name or password in `DATABASE_URL`.                           |
| `MISSING_ENVIRONMENT_VARIABLE` for `DATABASE_URL`     | Add `DATABASE_URL` to `.env`, or run the command from the project folder.  |
| `ERR_UNKNOWN_FILE_EXTENSION ".ts"`                    | Node.js is older than 22.18. Upgrade Node.js.                              |
| `Cannot find module '../support/core.js'`             | Imports in this project must end in `.ts`, as in the example.              |

More installation and environment problems: [Troubleshooting](troubleshooting.md).

## Next steps

- Read more settings from `.env`: [Configuration and environment variables](configuration.md)
- Retry rules and timeouts: [Retry](retry.md)
- Log query results without leaking secrets: [Logging](logging.md)
