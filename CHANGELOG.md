# Changelog

All notable changes to this package are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package uses [Semantic Versioning](https://semver.org/).

## Unreleased

All changes are backward compatible.

### Added

- `ERROR_CODES` (every code Core throws), the `CoreErrorCode` type, and `isFrameworkError(error, code?)`, a type guard for checking errors without comparing strings by hand.
- `npm run test:package`: installs the packed package into a fresh project and checks ESM `import`, CommonJS `require()` and TypeScript types. CI runs it on every operating system and Node.js version.
- A test that fails when a public export is removed or renamed.
- `package.json`: `"sideEffects": false` and an export for `./package.json`.

### Changed

- GitHub Actions are pinned to full commit SHAs (with version comments that Dependabot keeps current), checkouts no longer keep the token in the workspace (`persist-credentials: false`), and jobs have time limits.
- Core's own source uses `ERROR_CODES` instead of string literals. The thrown codes are unchanged.

## 1.1.0 - 2026-11-25

The project is renamed to **QAFundix**. The package is now `@martirosyan0017/qafundix-core` and the repository is `martirosyan0017/qafundix-core`; earlier versions were developed as `@martirosyan0017/qa-automation-core`. To upgrade, install the new package and replace the old package name in your imports. The API is unchanged.

All additions are backward compatible. Existing code keeps compiling and running without changes.

### Added

- `retry` options:
  - `shouldRetry(error, attempt)` stops early on permanent errors and rethrows the original error.
  - `onRetry({ attempt, error, delayMs })` runs before each wait.
  - `maxDelayMs` caps a single wait; `jitter` randomizes waits between 0 and the computed delay.
  - `signal` cancels the run (also during an attempt or a wait) with `RETRY_ABORTED`.
  - `timeoutMs` limits the whole run with `RETRY_TIMEOUT`.
  - `attemptTimeoutMs` fails a slow attempt with `RETRY_ATTEMPT_TIMEOUT`; it counts as a normal failure and can be retried.
  - The operation receives an `AbortSignal` as its second argument.
- `EnvironmentManager` typed getters: `getNumber` (with `integer`, `min`, `max`), `getBoolean`, `getUrl`, and `oneOf`. Invalid values throw `INVALID_ENVIRONMENT_VARIABLE` without echoing the value.
- `Logger`:
  - `child(bindings, { level })` for per-test or per-worker fields.
  - `trace` and `fatal` methods.
  - `redaction` option: extra string or RegExp keys, `replaceDefaults`, and a custom `censor`.
  - `DEFAULT_REDACT_KEYS` export.
- Exported types: `RetryAttemptInfo`, `NumberVariableOptions`, `LoggerConstructorOptions`, `RedactionOptions`.
- The published package now also contains `CHANGELOG.md`.
- Unit tests are split into one file per module. Coverage reporting with thresholds, `npm run validate`, and type-checked examples.
- `npm run examples` runs the examples with Node.js type stripping; CI runs it too. The examples typecheck uses `erasableSyntaxOnly`, so syntax that `node file.ts` cannot run is reported.
- CommonJS projects can load Core with `require()` on Node.js 22.12 or later: the package `exports` now has a `default` condition next to `import`. ES module users see no difference.
- Documentation: a short README landing page; step-by-step setup guides in `docs/` for mobile (Appium + WebdriverIO), web (Playwright), API (Playwright API) and database (PostgreSQL) projects; separate pages for getting started, configuration, logging (including exactly how redaction matches keys), retry, errors, utilities and troubleshooting; and `CONTRIBUTING.md` for development and releases. README links are absolute, so they also work on the package page.
- `SECURITY.md` with instructions for private vulnerability reporting.
- `package.json` lists the author and search keywords.
- The CI and release workflows use `actions/checkout`, `actions/setup-node` and `actions/upload-artifact` v7.
- CI on Linux and Windows with Node.js 22 and 24, Dependabot, and a manual GitHub Packages release workflow (dry run by default).
- `.gitattributes` so all text files use LF line endings on every operating system.

### Changed

Behaviour that existing users may notice:

- **More keys are redacted by default.** In addition to password, token, secret, authorization, API key and credential, the logger now also redacts keys containing `passphrase`, `bearer`, `private_key`/`privateKey`, `cookie` and `session`. Logs that printed fields such as `sessionId` will now show `[REDACTED]`. Use `redaction: { keys, replaceDefaults: true }` to choose your own list.
- **`.env` is loaded once per process,** the first time an `EnvironmentManager` is created with the real `process.env`. Before, it was loaded on every creation. Because dotenv never overrides variables that are already set, the resulting values are the same. dotenv's startup message is also turned off.
- **`retry` range-error messages include the received value,** for example `attempts must be a positive integer, received 0`. The error type (`RangeError`) and the original wording at the start of the message are unchanged.
- **`ConfigLoader` passes Zod's own `ZodError` as `cause`** instead of building a copy of it. It is still a `ZodError` with the same issues.

### Fixed

- `toCamelCase` kept only separator boundaries and lowercased everything else, so `fooBar` became `foobar` and `XMLHttpRequest` became `xmlhttprequest`. It now keeps case boundaries: `fooBar` → `fooBar`, `XMLHttpRequest` → `xmlHttpRequest`. Inputs that use spaces, `_` or `-` give the same result as before.
- `npm run format:check` failed on Windows because Git converted files to CRLF line endings.

## 1.0.0 - 2026-11-25

### Added

- Environment access, common configuration schema and loader.
- Pino logger with secret redaction, framework error, retry helper, date and string helpers.
- TypeScript ESM build, unit tests, and CI validation workflow.
