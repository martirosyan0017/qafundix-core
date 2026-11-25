# Utilities

[← Back to README](../README.md)

Small string and date helpers for test data, assertions and reports.

```ts
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

## Types

Core also exports TypeScript types for your own helpers: `ENVIRONMENTS`, `EnvironmentName`, `LogLevel`, `CommonConfig`, `ValidatedCommonConfig`, `RetryOptions`, `RetryAttemptInfo`, `NumberVariableOptions`, `LoggerConstructorOptions`, `RedactionOptions`, and `FrameworkErrorOptions`.

```ts
import type { LogLevel, RetryOptions } from '@martirosyan0017/qafundix-core';

const apiRetry: RetryOptions = { attempts: 3, delayMs: 500, backoff: 'exponential' };
const level: LogLevel = 'debug';
```
