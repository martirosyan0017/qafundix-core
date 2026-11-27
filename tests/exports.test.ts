import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';

// Removing or renaming any of these breaks every project that uses Core.
// Update this list only together with a CHANGELOG entry (and a major version for removals).
describe('public API', () => {
  it('exports exactly the documented runtime values', () => {
    expect(Object.keys(core).sort()).toEqual(
      [
        'ConfigLoader',
        'DEFAULT_REDACT_KEYS',
        'ENVIRONMENTS',
        'ERROR_CODES',
        'EnvironmentManager',
        'FrameworkError',
        'Logger',
        'addMilliseconds',
        'commonConfigSchema',
        'isFrameworkError',
        'normalizeWhitespace',
        'retry',
        'toCamelCase',
        'toIsoString',
      ].sort(),
    );
  });
});
