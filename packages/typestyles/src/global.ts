import type { FontFaceProps, FontFaceSrc } from './types';
import { insertRule } from '#sheet';

/** Join `src` fragments for CSS `src` and for dedupe keys. */
function normalizeFontFaceSrc(src: FontFaceSrc): string {
  return typeof src === 'string' ? src : src.join(', ');
}

/**
 * Declare a `@font-face` rule to load a custom font.
 *
 * Multiple weights/styles of the same family can be registered by calling
 * this function multiple times with different `src` values — each call is
 * deduplicated by `family +` normalized `src`.
 */
export function globalFontFace(family: string, props: FontFaceProps): void {
  const srcCss = normalizeFontFaceSrc(props.src);
  const decls: string[] = [`font-family: "${family}"`, `src: ${srcCss}`];
  if (props.fontWeight != null) decls.push(`font-weight: ${props.fontWeight}`);
  if (props.fontStyle) decls.push(`font-style: ${props.fontStyle}`);
  if (props.fontDisplay) decls.push(`font-display: ${props.fontDisplay}`);
  if (props.fontStretch) decls.push(`font-stretch: ${props.fontStretch}`);
  if (props.unicodeRange) decls.push(`unicode-range: ${props.unicodeRange}`);
  if (props.sizeAdjust) decls.push(`size-adjust: ${props.sizeAdjust}`);
  if (props.ascentOverride) decls.push(`ascent-override: ${props.ascentOverride}`);
  if (props.descentOverride) decls.push(`descent-override: ${props.descentOverride}`);
  if (props.lineGapOverride) decls.push(`line-gap-override: ${props.lineGapOverride}`);
  const css = `@font-face { ${decls.join('; ')}; }`;
  insertRule(`font-face:${family}:${srcCss}`, css);
}
