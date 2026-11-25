# Contributing to QAFundix Core

This page is for working on Core itself. To use Core in a test project, start with the [README](README.md).

## Set up

```bash
git clone https://github.com/martirosyan0017/qafundix-core.git
cd qafundix-core
npm ci
```

You need Node.js 22.12 or later (the test tooling requires it) and npm.

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
│   └── index.ts        Public API: everything consumers can import
├── tests/              Vitest unit tests, one file per module, no network or services
├── examples/           Consumer examples, type-checked and run against the build
├── docs/               User documentation and setup guides
├── .github/
│   ├── workflows/ci.yml       Checks on Ubuntu and Windows, Node.js 22 and 24
│   ├── workflows/release.yml  Manual release to GitHub Packages (dry run by default)
│   └── dependabot.yml         Weekly dependency update pull requests
├── dist/               Build output (created by `npm run build`, not committed)
├── CHANGELOG.md        Release notes
└── package.json        Scripts, dependencies, package metadata
```

Only `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json` are published.

## Commands

| Command                      | What it does                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
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

Coverage thresholds are 95% for statements, lines, and functions, and 90% for branches. Core is shared by every automation project, so a regression here breaks all of them, and the fast, service-free test suite keeps high coverage cheap.

CI runs the same checks on every pull request and push to `main`, on Ubuntu and Windows with Node.js 22 and 24. `.gitattributes` keeps LF line endings, so results match on every operating system.

## Making a change

1. Create a branch from `main`.
2. Keep Core independent: no test runner, browser, device, or database dependencies, and no project- or domain-specific logic.
3. Add or update tests in `tests/` for every change in behaviour.
4. Update the documentation in `docs/` for new public features, and add an entry to [CHANGELOG.md](CHANGELOG.md).
5. Run `npm run validate` and make sure it passes.
6. Open a pull request that describes the change and any effect on existing users.

## Reporting issues

Open an issue at [github.com/martirosyan0017/qafundix-core/issues](https://github.com/martirosyan0017/qafundix-core/issues) and include:

- Core version (from your `package-lock.json`), Node.js version (`node -v`), and operating system.
- The smallest code that shows the problem.
- The full error, including `code` and `metadata` for a `FrameworkError`.

Remove tokens, passwords, and internal URLs before posting.

## Versions and releases

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
