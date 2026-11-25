import { describe, expect, it } from 'vitest';
import { normalizeWhitespace, toCamelCase } from '../src/index.js';

describe('toCamelCase', () => {
  it('keeps the v1.0 results for separated words', () => {
    expect(toCamelCase(' API-test NAME ')).toBe('apiTestName');
    expect(toCamelCase('user_first_name')).toBe('userFirstName');
    expect(toCamelCase('Hello World')).toBe('helloWorld');
    expect(toCamelCase('ALL CAPS')).toBe('allCaps');
  });

  // Regression: v1.0 lowercased whole words, so `fooBar` became `foobar`.
  it('keeps word boundaries inside camelCase and PascalCase input', () => {
    expect(toCamelCase('fooBar')).toBe('fooBar');
    expect(toCamelCase('FooBar')).toBe('fooBar');
    expect(toCamelCase('userId-value')).toBe('userIdValue');
    expect(toCamelCase('XMLHttpRequest')).toBe('xmlHttpRequest');
    expect(toCamelCase('getHTTPResponse')).toBe('getHttpResponse');
    expect(toCamelCase('test1Name')).toBe('test1Name');
  });

  it('is idempotent', () => {
    for (const input of ['fooBar', 'api-test NAME', 'XMLHttpRequest'])
      expect(toCamelCase(toCamelCase(input))).toBe(toCamelCase(input));
  });

  it('handles empty input, repeated separators and digits', () => {
    expect(toCamelCase('')).toBe('');
    expect(toCamelCase('  -_  ')).toBe('');
    expect(toCamelCase('a--b__c  d')).toBe('aBCD');
    expect(toCamelCase('version 2 beta')).toBe('version2Beta');
  });

  it('works with non-Latin letters', () => {
    expect(toCamelCase('привет мир')).toBe('приветМир');
    expect(toCamelCase('приветМир')).toBe('приветМир');
    expect(toCamelCase('բարև աշխարհ')).toBe('բարևԱշխարհ');
  });
});

describe('normalizeWhitespace', () => {
  it('trims and collapses spaces, tabs and Windows/Unix newlines', () => {
    expect(normalizeWhitespace('  hello\n  world  ')).toBe('hello world');
    expect(normalizeWhitespace('a\r\n\tb')).toBe('a b');
    expect(normalizeWhitespace('   ')).toBe('');
  });
});
