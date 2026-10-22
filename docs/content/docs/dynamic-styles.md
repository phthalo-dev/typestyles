---
title: Dynamic styling
description: Per-instance values with createVar and assignVars — the TypeStyles way to handle dynamic CSS
---

Some style values change per instance: a progress bar's width, a chart segment's color, a user's chosen accent. TypeStyles styles are defined at module level and extracted at build time, so you cannot put runtime props directly into style objects. Instead, wire dynamic values through **CSS custom properties** with `createVar()` and `assignVars()`.

This keeps your extracted CSS static while still letting each element pick its own value at runtime — without abandoning your component's type-safe style definitions.

## Basic pattern

Define a var reference in your styles, then set its value on each instance:

```ts
import { variant } from 'typestyles';
import { createTypeStyles, createVar, assignVars } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const progressFill = createVar('progressFill');

const progress = recipe({
  name: 'progress',
  variants: { bar: variant.boolean({ default: false }) },
  styles: {
    base: {
      height: '8px',
      borderRadius: '4px',
      background: '#e5e7eb',
    },
    variants: {
      bar: {
        true: {
          height: '100%',
          borderRadius: 'inherit',
          background: '#0066ff',
          width: progressFill,
        },
        false: {},
      },
    },
  },
});

function ProgressBar({ value }: { value: number }) {
  return (
    <div className={progress('base')}>
      <div
        className={progress('bar')}
        style={assignVars({ [progressFill]: `${value}%` })}
      />
    </div>
  );
}
```

In DevTools you'll see `--ts-progressfill: 42%` on the element — readable, not an anonymous `--ts-1`.

## Debug names

Pass a name to `createVar()` for inspectable custom property names:

```ts
const cardBg = createVar('cardBg'); // → var(--ts-cardbg)
const cardBorder = createVar('cardBorder', 'transparent'); // → var(--ts-cardborder, transparent)
```

Names are sanitized to valid CSS identifiers (lowercase, hyphens). Calling `createVar('cardBg')` twice produces `--ts-cardbg` and `--ts-cardbg-2` so refs stay unique.

Omit the name when you don't need DevTools labels — anonymous vars use numeric ids (`--ts-1`, `--ts-2`, …).

## assignVars

`assignVars()` converts var refs into a plain object for inline `style` props:

```ts
assignVars({ [cardBg]: '#ff0099', [cardBorder]: '#ccc' });
// → { '--ts-cardbg': '#ff0099', '--ts-cardborder': '#ccc' }
```

It skips `null` and `undefined` values, so you can conditionally omit vars. The return type is `Record<string, string>` — safe to spread into React, Vue, Svelte, or plain DOM `element.style`.

Works with fallbacks too: `assignVars` extracts the property name from `var(--ts-cardbg, #fff)`.

## When to use this vs alternatives

| Approach                                 | Best for                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| **`createVar` + `assignVars`**           | Dynamic _values_ on otherwise static styles (widths, colors, transforms)             |
| **Variants**                             | Discrete, known-ahead-of-time options (`size: 'sm' \| 'lg'`)                         |
| **Tokens / themes**                      | Design-system values shared across the app                                           |
| **Component `ctx.var()` / `ctx.vars()`** | Internal vars scoped to one component namespace (see [Components](/docs/components)) |
| **Raw inline styles**                    | One-off properties with no shared style definition                                   |

Prefer `createVar` over raw inline styles when the property is part of a component's style definition. The CSS rule stays in your extracted stylesheet; only the variable value changes per instance.

## Multiple dynamic properties

```ts
const barColor = createVar('barColor');
const barWidth = createVar('barWidth');

const chartBar = recipe({
  name: 'chart-bar',
  styles: {
    base: {
      background: barColor,
      width: barWidth,
      height: '100%',
      borderRadius: '2px',
    },
  },
});

function Bar({ color, width }: { color: string; width: string }) {
  return (
    <div
      className={chartBar('base')}
      style={assignVars({ [barColor]: color, [barWidth]: width })}
    />
  );
}
```

## Fallback values

Provide a CSS fallback as the second argument — useful when a var might not be set:

```ts
const accent = createVar('accent', '#0066ff');

const badge = recipe({ name: 'badge', styles: { base: {
    color: accent,
    fontWeight: 600,
  } } });

// Without assignVars, the fallback '#0066ff' applies
<div className={badge('base')} />

// Per-instance override
<div
  className={badge('base')}
  style={assignVars({ [accent]: userColor })}
/>
```

## Zero-runtime extraction

Dynamic vars work in zero-runtime mode. The extracted CSS contains rules like `width: var(--ts-progressfill)` — only the custom property _values_ are set at runtime via inline styles. Your build output stays deterministic; unreachable styles are still caught by [verifyTypestylesBuild](/docs/zero-runtime#verify-extraction-in-ci).

## Related

- [Components](/docs/components) — scoped internal vars via `ctx.var()` and `ctx.vars()`
- [Tokens](/docs/tokens) — design-system custom properties
- [Performance](/docs/performance) — why module-level styles + vars beat dynamic style objects
- [Best practices](/docs/best-practices) — naming and organization patterns
