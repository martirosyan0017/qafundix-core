# GitHub Packages release guide

The package is scoped to `@martirosyan0017` and published to `https://npm.pkg.github.com`.

## Create a token

GitHub Packages npm operations use a **personal access token (classic)**. Create one in GitHub Settings under Developer settings, then Personal access tokens, then Tokens (classic). Select only the scopes required for the task:

- `read:packages` to install or inspect a package.
- `write:packages` to publish a package. Include `read:packages` when you also need to inspect or install packages.

Use an account that has the corresponding package permissions. If GitHub prompts for organization SSO authorization, authorize the token there. Never paste the token into chat, project files, command history, or a committed `.npmrc`.

## Authenticate locally

Enter the token without displaying it in the current PowerShell session:

```powershell
$secureToken = Read-Host 'GitHub token' -AsSecureString
$env:NODE_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', $secureToken).Password
```

Or enter it without echoing it in bash:

```bash
read -rsp 'GitHub token: ' NODE_AUTH_TOKEN
export NODE_AUTH_TOKEN
printf '\n'
```

The checked-in `.npmrc` reads that variable. For a read-only install:

```bash
npm install @martirosyan0017/qafundix-core
```

For a manual publish from your computer after the repository is pushed and the package has been reviewed:

```bash
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
npm pack --dry-run
npm publish
```

When finished, clear `NODE_AUTH_TOKEN` from the shell session:

```powershell
Remove-Item Env:NODE_AUTH_TOKEN
```

```bash
unset NODE_AUTH_TOKEN
```

`publishConfig.registry` routes publishing to GitHub Packages. Do not add an npmjs access flag; GitHub controls package visibility separately.

## Set package visibility to Public

GitHub creates npm registry packages as private by default. After the first successful publish:

1. Open the package page under the `martirosyan0017` GitHub account.
2. Open **Package settings**.
3. In **Danger Zone**, choose **Change visibility**.
4. Select **Public** and confirm the change.

The repository being public does not itself make the package public. A public package can be discovered and downloaded by anyone. Confirm the tarball contains only intended release files before making this change.

## Verify the published package

Keep `NODE_AUTH_TOKEN` set, then inspect package metadata and install the release:

```bash
npm view @martirosyan0017/qafundix-core@<version> --json
npm install @martirosyan0017/qafundix-core@<version>
```

Confirm the package page shows the released version and Public visibility. Test a consumer import from a small Node.js 22+ ESM project. GitHub Packages requires authentication for npm operations, including public package downloads.

## GitHub Actions

The CI workflow runs validation only and has no publish step or publishing token.

The separate **Release** workflow (`.github/workflows/release.yml`) is manual. It runs only when started from the Actions tab and, by default, is a dry run that validates the package and lists the tarball contents. It publishes only when the **publish** input is ticked, the run is on `main`, and the `github-packages` environment approves it. It uses the workflow `GITHUB_TOKEN` with `contents: read` and `packages: write`, so no personal token is stored. Before the first real release, add required reviewers to the `github-packages` environment under Settings > Environments. The workflow does not change package visibility.
