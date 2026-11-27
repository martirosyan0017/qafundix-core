# Getting started with QAFundix Core

[← Back to README](../README.md)

This page installs Core into any TypeScript project and runs a small script that uses configuration, environment variables, logging and retry. If you are starting a Playwright, Appium, API or PostgreSQL project, the [setup guides](../README.md#start-your-project) are quicker: they include everything on this page.

**Contents:** [1. Check your tools](#1-check-your-tools) · [2. Install the package](#2-install-the-package) · [3. Prepare your project](#3-prepare-your-project) · [4. Add environment values](#4-add-environment-values) · [5. Run your first check](#5-run-your-first-check) · [6. Share one setup module](#6-share-one-setup-module)

Run the commands in a terminal opened in your project's folder (the folder that contains, or will contain, `package.json`).

## 1. Check your tools

```bash
node -v
npm -v
```

| What you want to do                           | Minimum Node.js |
| --------------------------------------------- | --------------- |
| Use Core with `import` (ES modules)           | 22.0            |
| Use Core with `require()` (CommonJS projects) | 22.12           |
| Run `.ts` files directly with `node file.ts`  | 22.18           |

The simplest choice is the latest Node.js 22 or 24 LTS from [nodejs.org](https://nodejs.org/). Some Node.js versions print an `ExperimentalWarning` when they run a `.ts` file; it is harmless.

## 2. Install the package

There are two ways to get Core:

|                     | Option A: GitHub Packages                             | Option B: Local package file                                                   |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Use it when         | You use a released version in a real project or in CI | No version is published yet, you have no token, or you test unreleased changes |
| Needs a token       | Yes, a GitHub token with `read:packages`              | No                                                                             |
| `package.json` gets | `"@martirosyan0017/qafundix-core": "^1.1.0"`          | `"@martirosyan0017/qafundix-core": "file:../qafundix-core/…tgz"`               |
| Teammates and CI    | Run `npm install` and get the same version            | Need the same `.tgz` file at the same path; switch to Option A before sharing  |
| Updating            | `npm install @martirosyan0017/qafundix-core@latest`   | Rebuild and reinstall the `.tgz`                                               |

### Option A: Install from GitHub Packages

1. **Create a GitHub token.** On GitHub open **Settings → Developer settings → Personal access tokens → Tokens (classic)** and select **Generate new token (classic)**. Tick only **`read:packages`**, generate the token and copy it. GitHub shows it only once.

   > [!WARNING]
   > Never paste the token into `.npmrc`, source code, chat, or a commit. The next step keeps it in an environment variable instead.

2. **Put the token into `NODE_AUTH_TOKEN`.** The variable lasts only for the current terminal window. In CI, store the token as a secret and expose it as `NODE_AUTH_TOKEN`.

   Windows PowerShell (the token is hidden while you type):

   ```powershell
   $secureToken = Read-Host 'GitHub token' -AsSecureString
   $env:NODE_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
   ```

   macOS or Linux:

   ```bash
   read -rsp 'GitHub token: ' NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN && echo
   ```

3. **Tell npm where `@martirosyan0017` packages live.** Create `.npmrc` in the project folder with exactly these two lines. It contains no secret, so commit it:

   ```ini
   @martirosyan0017:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

   Only `@martirosyan0017/*` packages come from GitHub; all other packages still come from the public npm registry.

4. **Install Core:**

   ```bash
   npm install @martirosyan0017/qafundix-core
   ```

### Option B: Install from a local package file

1. **Build the package file.** In a terminal opened in the folder where you keep your projects:

   ```bash
   git clone https://github.com/martirosyan0017/qafundix-core.git
   cd qafundix-core
   npm ci
   npm run build
   npm pack
   ```

   `npm pack` prints the file name, for example `martirosyan0017-qafundix-core-1.1.0.tgz`, and saves the file in the `qafundix-core` folder.

2. **Install the file.** In a terminal opened in your project's folder, install it by path. This example assumes both folders sit side by side:

   ```bash
   npm install ../qafundix-core/martirosyan0017-qafundix-core-1.1.0.tgz
   ```

No token and no `.npmrc` are needed. Repeat both steps after every change to Core.

## 3. Prepare your project

**New project.** Create it and switch it to ES modules, then install Core with [step 2](#2-install-the-package):

```bash
mkdir my-qa-project
cd my-qa-project
npm init -y
npm pkg set type=module
```

Add TypeScript and the Node.js types:

```bash
npm install --save-dev typescript @types/node
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "erasableSyntaxOnly": true,
    "types": ["node"]
  }
}
```

`erasableSyntaxOnly` makes TypeScript reject syntax that `node file.ts` cannot run, such as `enum` or constructor parameter properties.

**Existing project.** You usually change nothing. Core works with these TypeScript settings:

| Your `tsconfig.json` settings                                             | Works with Core                |
| ------------------------------------------------------------------------- | ------------------------------ |
| `"module": "NodeNext"` (or `Node16`)                                      | Yes                            |
| `"module": "ESNext"` or `"Preserve"` with `"moduleResolution": "Bundler"` | Yes                            |
| `"module": "CommonJS"`                                                    | Yes, on Node.js 22.12 or later |
| No `tsconfig.json` (the test runner's defaults)                           | Yes                            |

Make sure `@types/node` is installed. To write your own validation schemas, also install Zod 4: `npm install zod@4`.

## 4. Add environment values

Create `.env` in the project folder:

```dotenv
NODE_ENV=development
LOG_LEVEL=info
BASE_URL=https://example.com
API_TOKEN=replace-me
```

Add a line containing `.env` to `.gitignore` (create the file if it does not exist), so local values and secrets are never committed.

`new EnvironmentManager()` reads `.env` from the folder you run the command in. Variables already set in the shell or in CI always win over `.env`.

## 5. Run your first check

Create `first-check.ts` in the project folder:

```ts
// first-check.ts
import {
  ConfigLoader,
  EnvironmentManager,
  FrameworkError,
  Logger,
  commonConfigSchema,
  retry,
} from '@martirosyan0017/qafundix-core';

// 1. Read and validate settings. A wrong NODE_ENV or LOG_LEVEL stops here with a clear error.
const env = new EnvironmentManager();
const config = ConfigLoader.load(
  { environment: env.name, logLevel: env.get('LOG_LEVEL') ?? 'info' },
  commonConfigSchema,
);
const baseUrl = env.getUrl('BASE_URL', 'https://example.com');

// 2. Create a logger. Fields named like secrets (apiToken here) are written as [REDACTED].
const logger = new Logger({ name: 'first-check', level: config.logLevel });

// 3. Call the site, retrying up to 3 times if it fails or takes longer than 10 seconds.
try {
  const status = await retry(
    async (_attempt, signal) => {
      const response = await fetch(baseUrl, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.status;
    },
    { attempts: 3, delayMs: 500, attemptTimeoutMs: 10_000 },
  );
  logger.info('First check passed', {
    environment: config.environment,
    url: baseUrl.href,
    status,
    apiToken: env.get('API_TOKEN'),
  });
} catch (error) {
  const code = error instanceof FrameworkError ? error.code : 'UNKNOWN';
  logger.error('First check failed', { code, error });
  process.exitCode = 1;
}
```

Check the types (no output means no problems), then run it:

```bash
npx tsc --noEmit
node first-check.ts
```

Expected output, one JSON line (`time`, `pid`, and `hostname` differ on your machine):

```text
{"level":30,"time":1767225600000,"pid":1234,"hostname":"my-pc","name":"first-check","environment":"development","url":"https://example.com/","status":200,"apiToken":"[REDACTED]","msg":"First check passed"}
```

That line means Core is installed and working. Without internet access you get `First check failed` with `"code":"RETRY_EXHAUSTED"` instead; Core still works, the site just could not be reached.

## 6. Share one setup module

In a real project, create the logger and settings once and import them everywhere. Create `src/support/core.ts`:

```ts
// src/support/core.ts
import {
  ConfigLoader,
  EnvironmentManager,
  Logger,
  commonConfigSchema,
} from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();

export const config = ConfigLoader.load(
  { environment: env.name, logLevel: env.get('LOG_LEVEL') ?? 'info' },
  commonConfigSchema,
);

export const logger = new Logger({ name: 'qa-tests', level: config.logLevel });

export const settings = {
  baseUrl: env.getUrl('BASE_URL', 'http://localhost:3000'),
  headless: env.getBoolean('HEADLESS', true),
  workers: env.getNumber('WORKERS', 2, { integer: true, min: 1, max: 16 }),
};
```

Other files import it with a `.js` extension, as TypeScript's `NodeNext` setting requires: `import { logger } from './src/support/core.js'`. Playwright and WebdriverIO resolve that to the `.ts` file. Plain `node file.ts` does not, which is why step 5 keeps everything in one file.

**You are done when** `npm ls @martirosyan0017/qafundix-core` shows the package and `node first-check.ts` prints a log line.

## Next steps

- Set up a framework: [Mobile](mobile-automation.md) · [Web](web-automation.md) · [API](api-automation.md) · [Database](database-automation.md)
- Learn the tools: [Configuration](configuration.md) · [Logging](logging.md) · [Retry](retry.md) · [Errors](errors.md) · [Utilities](utilities.md)
- Something went wrong: [Troubleshooting](troubleshooting.md)
