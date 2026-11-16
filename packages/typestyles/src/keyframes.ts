import type { CSSProperties } from './types';
import { formatDeclaration } from './serialize-style';
import { insertRule } from '#sheet';

/**
 * A keyframe stop is either 'from', 'to', or a percentage like '50%'.
 */
export type KeyframeStops = Record<string, CSSProperties>;

/**
 * Serialize CSS declarations for a single keyframe stop (no nesting/at-rules).
 */
function serializeDeclarations(properties: CSSProperties): string {
  const declarations: string[] = [];

  for (const [prop, value] of Object.entries(properties)) {
    if (value == null) continue;
    // Keyframe stops only contain plain properties — skip nested selectors/at-rules
    if (prop.startsWith('&') || prop.startsWith('@')) continue;

    // Custom properties are case-sensitive and never take a unit
    if (prop.startsWith('--')) {
      declarations.push(`${prop}: ${value}`);
      continue;
    }

    // Same serialization rules as styles: numbers get px unless the
    // property is unitless (e.g. `opacity`, `lineHeight`), zero stays `0`
    declarations.push(formatDeclaration(prop, value as string | number));
  }

  return declarations.join('; ');
}

/**
 * Create a CSS @keyframes animation and return its name.
 *
 * The returned string is the animation name — use it directly in
 * `animation` shorthand or `animationName`.
 *
 * @example
 * ```ts
 * const fadeIn = keyframes.create('fadeIn', {
 *   from: { opacity: 0 },
 *   to: { opacity: 1 },
 * });
 *
 * const card = recipe({
 *   name: 'card',
 *   styles: { base: { animation: `${fadeIn} 300ms ease` } },
 * });
 * ```
 *
 * @example
 * ```ts
 * const bounce = keyframes.create('bounce', {
 *   '0%': { transform: 'translateY(0)' },
 *   '50%': { transform: 'translateY(-20px)' },
 *   '100%': { transform: 'translateY(0)' },
 * });
 * ```
 */
export function createKeyframes(name: string, stops: KeyframeStops): string {
  const stopsCSS = Object.entries(stops)
    .map(([stop, properties]) => {
      const decls = serializeDeclarations(properties as CSSProperties);
      return `${stop} { ${decls}; }`;
    })
    .join(' ');

  const css = `@keyframes ${name} { ${stopsCSS} }`;
  insertRule(`keyframes:${name}`, css);

  return name;
}
