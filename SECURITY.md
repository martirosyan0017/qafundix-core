# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.1.x   | Yes       |
| < 1.1   | No        |

Security fixes are released for the latest minor version. Versions before 1.1 were developed under the earlier name `qa-automation-core`; please upgrade to `@martirosyan0017/qafundix-core`.

## Reporting a vulnerability

Please **do not** report security problems in public issues, pull requests or discussions.

Report them privately through GitHub:

1. Open the repository's [Security tab](https://github.com/martirosyan0017/qafundix-core/security).
2. Select **Report a vulnerability**.
3. Describe the problem, including:
   - the affected version of `@martirosyan0017/qafundix-core`,
   - the steps or a minimal code example that reproduce it,
   - what an attacker could achieve, as far as you know.

Do not include real credentials, tokens or personal data in the report. Use made-up values instead.

You will receive a reply in the private report. Once a fix is available, it is released as a new version and described in the [changelog](CHANGELOG.md).

## Scope

This policy covers the code in this repository: the `@martirosyan0017/qafundix-core` package, its examples and its workflows. Problems in third-party dependencies should be reported to those projects; if a dependency issue affects Core, a private report here is still welcome.

Examples of relevant issues:

- Secrets written to logs despite matching the documented [redaction rules](docs/logging.md#secret-redaction).
- Secret values included in error messages or error metadata.
- Workflows that could expose repository secrets or publish without approval.
