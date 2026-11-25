# Logging

[← Back to README](../README.md)

`Logger` writes one JSON object per line to standard output, using [Pino](https://getpino.io). JSON lines are easy to search in CI logs and to send to log tools. The default level is `info`.

## Write log lines

```ts
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

Output line for the warning above (`time`, `pid`, and `hostname` vary):

```text
{"level":40,"time":1767225600000,"pid":1234,"hostname":"runner","name":"checkout-suite","testName":"pays with saved card","worker":2,"durationMs":2150,"msg":"Slow response"}
```

Methods: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (each takes a message and an optional data object), `child(bindings, { level? })`, and the read-only `level` property.

## Options

| Option        | Type                                                                       | Default                    | Purpose                                                                        |
| ------------- | -------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| `level`       | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal' \| 'silent'` | `'info'`                   | Lowest level that is written. `silent` writes nothing.                         |
| `name`        | `string`                                                                   | none                       | Added to every line as `name`.                                                 |
| `redaction`   | `{ keys?, replaceDefaults?, censor? }`                                     | default keys, `[REDACTED]` | Which keys to hide and the replacement text. See below.                        |
| `destination` | Pino destination stream                                                    | standard output            | Where lines are written, for example a file stream or a test capture.          |
| `pinoOptions` | Pino `LoggerOptions`                                                       | none                       | Advanced Pino settings. Applied last, so they can override `level` and `name`. |

## Secret redaction

Redaction works on **key names**, not on values. Before a line is written, the logger looks at every key in the data object and replaces the value with `[REDACTED]` when the key name matches a pattern.

### How a key is matched

- A text pattern matches when the key name **contains** it, ignoring letter case. `token` therefore matches `token`, `ACCESS_TOKEN`, and `refreshToken`.
- A RegExp pattern (only in your own `keys`) is tested against the key name exactly as written, so you control case and anchors.
- The default patterns are exported as `DEFAULT_REDACT_KEYS`: `password`, `passwd`, `passphrase`, `token`, `secret`, `authorization`, `bearer`, `api_key`, `apikey`, `api-key`, `private_key`, `privatekey`, `private-key`, `credential`, `cookie`, `session`.
- Keys are checked in the data object, in nested plain objects, in plain objects inside arrays, in the own fields of `Error` objects, and in `child()` bindings.

### What happens in practice

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

### Customize the rules

```ts
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

To reduce over-matching, replace the defaults with exact patterns, for example `redaction: { keys: [/^password$/i, /^authorization$/i, /token$/i], replaceDefaults: true }`. Child loggers always use their parent's rules.

> [!IMPORTANT]
> Redaction is a safety net, not a guarantee. Log secrets under clearly named keys of plain objects, never inside message text, URLs, class instances, or serialized strings.

## Related

- [Errors](errors.md): what an error object looks like in a log line
- [Retry](retry.md): logging each retry with `onRetry`
