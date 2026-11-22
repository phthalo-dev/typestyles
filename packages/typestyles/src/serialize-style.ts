import type { CSSProperties } from './types';
import type { BreakpointMap } from './breakpoints';
import { expandResponsiveInProperties } from './breakpoints';
import type { ColorModeMap } from './color-modes';
import { expandColorModesInProperties } from './color-modes';

/**
 * Convert a camelCase CSS property name to kebab-case.
 * Handles vendor prefixes (ms, webkit, moz) correctly.
 */
export function toKebabCase(prop: string): string {
  // Custom properties are case-sensitive; emit verbatim.
  if (prop.startsWith('--')) return prop;
  // Handle ms- prefix specially (no leading dash in camelCase)
  if (prop.startsWith('ms')) {
    return '-' + prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  }
  return prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/**
 * Serialize a single CSS value. Numbers are treated as px for most properties.
 */
export function serializeCSSValue(prop: string, value: string | number): string {
  if (typeof value === 'number') {
    if (value === 0) return '0';
    // Custom properties have no known type; never append a unit.
    if (prop.startsWith('--')) return String(value);
    // Unitless properties that shouldn't get 'px'
    if (isUnitlessProperty(prop)) return String(value);
    return value + 'px';
  }
  return value;
}

/** One `prop: value` declaration string (no trailing semicolon). */
export function formatDeclaration(prop: string, value: string | number): string {
  return `${toKebabCase(prop)}: ${serializeCSSValue(prop, value)}`;
}

const unitlessProperties = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'fontSizeAdjust',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'initialLetter',
  'lineClamp',
  'lineHeight',
  'maskBorderOutset',
  'maskBorderSlice',
  'maskBorderWidth',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
]);

const VENDOR_PREFIX_RE = /^(Webkit|Moz|ms|O)([A-Z])(.*)$/;

/**
 * Whether a camelCase property takes unitless numbers. Vendor-prefixed
 * properties (e.g. `WebkitLineClamp`) defer to their unprefixed equivalent.
 */
function isUnitlessProperty(prop: string): boolean {
  if (unitlessProperties.has(prop)) return true;
  const match = VENDOR_PREFIX_RE.exec(prop);
  if (match) {
    return unitlessProperties.has(match[2].toLowerCase() + match[3]);
  }
  return false;
}

/**
 * Represents a generated CSS rule.
 */
export interface CSSRule {
  /** Unique key for deduplication */
  key: string;
  /** The CSS rule string */
  css: string;
}

export type SerializeStyleOptions = {
  breakpoints?: BreakpointMap;
  /** Registered color mode keys (`light`, `dark`, …) for `{ light, dark }` property values. */
  colorModes?: ColorModeMap;
};

/**
 * Serialize a style definition object into CSS rule(s) for a given selector.
 */
export function serializeStyle(
  selector: string,
  properties: CSSProperties,
  options?: SerializeStyleOptions,
): CSSRule[] {
  const breakpoints = options?.breakpoints;
  const colorModes = options?.colorModes;
  const withModes = expandColorModesInProperties(properties, colorModes, breakpoints);
  const expanded = expandResponsiveInProperties(withModes, breakpoints);
  return serializeStyleExpanded(selector, expanded);
}

function serializeStyleExpanded(selector: string, properties: CSSProperties): CSSRule[] {
  const rules: CSSRule[] = [];
  const declarations: string[] = [];

  for (const [prop, value] of Object.entries(properties)) {
    if (value == null) continue;

    if (prop === 'conditions') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[typestyles] "conditions" is reserved for `override()` style blocks — omit it from component recipes and plain style objects.',
        );
      }
      continue;
    }

    const nestedSelector = resolveNestedSelector(selector, prop);
    if (nestedSelector) {
      rules.push(...serializeStyleExpanded(nestedSelector, value as CSSProperties));
    } else if (prop.startsWith('@')) {
      // At-rule: wrap the serialized content in the at-rule
      const innerRules = serializeStyleExpanded(selector, value as CSSProperties);
      for (const inner of innerRules) {
        rules.push({
          key: `${prop}:${inner.key}`,
          css: `${prop} { ${inner.css} }`,
        });
      }
    } else {
      // Regular CSS property
      declarations.push(formatDeclaration(prop, value as string | number));
    }
  }

  // Add the base rule with all plain declarations
  if (declarations.length > 0) {
    rules.unshift({
      key: selector,
      css: `${selector} { ${declarations.join('; ')}; }`,
    });
  }

  return rules;
}

export function resolveNestedSelector(parentSelector: string, key: string): string | null {
  // Parent placeholder anywhere in the key (e.g. `html[data-mode="dark"] &`, `.wrap &`).
  if (key.includes('&')) {
    // CSS nesting: `&` stands for the whole parent list, so a list parent
    // (`.a &, &.b`) must be substituted item by item — not pasted in whole, which
    // would leave all but the last item without the nested part.
    const parents = splitSelectorList(parentSelector);
    if (parents.length > 1) {
      const keys = splitSelectorList(key);
      return parents.flatMap((parent) => keys.map((part) => part.replace(/&/g, parent))).join(', ');
    }
    return key.replace(/&/g, parentSelector);
  }

  // Support attribute selectors without requiring "&", including selector lists:
  // '[data-state="open"], [aria-expanded="true"]'
  if (key.startsWith('[')) {
    const parts = splitSelectorList(key);
    return parts.map((part) => `${parentSelector}${part.trimStart()}`).join(', ');
  }

  return null;
}

function splitSelectorList(selector: string): string[] {
  const result: string[] = [];
  let current = '';
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    const prev = i > 0 ? selector[i - 1] : '';

    if (quote) {
      current += char;
      if (char === quote && prev !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === ',' && bracketDepth === 0 && parenDepth === 0) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}
