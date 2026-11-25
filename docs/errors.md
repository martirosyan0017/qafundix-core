# Errors

[← Back to README](../README.md)

Core reports its own failures as `FrameworkError`. Each one has a stable `code` you can check in code, filter in logs, or show in reports. Use the class in your project too, so every failure carries a searchable code.

```ts
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

| Property   | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `code`     | Stable identifier, for example `RETRY_EXHAUSTED`.          |
| `metadata` | Extra data about the failure. Empty object when not given. |
| `cause`    | The original error, when one error is wrapped in another.  |

## Error codes thrown by Core

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

## Related

- [Configuration](configuration.md) and [Retry](retry.md): where these codes come from
- [Troubleshooting](troubleshooting.md): what to do about common codes
