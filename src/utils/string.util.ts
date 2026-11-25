/**
 * Splits a separator-free part at case changes, so `fooBar` becomes `foo Bar`
 * and `XMLHttpRequest` becomes `XML Http Request`. Works for any script with case (Latin, Cyrillic).
 */
function splitCaseBoundaries(part: string): string[] {
  return part
    .replace(/([\p{Ll}\p{Nd}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(' ');
}

/**
 * Converts whitespace, `_`, `-` and case changes to lower camel case.
 * Existing camelCase or PascalCase words keep their word boundaries: `fooBar` stays `fooBar`.
 */
export function toCamelCase(value: string): string {
  return value
    .trim()
    .split(/[\s_-]+/)
    .flatMap(splitCaseBoundaries)
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : lower[0]!.toUpperCase() + lower.slice(1);
    })
    .join('');
}

/** Trims a value and collapses internal whitespace to one space. */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
