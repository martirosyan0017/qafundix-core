import { afterEach, describe, expect, it, vi } from 'vitest';
import { addMilliseconds, toIsoString } from '../src/index.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('toIsoString', () => {
  it('formats a given date in UTC', () => {
    expect(toIsoString(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01T00:00:00.000Z');
  });

  it('uses the current time by default', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T07:08:09.010Z'));
    expect(toIsoString()).toBe('2026-05-06T07:08:09.010Z');
  });

  it('rejects invalid dates', () => {
    expect(() => toIsoString(new Date('invalid'))).toThrow(RangeError);
  });
});

describe('addMilliseconds', () => {
  const date = new Date('2026-01-01T00:00:00.000Z');

  it('adds and subtracts without mutating the input', () => {
    expect(addMilliseconds(date, 1000).toISOString()).toBe('2026-01-01T00:00:01.000Z');
    expect(addMilliseconds(date, -1).toISOString()).toBe('2025-12-31T23:59:59.999Z');
    expect(date.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects invalid dates and non-finite amounts', () => {
    expect(() => addMilliseconds(new Date('invalid'), 1)).toThrow(RangeError);
    expect(() => addMilliseconds(date, Number.NaN)).toThrow(RangeError);
    expect(() => addMilliseconds(date, Infinity)).toThrow(RangeError);
  });
});
