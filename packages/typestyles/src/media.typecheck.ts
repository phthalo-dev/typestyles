/**
 * Compile-only fixtures for `breakpoint()` / `media()` media-key inference.
 * Bare-length breakpoint values (`80rem`) infer an explicit
 * `(min-width: 80rem)` `@media` key — matching the runtime normalization
 * (issue #320: `breakpoint('xl')` used to infer `@media (80rem)`).
 */
import type { CSSProperties } from './types';
import { createBreakpointMediaFn, createMediaFn, createTypeStyles } from './index';

const bareBreakpoints = { md: '48rem', xl: '80rem' } as const;
const parenthesizedBreakpoints = { md: '(min-width: 768px)' } as const;

const breakpoint = createBreakpointMediaFn(bareBreakpoints);
const parenthesized = createBreakpointMediaFn(parenthesizedBreakpoints);
const media = createMediaFn(bareBreakpoints);

// Bare lengths resolve to an explicit min-width condition.
const bareKey: '@media (min-width: 80rem)' = breakpoint('xl');
void bareKey;

// Parenthesized conditions keep the stored condition as-is.
const parenthesizedKey: '@media (min-width: 768px)' = parenthesized('md');
void parenthesizedKey;

// Paren-less feature conditions wrap without a default feature.
const parenLess = createBreakpointMediaFn({ md: 'min-width: 768px' } as const);
const parenLessKey: '@media (min-width: 768px)' = parenLess('md');
void parenLessKey;

// Feature overrides stay MediaQueryKey.
const overridden: `@media ${string}` = breakpoint('xl', 'max');
void overridden;

// media() infers the same literal key for the nested block.
const mediaBlock: Record<'@media (min-width: 48rem)', CSSProperties> = media('md', {
  display: 'grid',
});
void mediaBlock;

// Instance surface: registered maps resolve through the same normalization.
const ts = createTypeStyles({ scopeId: 'media-typecheck', breakpoints: { xl: '80rem' } });
const instanceKey: `@media ${string}` = ts.breakpoint('xl');
void instanceKey;

// @ts-expect-error — unknown breakpoint names are rejected
breakpoint('lg');
