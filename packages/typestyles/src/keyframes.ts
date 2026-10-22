import type { CSSProperties } from './types';
import { toKebabCase } from './serialize-style';
import { insertRule } from './sheet';

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

    const kebabProp = toKebabCase(prop);
    const serialized = typeof value === 'number' ? (value === 0 ? '0' : value + 'px') : value;
    declarations.push(`${kebabProp}: ${serialized}`);
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
