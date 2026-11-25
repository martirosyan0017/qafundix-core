# QAFundix — A Foundation for QA Automation

`@martirosyan0017/qafundix-core` (called **Core** in this document) holds the shared TypeScript building blocks for test automation projects: validated configuration, typed environment variables, structured logging with secret redaction, consistent errors, and a configurable retry helper.

QAFundix continues the earlier `qa-automation-core` project under a new name. The API is the same; only the package name and imports change, see [CHANGELOG.md](CHANGELOG.md).

[![CI](https://github.com/martirosyan0017/qafundix-core/actions/workflows/ci.yml/badge.svg)](https://github.com/martirosyan0017/qafundix-core/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

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

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [Getting Started — Integrate into Your QA Project](#getting-started--integrate-into-your-qa-project)
   1. [Check your tools](#step-1-check-your-tools)
   2. [Install the package](#step-2-install-the-package)
   3. [Prepare your project](#step-3-prepare-your-project)
   4. [Add environment values](#step-4-add-environment-values)
   5. [Run your first check](#step-5-run-your-first-check)
   6. [Share one setup module](#step-6-share-one-setup-module)
   7. [Connect your framework](#step-7-connect-your-framework)
   8. [Troubleshooting](#troubleshooting)
4. [Setup guides](#setup-guides)
   - [Mobile — Appium + WebdriverIO (Android & iOS)](#mobile-automation--appium--webdriverio-android--ios)
   - [Web — Playwright](#web-automation--playwright)
   - [API — Playwright API](#api-automation--playwright-api)
   - [Database — PostgreSQL](#database-automation--postgresql)
5. [Usage](#usage)
   - [Environment variables](#environment-variables)
   - [Configuration](#configuration)
   - [Logging](#logging)
   - [Errors](#errors)
   - [Retry](#retry)
   - [Helpers](#helpers)
6. [Project structure](#project-structure)
7. [Development commands](#development-commands)
8. [Contributing, issues and versions](#contributing-issues-and-versions)
9. [License and links](#license-and-links)

## Overview

Most automation repositories end up writing the same plumbing: reading `.env` files, checking that variables exist, setting up a logger, wrapping flaky calls in a retry loop. This package keeps that code in one place with its own tests, so projects behave the same way and a fix only has to be made once.

Core has no dependency on Playwright, WebdriverIO, Appium or any database client, and nothing in it is specific to an application. It is added to a project as a regular dependency; your framework setup stays as it is.

| Belongs in Core                                   | Belongs in your test project                     |
| ------------------------------------------------- | ------------------------------------------------ |
| Reading and validating environment variables      | Browser, device, and API client setup            |
| Validating configuration objects with Zod schemas | Page objects, screens, locators                  |
| Structured logging and secret redaction           | Test data, fixtures, business scenarios          |
| Error type with stable codes                      | Test runner configuration and reporters          |
| Retry with backoff, timeouts, and cancellation    | Framework-specific waits (`expect`, `waitUntil`) |

## Features

| Area                  | Export                                                                 | What it gives you                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Environment variables | `EnvironmentManager`                                                   | Loads `.env` once, validates `NODE_ENV`, and reads variables as text, numbers, booleans, URLs, or values from an allowed list.          |
| Configuration         | `ConfigLoader`, `commonConfigSchema`                                   | Validates any object against a Zod schema and reports every problem with its path, for example `db.port: Invalid input`.                |
| Logging               | `Logger`, `DEFAULT_REDACT_KEYS`                                        | JSON logs (Pino) with `trace` to `fatal` levels, child loggers per test or worker, and hiding of fields named like passwords or tokens. |
| Errors                | `FrameworkError`                                                       | One error class with a stable `code`, `metadata`, and the original `cause`, so failures are easy to filter and report.                  |
| Retry                 | `retry`                                                                | Fixed or exponential backoff, maximum delay, jitter, retry filter, retry hook, per-attempt and total timeouts, and cancellation.        |
| Helpers               | `toCamelCase`, `normalizeWhitespace`, `toIsoString`, `addMilliseconds` | Small string and date utilities for test data and reports.                                                                              |
| Types                 | `ENVIRONMENTS`, `LogLevel`, `RetryOptions`, and others                 | Exported TypeScript types for your own helpers and configuration.                                                                       |

## Getting Started — Integrate into Your QA Project

From an empty folder (or an existing project) to a first working check:

| Step                                                        | Result                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| [1. Check your tools](#step-1-check-your-tools)             | Node.js and npm versions confirmed                      |
| [2. Install the package](#step-2-install-the-package)       | Core is in `node_modules` and `package.json`            |
| [3. Prepare your project](#step-3-prepare-your-project)     | TypeScript settings that work with Core                 |
| [4. Add environment values](#step-4-add-environment-values) | A local `.env` file                                     |
| [5. Run your first check](#step-5-run-your-first-check)     | A script that uses config, logging, and retry           |
| [6. Share one setup module](#step-6-share-one-setup-module) | One file the rest of your tests import                  |
| [7. Connect your framework](#step-7-connect-your-framework) | Core used from your mobile, web, API, or database tests |

Unless a step says otherwise, run commands in a terminal opened in **your test project's root folder**: the folder that contains (or will contain) its `package.json`.

### Step 1: Check your tools

```bash
node -v
npm -v
```

| What you want to do                                            | Minimum Node.js |
| -------------------------------------------------------------- | --------------- |
| Use Core with `import` (ES modules, the default in this guide) | 22.0            |
| Use Core with `require()` (CommonJS projects)                  | 22.12           |
| Run `.ts` files directly with `node file.ts`, as Step 5 does   | 22.18           |

The simplest choice is the latest Node.js 22 or 24 LTS from [nodejs.org](https://nodejs.org/). Some Node.js versions print an `ExperimentalWarning` about type stripping when they run a `.ts` file; it is harmless.

### Step 2: Install the package

There are two ways to get Core. Pick one.

|                     | **Option A: GitHub Packages** (normal use)            | **Option B: Local package file** (trying it out)                                 |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Use it when         | You use a released version in a real project or in CI | No version is published yet, you have no token, or you test unreleased changes   |
| Needs a token       | Yes, a GitHub token with `read:packages`              | No                                                                               |
| Needs Core's code   | No                                                    | Yes, a local clone of `qafundix-core`                                            |
| `package.json` gets | `"@martirosyan0017/qafundix-core": "^1.1.0"`          | `"@martirosyan0017/qafundix-core": "file:../qafundix-core/…tgz"`                 |
| Teammates and CI    | Run `npm install` and get the same version            | Need the same `.tgz` file at the same path, so switch to Option A before sharing |
| Updating            | `npm install @martirosyan0017/qafundix-core@latest`   | Rebuild and reinstall the `.tgz`                                                 |

#### Option A: Install from GitHub Packages

**A1. Create a GitHub token.**

1. Open GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. Select **Generate new token (classic)**.
3. Tick only **`read:packages`**.
4. Generate the token and copy it. GitHub shows it only once.

> [!WARNING]
> Never paste the token into `.npmrc`, source code, chat, or a commit. The next step keeps it in an environment variable instead.

**A2. Put the token in the `NODE_AUTH_TOKEN` environment variable.** It lasts only for the current terminal window, so repeat this in every new terminal. In CI, store the token as a secret and expose it as `NODE_AUTH_TOKEN`.

Windows PowerShell (the token is hidden while you type):

```powershell
$secureToken = Read-Host 'GitHub token' -AsSecureString
$env:NODE_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
```

macOS or Linux (bash or zsh):

```bash
read -rsp 'GitHub token: ' NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN && echo
```

**A3. Tell npm where `@martirosyan0017` packages live.** Create a file named `.npmrc` in the project root with exactly these two lines. It contains no secret, so commit it:

```ini
@martirosyan0017:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Only `@martirosyan0017/*` packages come from GitHub; all other packages still come from the public npm registry.

**A4. Install Core.**

```bash
npm install @martirosyan0017/qafundix-core
```

Continue with [Step 3](#step-3-prepare-your-project).

#### Option B: Install from a local package file

**B1. Build the package file.** In a terminal opened in the **`qafundix-core` folder** (clone it first if needed):

```bash
git clone https://github.com/martirosyan0017/qafundix-core.git
cd qafundix-core
npm ci
npm run build
npm pack
```

`npm pack` prints the file name, for example `martirosyan0017-qafundix-core-1.1.0.tgz`, and saves the file in that folder.

**B2. Install the file.** In a terminal opened in **your test project's folder**, install it by path. This example assumes both folders sit side by side:

```bash
npm install ../qafundix-core/martirosyan0017-qafundix-core-1.1.0.tgz
```

No token and no `.npmrc` are needed. Repeat B1 and B2 after every change to Core.

### Step 3: Prepare your project

**New project.** Create it and switch it to ES modules:

```bash
mkdir my-qa-project
cd my-qa-project
npm init -y
npm pkg set type=module
```

Then install Core with [Step 2](#step-2-install-the-package), and add TypeScript and the Node.js types:

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

Also make sure `@types/node` is installed (`npm install --save-dev @types/node`). To write your own configuration schemas, install Zod 4 as well: `npm install zod@4`.

### Step 4: Add environment values

Create `.env` in the project root:

```dotenv
NODE_ENV=development
LOG_LEVEL=info
BASE_URL=https://example.com
API_TOKEN=replace-me
```

Add a line containing `.env` to your `.gitignore` file (create the file if it does not exist), so local values and secrets are never committed.

`new EnvironmentManager()` reads `.env` from the folder you run the command in. Variables already set in the shell or in CI always win over `.env`.

### Step 5: Run your first check

Create `first-check.ts` in the project root. It uses configuration, environment variables, logging, retry, and errors:

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

Check the types (optional, no output means no problems), then run it:

```bash
npx tsc --noEmit
node first-check.ts
```

Expected output, one JSON line (`time`, `pid`, and `hostname` differ on your machine):

```json
{
  "level": 30,
  "time": 1767225600000,
  "pid": 1234,
  "hostname": "my-pc",
  "name": "first-check",
  "environment": "development",
  "url": "https://example.com/",
  "status": 200,
  "apiToken": "[REDACTED]",
  "msg": "First check passed"
}
```

That line means Core is installed and working. Without internet access you get `First check failed` with `"code":"RETRY_EXHAUSTED"` instead; Core is still working, the site just could not be reached.

### Step 6: Share one setup module

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

Other files import it with a `.js` extension, as TypeScript's `NodeNext` setting requires: `import { logger } from './src/support/core.js'`. Playwright and WebdriverIO resolve that to the `.ts` file automatically. Plain `node file.ts` does not, which is why Step 5 keeps everything in one file.

### Step 7: Connect your framework

Core needs no plugin or adapter, and your framework keeps its structure. Follow the guide for your project type:

| Project type           | Guide                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Android and iOS apps   | [Mobile — Appium + WebdriverIO](#mobile-automation--appium--webdriverio-android--ios) |
| Websites               | [Web — Playwright](#web-automation--playwright)                                       |
| REST and HTTP services | [API — Playwright API](#api-automation--playwright-api)                               |
| PostgreSQL data        | [Database — PostgreSQL](#database-automation--postgresql)                             |

[Usage](#usage) describes every option of each tool.

**You are done when:** `npm ls @martirosyan0017/qafundix-core` shows the package, `node first-check.ts` prints a log line, and your test runner starts with settings read through Core.

### Troubleshooting

| Symptom                                                                                           | Cause                                                                                                                                 | Fix                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm error code E401` / `401 Unauthorized`                                                        | `NODE_AUTH_TOKEN` is empty in this terminal, or the token expired or was revoked.                                                     | Repeat [A2](#option-a-install-from-github-packages) in the same terminal. Check with `node -e "console.log(!!process.env.NODE_AUTH_TOKEN)"`; it must print `true`. |
| `npm error code E403` / `403 Forbidden`                                                           | The token lacks `read:packages`, needs SSO authorization, or your account cannot see the package.                                     | Create a token with `read:packages`. If GitHub shows **Configure SSO** next to the token, authorize it. Ask the owner for access to a private package.             |
| `E404 Not Found` with `registry.npmjs.org` in the URL                                             | npm does not know the scope belongs to GitHub, so it searched the public registry.                                                    | Check that `.npmrc` is in the project root, next to `package.json`, and matches [A3](#option-a-install-from-github-packages) exactly.                              |
| `E404 Not Found` with `npm.pkg.github.com` in the URL                                             | The version is not published, or it is private and your token cannot see it.                                                          | Check the package page on GitHub for published versions, or use [Option B](#option-b-install-from-a-local-package-file).                                           |
| `npm error code ENOENT` (after `tarball data ... seems to be corrupted`) when installing a `.tgz` | The path to the package file is wrong.                                                                                                | Run `npm pack` again in the Core folder and copy the exact file name it prints. Use a path relative to your project folder, or an absolute path.                   |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` or `require() of ES Module`                                       | A CommonJS project loads Core with `require()` on Node.js older than 22.12.                                                           | Upgrade Node.js to 22.12 or later, or switch the project to ES modules with `npm pkg set type=module`.                                                             |
| `ERR_UNKNOWN_FILE_EXTENSION ".ts"` or `SyntaxError` on type annotations                           | Node.js is older than 22.18, so `node file.ts` cannot run TypeScript.                                                                 | Upgrade Node.js to 22.18 or later, or compile with `tsc` and run the `.js` output.                                                                                 |
| `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`                                                               | The file uses TypeScript syntax that Node.js cannot strip, such as `enum` or constructor parameter properties.                        | Rewrite that part with plain fields and objects. `"erasableSyntaxOnly": true` in `tsconfig.json` reports these places during `npx tsc --noEmit`.                   |
| `Cannot find module './src/support/core.js'` when using `node`                                    | Plain `node` does not map `.js` imports to `.ts` files.                                                                               | Run that code through your test runner, or keep the script in one file as in [Step 5](#step-5-run-your-first-check).                                               |
| TypeScript: `Cannot find name 'NodeJS'` or missing `AbortSignal` types                            | `@types/node` is not installed.                                                                                                       | `npm install --save-dev @types/node`                                                                                                                               |
| TypeScript: `Top-level 'await' expressions are only allowed when ...`                             | `tsconfig.json` targets an older module system.                                                                                       | Use the `tsconfig.json` from [Step 3](#step-3-prepare-your-project), or set `"module": "NodeNext"` and `"target": "ES2022"`.                                       |
| `npm warn EBADENGINE ... required: { node: '>=22' }`                                              | Node.js is older than 22.                                                                                                             | Install Node.js 22 or later and check with `node -v`.                                                                                                              |
| `FrameworkError: Unsupported NODE_ENV value: qa`                                                  | `NODE_ENV` has a name Core does not accept.                                                                                           | Use `development`, `staging`, `production`, or `test`. Put other target names in your own variable; see [Environment variables](#environment-variables).           |
| `FrameworkError: Configuration validation failed: logLevel: ...`                                  | `LOG_LEVEL` is not one of `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`.                                               | Fix the value in `.env` or in the shell.                                                                                                                           |
| `.env` values are ignored                                                                         | Commands run from another folder, the variable is already set in the shell, or an object was passed to `new EnvironmentManager(...)`. | Run from the folder that contains `.env`. Shell and CI variables always win. Only `new EnvironmentManager()` without arguments reads `.env`.                       |
| `ConfigLoader.load` rejects a Zod schema in TypeScript                                            | The schema comes from Zod 3.                                                                                                          | `npm install zod@4`                                                                                                                                                |

## Setup guides

Each guide is self-contained: it starts from an empty folder and ends with running a first test. Use the one that matches your project.

| Guide                                                                                | Test runner         | You test                      | First run command           |
| ------------------------------------------------------------------------------------ | ------------------- | ----------------------------- | --------------------------- |
| [Mobile: Appium + WebdriverIO](#mobile-automation--appium--webdriverio-android--ios) | WebdriverIO + Mocha | Android and iOS apps          | `npx wdio run wdio.conf.ts` |
| [Web: Playwright](#web-automation--playwright)                                       | Playwright Test     | Websites in real browsers     | `npx playwright test`       |
| [API: Playwright API](#api-automation--playwright-api)                               | Playwright Test     | REST and HTTP services        | `npx playwright test`       |
| [Database: PostgreSQL](#database-automation--postgresql)                             | Node.js test runner | Data in a PostgreSQL database | `npm test`                  |

**Before any guide:** Node.js 22.18 or later, and access to Core (a GitHub token and `.npmrc` from [Step 2](#step-2-install-the-package), or a local `.tgz` file). With a local file, replace `npm install @martirosyan0017/qafundix-core` with `npm install <path>/<file>.tgz`. Newer npm versions may print `install-scripts` warnings while installing; these guides were tested with those scripts skipped.

Every guide uses the same three Core pieces:

| File              | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `.env`            | Your local settings. Never commit it; add `.env` to `.gitignore`.                 |
| `support/core.ts` | Creates `env` and `logger` once. Every test imports them from here.               |
| Tests             | Use `logger.child(...)`, `retry`, and `FrameworkError` from Core where they help. |

---

### Mobile automation — Appium + WebdriverIO (Android & iOS)

**Prerequisites**

| Platform | You need                                                                                                                                                                                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android  | Android Studio with the Android SDK, `ANDROID_HOME` set to the SDK folder, `JAVA_HOME` set to a JDK (Android Studio ships one), and a running emulator or a USB device listed by `adb devices`.                                                                                                                                        |
| iOS      | macOS with Xcode and an iOS simulator. iOS tests cannot run on Windows or Linux. This guide covers simulators; a real iPhone also needs WebDriverAgent signed with a provisioning profile, see the XCUITest driver's [device preparation guide](https://appium.github.io/appium-xcuitest-driver/latest/getting-started/device-setup/). |
| Both     | Your app file: `.apk` for Android, or an `.app` simulator build for iOS.                                                                                                                                                                                                                                                               |

**1. Create the project and install**

```bash
mkdir my-mobile-tests
cd my-mobile-tests
npm init -y
npm pkg set type=module
npm install @martirosyan0017/qafundix-core
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter @wdio/appium-service @wdio/globals appium typescript @types/node
npx appium driver install uiautomator2
```

On macOS for iOS, also run `npx appium driver install xcuitest`.

Check the machine before the first run. The doctor lists anything missing, such as `ANDROID_HOME` or `JAVA_HOME`, and how to fix it:

```bash
npx appium driver doctor uiautomator2
```

Use `npx appium driver doctor xcuitest` for iOS.

**2. Folder structure**

```text
my-mobile-tests/
├── apps/                  your .apk / .app files
├── support/
│   └── core.ts            env + logger from Core
├── test/
│   └── specs/
│       └── app.e2e.ts     first test
├── .env
├── package.json
├── tsconfig.json
└── wdio.conf.ts
```

**3. Add the files**

```dotenv
# .env
LOG_LEVEL=info
PLATFORM=Android
DEVICE_NAME=Android Emulator
APP_PATH=./apps/app-debug.apk
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
    "types": ["node", "@wdio/globals/types", "@wdio/mocha-framework"]
  }
}
```

```ts
// support/core.ts
import { EnvironmentManager, Logger } from '@martirosyan0017/qafundix-core';

export const env = new EnvironmentManager();
export const logger = new Logger({
  name: 'mobile-tests',
  level: env.oneOf('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info'),
});
export const platform = env.oneOf('PLATFORM', ['Android', 'iOS'], 'Android');
```

```ts
// wdio.conf.ts
import { resolve } from 'node:path';
import { env, logger, platform } from './support/core.js';

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./test/specs/**/*.ts'],
  maxInstances: 1,
  services: ['appium'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { timeout: 120_000 },
  capabilities: [
    {
      platformName: platform,
      'appium:automationName': platform === 'Android' ? 'UiAutomator2' : 'XCUITest',
      'appium:deviceName': env.require('DEVICE_NAME'),
      'appium:app': resolve(env.require('APP_PATH')),
    },
  ],
  onPrepare() {
    logger.info('Mobile run starting', { platform });
  },
};
```

```ts
// test/specs/app.e2e.ts
import { driver, expect } from '@wdio/globals';
import { logger, platform } from '../../support/core.js';

describe('App launch', () => {
  it('shows the first screen', async () => {
    const log = logger.child({ test: 'app launch', platform });
    const screen = await driver.getPageSource();
    log.info('First screen loaded', { characters: screen.length });
    expect(screen.length).toBeGreaterThan(0);
  });
});
```

`env.require` stops the run with `MISSING_ENVIRONMENT_VARIABLE` if `DEVICE_NAME` or `APP_PATH` is missing. For iOS, set `PLATFORM=iOS`, a simulator name such as `iPhone 16` in `DEVICE_NAME`, and an `.app` path in `APP_PATH`.

**4. Run the first test**

Start the emulator (or connect the device), then:

```bash
npx wdio run wdio.conf.ts
```

The Appium service starts Appium for you. A passing run ends with `Spec Files: 1 passed, 1 total`.

| Problem                                                                       | Fix                                                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Neither ANDROID_HOME nor ANDROID_SDK_ROOT environment variable was exported` | Install the Android SDK (Android Studio) and set `ANDROID_HOME` to its folder, then open a new terminal. |
| `Could not find a driver for automationName 'UiAutomator2'`                   | Run `npx appium driver install uiautomator2` in the project folder.                                      |
| `MISSING_ENVIRONMENT_VARIABLE` for `DEVICE_NAME` or `APP_PATH`                | Add the variable to `.env`.                                                                              |

---

### Web automation — Playwright

**1. Create the project and install**

```bash
mkdir my-web-tests
cd my-web-tests
npm init -y
npm pkg set type=module
npm install @martirosyan0017/qafundix-core
npm install --save-dev @playwright/test typescript @types/node
npx playwright install chromium
```

**2. Folder structure**

```text
my-web-tests/
├── support/
│   └── core.ts            env + logger from Core
├── tests/
│   ├── fixtures.ts        adds a per-test logger
│   └── home.spec.ts       first test
├── .env
├── package.json
└── playwright.config.ts
```

**3. Add the files**

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

Every test gets `log`, a child logger that adds the test title and worker to each line. Use it instead of `console.log`.

**4. Run the first test**

```bash
npx playwright test
```

Expected result: `1 passed`. Run `npx playwright show-report` to open the HTML report.

| Problem                                       | Fix                                                      |
| --------------------------------------------- | -------------------------------------------------------- |
| `Executable doesn't exist at ...`             | Run `npx playwright install chromium`.                   |
| `INVALID_ENVIRONMENT_VARIABLE` for `BASE_URL` | Use a full URL that starts with `http://` or `https://`. |

---

### API automation — Playwright API

No browser is needed: Playwright's `request` fixture sends HTTP requests directly.

**1. Create the project and install**

```bash
mkdir my-api-tests
cd my-api-tests
npm init -y
npm pkg set type=module
npm install @martirosyan0017/qafundix-core zod@4
npm install --save-dev @playwright/test typescript @types/node
```

**2. Folder structure**

```text
my-api-tests/
├── support/
│   └── core.ts            env + logger from Core
├── tests/
│   └── posts.spec.ts      first test
├── .env
├── package.json
└── playwright.config.ts
```

**3. Add the files**

The example uses the public test API [JSONPlaceholder](https://jsonplaceholder.typicode.com). Replace `API_URL` with your service.

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

`ConfigLoader.load` validates any value against a Zod schema, so it works for API responses as well as configuration.

**4. Run the first test**

```bash
npx playwright test
```

Expected result: `1 passed`.

| Problem                                | Fix                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `CONFIG_VALIDATION_FAILED` in the test | The response does not match `postSchema`; the message lists each field that differs. |
| `RETRY_EXHAUSTED`                      | The service returned 5xx three times; check that it is running.                      |

---

### Database automation — PostgreSQL

This guide uses the [`pg`](https://node-postgres.com) client and Node.js's built-in test runner, so no extra test framework is needed.

**1. Create the project and install**

```bash
mkdir my-db-tests
cd my-db-tests
npm init -y
npm pkg set type=module
npm pkg set scripts.test="node --test tests/*.test.ts"
npm install @martirosyan0017/qafundix-core pg
npm install --save-dev @types/pg typescript @types/node
```

You need a PostgreSQL server you are allowed to test against. To start a local one with Docker:

```bash
docker run --name qa-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

**2. Folder structure**

```text
my-db-tests/
├── support/
│   └── core.ts                  env + logger from Core
├── tests/
│   └── database.test.ts         first test
├── .env
├── package.json
└── tsconfig.json
```

**3. Add the files**

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

Node.js runs these `.ts` files directly, so imports between your own files use the `.ts` extension; `allowImportingTsExtensions` lets TypeScript accept that.

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

Retry only read queries or statements that are safe to run twice. Do not wrap `INSERT`, `UPDATE`, or money transfers in `retry`.

**4. Run the first test**

```bash
npm test
```

Expected result: the test runner summary shows `pass 1` and `fail 0`. If the database is not reachable, you see `Database not ready, retrying` warnings and then a `RETRY_EXHAUSTED` failure after about 15 seconds.

| Problem                                            | Fix                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `RETRY_EXHAUSTED` with `ECONNREFUSED` as the cause | The server is not running, or host or port in `DATABASE_URL` is wrong. |
| `password authentication failed for user`          | Fix the user name or password in `DATABASE_URL`.                       |
| `MISSING_ENVIRONMENT_VARIABLE` for `DATABASE_URL`  | Add `DATABASE_URL` to `.env`.                                          |

## Usage

All examples import from `@martirosyan0017/qafundix-core` and run as ES modules on Node.js 22 or later.

### Environment variables

`EnvironmentManager` reads from `process.env` by default. Pass an object instead to make tests independent of the machine they run on; in that case no `.env` file is loaded.

```ts
// examples/environment.ts
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

| Method                                            | Returns                                                | When the variable is missing or blank            | When the value is invalid                                         |
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

### Configuration

`ConfigLoader.load(value, schema)` validates any value against a [Zod](https://zod.dev) schema and returns the typed result. `commonConfigSchema` covers the two settings every project has: `environment` and `logLevel`. Extend it for your own settings:

```ts
// examples/configuration.ts
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

When validation fails, Core throws `FrameworkError` with code `CONFIG_VALIDATION_FAILED`. The message lists every problem as `path: message` (`<root>` for the top level), `metadata.issues` holds the same list as data, and `cause` is the original `ZodError`. Input values are not copied into the message.

### Logging

`Logger` writes one JSON object per line to standard output, using [Pino](https://getpino.io). The default level is `info`.

```ts
// examples/logging.ts
import { Logger } from '@martirosyan0017/qafundix-core';

const logger = new Logger({ name: 'checkout-suite', level: 'debug' });

logger.info('Suite started', { browser: 'chromium', shard: 1 });
logger.debug('Opening page', { url: 'https://example.com/cart' });

// A child logger adds the same fields to every line it writes.
const testLogger = logger.child({ testName: 'pays with saved card', worker: 2 });
testLogger.warn('Slow response', { durationMs: 2_150 });

// Secret-looking keys are hidden automatically.
testLogger.info('Signed in', { user: 'qa@example.com', password: 'hunter2', sessionId: 'abc' });
// -> ..."user":"qa@example.com","password":"[REDACTED]","sessionId":"[REDACTED]"...

// Errors are written with their type, message, and stack.
testLogger.error('Payment failed', { error: new Error('Card declined') });
```

Output line for the warning above (`time`, `pid` and `hostname` vary):

```json
{
  "level": 40,
  "time": 1767225600000,
  "pid": 1234,
  "hostname": "runner",
  "name": "checkout-suite",
  "testName": "pays with saved card",
  "worker": 2,
  "durationMs": 2150,
  "msg": "Slow response"
}
```

| Option        | Type                                                                       | Default                    | Purpose                                                                        |
| ------------- | -------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| `level`       | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal' \| 'silent'` | `'info'`                   | Lowest level that is written. `silent` writes nothing.                         |
| `name`        | `string`                                                                   | none                       | Added to every line as `name`.                                                 |
| `redaction`   | `{ keys?, replaceDefaults?, censor? }`                                     | default keys, `[REDACTED]` | Which keys to hide and the replacement text. See below.                        |
| `destination` | Pino destination stream                                                    | standard output            | Where lines are written, for example a file stream or a test capture.          |
| `pinoOptions` | Pino `LoggerOptions`                                                       | none                       | Advanced Pino settings. Applied last, so they can override `level` and `name`. |

Methods: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (each takes a message and an optional data object), `child(bindings, { level? })`, and the read-only `level` property.

#### Secret redaction

Redaction works on **key names**, not on values. Before a line is written, the logger looks at every key in the data object and replaces the value with `[REDACTED]` when the key name matches a pattern.

**How a key is matched**

- A text pattern matches when the key name **contains** it, ignoring letter case. `token` therefore matches `token`, `ACCESS_TOKEN`, and `refreshToken`.
- A RegExp pattern (only in your own `keys`) is tested against the key name exactly as written, so you control case and anchors.
- The default patterns are exported as `DEFAULT_REDACT_KEYS`: `password`, `passwd`, `passphrase`, `token`, `secret`, `authorization`, `bearer`, `api_key`, `apikey`, `api-key`, `private_key`, `privatekey`, `private-key`, `credential`, `cookie`, `session`.
- Keys are checked in the data object, in nested plain objects, in plain objects inside arrays, in the own fields of `Error` objects, and in `child()` bindings.

**What happens in practice** (verified against the current implementation):

| You log                                                                    | Written as                      | Why                                                                 |
| -------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `{ password: 'x' }`, `{ userPassword: 'x' }`                               | `[REDACTED]`                    | Key contains `password`.                                            |
| `{ ACCESS_TOKEN: 'x' }`, `{ 'x-api-key': 'x' }`                            | `[REDACTED]`                    | Matching ignores case; `api-key` is a default pattern.              |
| `{ headers: { Authorization: 'x' } }`                                      | `[REDACTED]` inside `headers`   | Nested plain objects are checked.                                   |
| `{ tokenCount: 3 }`, `{ sessionTimeout: 30 }`, `{ isPasswordValid: true }` | `[REDACTED]`                    | **Over-matching:** the key contains `token`, `session`, `password`. |
| `{ pwd: 'x' }`, `{ auth: 'x' }`, `{ pin: 'x' }`                            | Written as is                   | No default pattern matches. Add them with `redaction.keys`.         |
| `{ note: 'token=x' }`, `{ list: ['x'] }`                                   | Written as is                   | Values and strings in arrays are never inspected.                   |
| `{ url: new URL('https://user:pass@host') }`                               | Full URL, including `pass`      | Class instances (`URL`, your own classes) are not inspected.        |
| `{ account: new Account() }` with a `password` field                       | Field written as is             | Same: only plain objects are inspected.                             |
| `{ body: JSON.stringify({ password: 'x' }) }`                              | Written as is                   | A JSON string is a value, not keys.                                 |
| `{ error }` where the message contains a secret                            | Message and stack written as is | Only the error's field names are checked.                           |
| ``logger.info(`token=${token}`)``                                          | Written as is                   | The message text is never inspected.                                |

To reduce over-matching, replace the defaults with exact patterns, for example `redaction: { keys: [/^password$/i, /^authorization$/i, /token$/i], replaceDefaults: true }`. To catch more, add names to `keys`.

```ts
// examples/redaction.ts
import { Logger } from '@martirosyan0017/qafundix-core';

// Add your own keys to the defaults and change the replacement text.
const logger = new Logger({
  redaction: { keys: ['iban', /^x-.*-id$/i], censor: '***' },
});
logger.info('Transfer', { iban: 'AM00 0000', 'X-Tenant-Id': 't-1', amount: 100 });
// -> "iban":"***","X-Tenant-Id":"***","amount":100

// Use only your own list.
const strictLogger = new Logger({ redaction: { keys: ['pin'], replaceDefaults: true } });
strictLogger.info('Card', { pin: '1234' });
```

> [!IMPORTANT]
> Redaction is a safety net, not a guarantee. Log secrets under clearly named keys of plain objects, never inside message text, URLs, class instances, or serialized strings.

### Errors

Core reports its own failures as `FrameworkError`. Use it in your project too, so every failure carries a searchable code.

```ts
// examples/errors.ts
import { FrameworkError } from '@martirosyan0017/qafundix-core';

function findOrder(orders: ReadonlyArray<{ id: string }>, id: string) {
  const order = orders.find((item) => item.id === id);
  if (!order) {
    throw new FrameworkError(`Order ${id} was not found`, {
      code: 'ORDER_NOT_FOUND',
      metadata: { id, searched: orders.length },
    });
  }
  return order;
}

try {
  findOrder([{ id: 'A-1' }], 'B-2');
} catch (error) {
  if (error instanceof FrameworkError) {
    console.log(error.name); // 'FrameworkError'
    console.log(error.code); // 'ORDER_NOT_FOUND'
    console.log(error.metadata); // { id: 'B-2', searched: 1 }
    console.log(error.cause); // undefined here; set it when you wrap another error
  }
}
```

Error codes thrown by Core:

| Code                            | Thrown by                                    | Meaning                                                                                      |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `CONFIG_VALIDATION_FAILED`      | `ConfigLoader.load`                          | The value does not match the schema.                                                         |
| `INVALID_ENVIRONMENT`           | `EnvironmentManager.name`                    | `NODE_ENV` is not one of the four supported names.                                           |
| `MISSING_ENVIRONMENT_VARIABLE`  | `require`                                    | The variable is missing or blank.                                                            |
| `MISSING_ENVIRONMENT_VARIABLES` | `validateRequired`                           | One or more variables are missing; `metadata.variables` lists them.                          |
| `INVALID_ENVIRONMENT_VARIABLE`  | `getNumber`, `getBoolean`, `getUrl`, `oneOf` | The variable is set but has the wrong format.                                                |
| `RETRY_EXHAUSTED`               | `retry`                                      | Every attempt failed; `cause` is the last error.                                             |
| `RETRY_TIMEOUT`                 | `retry`                                      | `timeoutMs` passed.                                                                          |
| `RETRY_ABORTED`                 | `retry`                                      | `signal` was aborted; `cause` is the abort reason.                                           |
| `RETRY_ATTEMPT_TIMEOUT`         | `retry`                                      | One attempt exceeded `attemptTimeoutMs` (passed to `shouldRetry`, `onRetry`, or as `cause`). |

Wrong arguments to Core functions, such as `attempts: 0` or an invalid `Date`, throw a standard `RangeError` or `TypeError` instead, because they are programming mistakes rather than test failures.

### Retry

`retry(operation, options)` runs an async function until it succeeds or a limit is reached. The function receives the attempt number (starting at 1) and an `AbortSignal`.

```ts
// examples/retry.ts
import { FrameworkError, Logger, retry } from '@martirosyan0017/qafundix-core';

const logger = new Logger({ name: 'retry-example' });

class HttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function getStatus(url: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new HttpError(response.status);
  return response.status;
}

try {
  const status = await retry((attempt, signal) => getStatus('https://example.com', signal), {
    attempts: 4, // first try + up to 3 retries
    delayMs: 250, // wait 250, 500, 1000 ms ...
    backoff: 'exponential',
    maxDelayMs: 2_000, // ... but never more than 2 s
    jitter: true, // randomize waits so parallel workers do not retry together
    shouldRetry: (error) => !(error instanceof HttpError && error.status < 500), // 4xx: stop now
    onRetry: ({ attempt, delayMs, error }) =>
      logger.warn('Retrying', { attempt, delayMs, error: String(error) }),
    attemptTimeoutMs: 5_000, // a single slow attempt fails and is retried
    timeoutMs: 20_000, // the whole run gives up after 20 s
  });
  logger.info('Service is up', { status });
} catch (error) {
  if (error instanceof FrameworkError) {
    logger.error('Service check failed', { code: error.code }); // e.g. RETRY_EXHAUSTED
  } else {
    logger.error('Permanent failure', { error }); // rethrown from shouldRetry === false
  }
}
```

| Option             | Default   | Description                                                                                                  |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------ |
| `attempts`         | required  | Total attempts including the first. Must be a positive integer.                                              |
| `delayMs`          | `0`       | Base wait between attempts.                                                                                  |
| `backoff`          | `'fixed'` | `'fixed'` waits `delayMs` each time. `'exponential'` waits `delayMs × 2^(attempt − 1)`: 1×, 2×, 4×, …        |
| `maxDelayMs`       | no limit  | Upper limit for one wait, applied after backoff.                                                             |
| `jitter`           | `false`   | When `true`, each wait is a random value from 0 up to the computed wait.                                     |
| `shouldRetry`      | retry all | `(error, attempt) => boolean \| Promise<boolean>`. Return `false` to stop and rethrow the original error.    |
| `onRetry`          | none      | `({ attempt, error, delayMs }) => void`. Runs after a retryable failure, before the wait.                    |
| `attemptTimeoutMs` | no limit  | Fails one attempt with `RETRY_ATTEMPT_TIMEOUT` and aborts its signal. Counts as a normal failure.            |
| `timeoutMs`        | no limit  | Limit for the whole run, including waits. Throws `RETRY_TIMEOUT`.                                            |
| `signal`           | none      | Your own `AbortSignal`. Aborting it stops the run, also during an attempt or a wait. Throws `RETRY_ABORTED`. |

How a run ends:

| Situation                     | Result                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| An attempt succeeds           | Its value is returned.                                         |
| All attempts fail             | `FrameworkError` `RETRY_EXHAUSTED`; `cause` is the last error. |
| `shouldRetry` returns `false` | The original error is rethrown unchanged.                      |
| `timeoutMs` passes            | `FrameworkError` `RETRY_TIMEOUT`.                              |
| `signal` aborts               | `FrameworkError` `RETRY_ABORTED`; `cause` is the abort reason. |

> [!NOTE]
> JavaScript cannot force-stop a running function. On a timeout or abort, `retry` stops **waiting** and aborts the signal it passed to your operation. Pass that signal on (for example to `fetch`) so the abandoned work actually stops.

Use `retry` for operations your framework does not already retry, such as API setup calls, test data creation, or polling a backend. Prefer your framework's built-in waiting for UI elements (Playwright `expect`, WebdriverIO `waitUntil`).

### Helpers

```ts
// examples/helpers.ts
import {
  addMilliseconds,
  normalizeWhitespace,
  toCamelCase,
  toIsoString,
} from '@martirosyan0017/qafundix-core';

toCamelCase('Order Total'); // 'orderTotal'
toCamelCase('user_first-name'); // 'userFirstName'
toCamelCase('XMLHttpRequest'); // 'xmlHttpRequest'
normalizeWhitespace('  Total:\n   $10.00  '); // 'Total: $10.00' (useful for UI text assertions)

const start = new Date('2026-01-01T00:00:00.000Z');
toIsoString(start); // '2026-01-01T00:00:00.000Z'
toIsoString(); // current time in ISO format
toIsoString(addMilliseconds(start, 90_000)); // '2026-01-01T00:01:30.000Z' (input date is not changed)
```

| Function                     | Description                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `toCamelCase(value)`         | Splits on spaces, `_`, `-`, and case changes, then joins as lower camel case.          |
| `normalizeWhitespace(value)` | Trims and collapses all whitespace, including tabs and line breaks, to single spaces.  |
| `toIsoString(date?)`         | ISO 8601 UTC string for `date`, or for now. Throws `RangeError` for an invalid date.   |
| `addMilliseconds(date, ms)`  | Returns a new `Date`; negative values subtract. Throws `RangeError` for invalid input. |

## Project structure

```text
qafundix-core/
├── src/
│   ├── config/         ConfigLoader and commonConfigSchema (Zod)
│   ├── environment/    EnvironmentManager: .env loading and typed getters
│   ├── errors/         FrameworkError
│   ├── logger/         Logger and secret redaction (Pino)
│   ├── types/          Shared types: ENVIRONMENTS, LogLevel, RetryOptions, ...
│   ├── utils/          retry, string helpers, date helpers
│   └── index.ts        Public API: everything you can import
├── tests/              Vitest unit tests, one file per module, no network or services
├── examples/           Consumer examples, type-checked and run against the build
├── docs/               GitHub Packages guide
├── .github/
│   ├── workflows/ci.yml       Checks on Ubuntu and Windows, Node.js 22 and 24
│   ├── workflows/release.yml  Manual release to GitHub Packages (dry run by default)
│   └── dependabot.yml         Weekly dependency update pull requests
├── dist/               Build output (created by `npm run build`, not committed)
├── CHANGELOG.md        Release notes
└── package.json        Scripts, dependencies, package metadata
```

Only `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json` are published.

## Development commands

These commands are for working on **Core itself**. Run them in the `qafundix-core` folder after cloning it:

```bash
git clone https://github.com/martirosyan0017/qafundix-core.git
cd qafundix-core
npm ci
```

| Command                      | What it does                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`                     | Installs the exact dependency versions from `package-lock.json`. Run once after cloning.                                             |
| `npm test`                   | Runs all unit tests once.                                                                                                            |
| `npm run test:watch`         | Re-runs tests when files change. Stop with `Ctrl+C`.                                                                                 |
| `npm run test:coverage`      | Runs tests and fails if coverage drops below the thresholds. HTML report: `coverage/index.html`.                                     |
| `npm run typecheck`          | Checks TypeScript types in `src/`, `tests/` and config files without building.                                                       |
| `npm run lint`               | Finds code problems with ESLint.                                                                                                     |
| `npm run format`             | Rewrites files with Prettier formatting.                                                                                             |
| `npm run format:check`       | Reports files that are not formatted, without changing them.                                                                         |
| `npm run build`              | Builds `dist/` (ESM JavaScript, type declarations, source maps).                                                                     |
| `npm run typecheck:examples` | Type-checks `examples/` against the built package. Run `npm run build` first.                                                        |
| `npm run examples`           | Runs both files in `examples/` with `node` (Node.js 22.18+). Run `npm run build` first; `resilient-checks.ts` needs internet access. |
| `npm run validate`           | Runs typecheck, coverage, lint, format check, build, and example typecheck in that order.                                            |
| `npm pack --dry-run`         | Lists the files that would be published, without creating anything.                                                                  |

Coverage thresholds are 95% for statements, lines, and functions, and 90% for branches. Core is shared by every automation repository, so a regression here breaks all of them, and the fast, service-free test suite keeps high coverage cheap.

CI runs the same checks on every pull request and push to `main`, on Ubuntu and Windows with Node.js 22 and 24. `.gitattributes` keeps LF line endings, so results match on every operating system.

## Contributing, issues and versions

### Contributing

1. Create a branch from `main`.
2. Keep Core independent: no test runner, browser, device, or database dependencies, and no project-specific logic.
3. Add or update tests in `tests/` for every change in behaviour.
4. Update this README for new public features, and add an entry to [CHANGELOG.md](CHANGELOG.md).
5. Run `npm run validate` and make sure it passes.
6. Open a pull request that describes the change and any effect on existing users.

### Reporting issues

Open an issue at [github.com/martirosyan0017/qafundix-core/issues](https://github.com/martirosyan0017/qafundix-core/issues) and include:

- Core version (from your `package-lock.json`), Node.js version (`node -v`), and operating system.
- The smallest code that shows the problem.
- The full error, including `code` and `metadata` for a `FrameworkError`.

Remove tokens, passwords, and internal URLs before posting.

### Versions and releases

Core follows [Semantic Versioning](https://semver.org/):

| Change                                   | Version part | Example         |
| ---------------------------------------- | ------------ | --------------- |
| Bug fix, no API change                   | Patch        | `1.1.0 → 1.1.1` |
| New feature, existing code keeps working | Minor        | `1.1.0 → 1.2.0` |
| Removed or changed public API            | Major        | `1.1.0 → 2.0.0` |

Every change is recorded in [CHANGELOG.md](CHANGELOG.md), including behaviour changes that are not breaking.

Releases are manual. The **Release** workflow (`.github/workflows/release.yml`) runs only when started from the repository's **Actions** tab:

1. Update `version` in `package.json` and `CHANGELOG.md`, and merge to `main`.
2. Start **Release**, enter the same version, and leave **publish** unticked. This dry run runs every check and lists the package contents.
3. Run it again from `main` with **publish** ticked. If reviewers are configured for the `github-packages` environment (Settings → Environments), one of them must approve.

The workflow publishes with the repository's built-in `GITHUB_TOKEN` and never changes package visibility. GitHub creates new packages as private; an owner changes visibility in the package settings. See [docs/github-packages.md](docs/github-packages.md) for publishing from a computer and for visibility steps.

To update Core in a test project:

```bash
npm install @martirosyan0017/qafundix-core@latest
```

## License and links

Released under the [MIT License](LICENSE).

| Resource                          | Link                                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                        | [github.com/martirosyan0017/qafundix-core](https://github.com/martirosyan0017/qafundix-core)                                                                |
| Issues                            | [github.com/martirosyan0017/qafundix-core/issues](https://github.com/martirosyan0017/qafundix-core/issues)                                                  |
| Changelog                         | [CHANGELOG.md](CHANGELOG.md)                                                                                                                                |
| GitHub Packages guide (this repo) | [docs/github-packages.md](docs/github-packages.md)                                                                                                          |
| GitHub Packages npm registry      | [docs.github.com: Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) |
| Zod (schemas)                     | [zod.dev](https://zod.dev)                                                                                                                                  |
| Pino (logger)                     | [getpino.io](https://getpino.io)                                                                                                                            |
