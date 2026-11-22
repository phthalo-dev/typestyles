/**
 * Sanitize a value for use in a class name.
 * Replaces spaces with hyphens and removes special characters.
 */
export function sanitizeValue(value: string | number): string {
  return String(value)
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '');
}

/**
 * Convert camelCase to kebab-case for CSS property names.
 */
export function toKebabCase(str: string): string {
  // Custom properties are case-sensitive; keep them verbatim.
  if (str.startsWith('--')) return str;
  // Handle vendor prefixes (ms, webkit, moz)
  if (str.startsWith('ms')) {
    return '-' + str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  }
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/**
 * Check if a value is a conditional object (has condition keys).
 */
export function isConditionalValue(
  value: unknown,
  conditionKeys: Set<string>,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  // Check if any key is a known condition
  for (const key in value) {
    if (conditionKeys.has(key)) {
      return true;
    }
  }

  return false;
}
