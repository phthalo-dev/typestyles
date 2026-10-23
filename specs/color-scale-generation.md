# Color Scale Generation — Implementation Spec (P5.1)

Implements `IMPROVEMENTS.md` P5.1 — generate a full functional color palette from
one accent color. Work through the tasks in order — each is a discrete,
independently committable unit.

**Status: shipped.** This is a historical record of the design as implemented,
kept as-is rather than edited after the fact — including its
`examples/design-system` path references, which reflect where the
design-system-layer half (`create-color-theme.ts`, `palette.ts`) lived at
implementation time. That package has since moved to var-ui, a separate
public project, as `@var-ui/core`; the core half
(`packages/typestyles/src/color-scale.ts`, the `typestyles/color-scale`
subpath) is unaffected and lives in this repo permanently.

---

## Guiding Principles

| Principle                                      | Rationale                                                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Core stays vocabulary-agnostic**             | `packages/typestyles` never learns what "background.app" or "danger" mean. It only does color math: parse a color, build a ramp, measure contrast. Semantic mapping is a design-system concern, not a library one. |
| **Semantic mapping lives with its vocabulary** | The step→slot mapping (which ramp step is `background.app`, which hue means "danger") lives in `examples/design-system`, next to `DesignColorValues`, not in core.                                                 |
| **Reuse existing ramp math, don't fork it**    | `palette.ts`'s `buildScale` / `lightnessStops` / `CHROMA_ENVELOPE` become the canonical implementation, moved into core and generalized. `palette.ts` becomes a thin caller, not a duplicate.                      |
| **Zero new dependencies**                      | `packages/typestyles` has no runtime dependencies today (only `csstype` for types). Accent parsing and contrast math are hand-rolled, matching that stance.                                                        |
| **Dev-mode-only validation, never throw**      | Contrast warnings use `console.warn` in `NODE_ENV !== 'production'`, matching the existing convention (`P0.1` scopeId warnings, `createTheme`'s empty-mode-overrides warning). A borderline accent still works.    |
| **One seed, two modes**                        | A single accent produces both light and dark token sets from the same ramps (direction read, not two independent generations) — matches Astryx's single-seed HCT behavior.                                         |
| **Fixed status hues**                          | Danger/success/warning/info hues never shift with the accent. Only their lightness/chroma curve is generated (via `contrast`), anchored to `palette.ts`'s existing `red`/`green`/`amber`/`violet` families.        |

---

## Layering

```
packages/typestyles/src/color-scale.ts        (generic math, no opinions)
  ├─ parseColor(hex) → { l, c, h }
  ├─ generateRamp({ hue, chroma, steps?, lightnessRange? }) → string[]
  └─ contrastRatio(colorA, colorB) → number

examples/design-system/src/tokens/palette.ts   (39 named families — unchanged API)
  └─ now calls generateRamp() instead of local buildScale()

examples/design-system/src/tokens/create-color-theme.ts   (the opinion)
  └─ createColorTheme({ accent, neutralStyle?, contrast? }) → { light, dark }
       - picks which ramp step means which DesignColorValues slot
       - anchors danger/success/warning/info to palette.ts's FAMILY_SPECS
       - runs contrast validation against this design system's specific pairs
```

---

## Core: `packages/typestyles/src/color-scale.ts`

### `parseColor(input: string): { l: number; c: number; h: number }`

- **v1 scope: hex only** (`#rgb`, `#rrggbb`, `#rrggbbaa`). Throws a clear dev-mode
  error (`[typestyles] parseColor: unsupported color format "…". Only hex colors
  are supported today.`) for anything else. Named CSS colors, `rgb()`, `hsl()`,
  `oklch()` input are explicitly out of scope for v1 — note as a follow-up, not a
  blocker.
- Algorithm: hex → sRGB 0–1 floats → linearize (`c <= 0.04045 ? c/12.92 :
  ((c+0.055)/1.055)^2.4`) → linear sRGB → OKLab via the standard two 3×3 matrices
  (Björn Ottosson's published constants — LMS cone response matrix, then the
  nonlinear LMS′ → OKLab matrix) → OKLab → OKLCH polar form (`C = √(a²+b²)`,
  `H = atan2(b,a)` normalized to `[0, 360)`).
- Output units match the existing `palette.ts` convention: `l` as a 0–100
  percentage (not 0–1), `c` and `h` as raw CSS `oklch()` units. This makes the
  output a drop-in match for `generateRamp`'s input and for `color.oklch()`'s
  string builder.

### `generateRamp(opts: { hue: number; chroma: number; steps?: number; lightnessRange?: [number, number] }): string[]`

- Default `steps: 10`, default `lightnessRange: [22, 97]` — identical to
  `palette.ts`'s current hardcoded `hi`/`lo`.
- At `steps === 10` (the default, and the only visually-tuned path): reuse the
  exact existing `CHROMA_ENVELOPE` 10-value array verbatim — it's hand-tuned and
  should not be re-derived.
- At any other `steps` count: fall back to a generic bell-curve chroma envelope
  (documented as untuned / best-effort — `steps: 10` is the recommended,
  battle-tested path).
- Returns `string[]` of `color.oklch()` strings (reusing the existing
  `typestyles/color` builder, not duplicating string formatting), ordered
  lightest → darkest to match `PALETTE_STEPS` (`'1'` = lightest).

### `contrastRatio(colorA: string, colorB: string): number`

- Accepts hex or `oklch()` strings (the two formats this module produces/consumes)
  — not the full CSS color universe, matching `parseColor`'s hex-only scope.
- WCAG relative-luminance formula: convert each input to sRGB (hex directly; for
  `oklch()` strings, reverse `parseColor`'s pipeline — OKLCH → OKLab → linear
  sRGB → gamma-encode), compute relative luminance per the WCAG formula, return
  `(L1 + 0.05) / (L2 + 0.05)` with `L1 ≥ L2`.

---

## `examples/design-system/src/tokens/create-color-theme.ts`

```ts
export type NeutralStyle = 'neutral' | 'cool' | 'warm';
export type ColorContrast = 'standard' | 'high';

export type CreateColorThemeInput = {
  accent: string; // hex
  neutralStyle?: NeutralStyle; // default 'neutral'
  contrast?: ColorContrast; // default 'standard'
};

export type CreateColorThemeResult = {
  light: DesignColorValues;
  dark: DesignColorValues;
};

export function createColorTheme(input: CreateColorThemeInput): CreateColorThemeResult;
```

### Algorithm

1. `accentOklch = parseColor(input.accent)`.
2. Resolve `neutralHue`: `neutral` → `accentOklch.h` (near-zero chroma tint of the
   accent's own hue); `cool` → fixed `250`; `warm` → fixed `70`.
3. Resolve `lightnessRange`: `standard` → `[22, 97]` (current default); `high` →
   `[12, 99]`.
4. `neutralRamp = generateRamp({ hue: neutralHue, chroma: 0.015, lightnessRange })`.
5. `accentRamp = generateRamp({ hue: accentOklch.h, chroma: max(accentOklch.c,
   0.08), lightnessRange })` — clamp chroma to a visible minimum so a
   near-gray input accent doesn't produce a washed-out ramp. **Validate this
   clamp value empirically during implementation** — it's a tuning constant, not
   a locked design decision.
6. Status ramps import hue/chroma directly from `palette.ts`'s `FAMILY_SPECS` (not
   re-hardcoded) so they stay in sync if those tuned values ever change:
   `danger` ← `FAMILY_SPECS.red`, `success` ← `FAMILY_SPECS.green`, `warning` ←
   `FAMILY_SPECS.amber`, `info` ← `FAMILY_SPECS.violet`. Each generated via
   `generateRamp` with the same `lightnessRange`.
7. Map ramps to `DesignColorValues` slots for light mode. Proposed starting
   mapping (tune against the existing hand-authored `default.ts` values for
   visual continuity — treat exact step indices as an implementation task, not a
   locked spec decision):

   | Slot                  | Source                                                                                  |
   | --------------------- | --------------------------------------------------------------------------------------- |
   | `background.app`      | `neutral[1]`                                                                            |
   | `background.surface`  | `neutral[1]`                                                                            |
   | `background.subtle`   | `neutral[2]`                                                                            |
   | `background.elevated` | `neutral[1]`                                                                            |
   | `text.primary`        | `neutral[10]`                                                                           |
   | `text.secondary`      | `neutral[7]`                                                                            |
   | `text.onAccent`       | fixed white; if `contrastRatio(white, accentRamp[7]) < 4.5`, fall back to `neutral[10]` |
   | `text.onDanger`       | fixed white                                                                             |
   | `accent.default`      | `accentRamp[7]`                                                                         |
   | `accent.hover`        | `accentRamp[8]`                                                                         |
   | `border.default`      | `neutral[4]`                                                                            |
   | `border.strong`       | `neutral[6]`                                                                            |
   | `border.focus`        | `accentRamp[5]`                                                                         |
   | `danger.default`      | `dangerRamp[7]`                                                                         |
   | `danger.solid`        | `dangerRamp[8]`                                                                         |
   | `success.default`     | `successRamp[7]`                                                                        |
   | `success.solid`       | `successRamp[8]`                                                                        |
   | `warning.default`     | `warningRamp[7]`                                                                        |
   | `warning.onSolid`     | `neutral[10]`                                                                           |
   | `info.default`        | `infoRamp[7]`                                                                           |
   | `info.onSolid`        | fixed white                                                                             |
   | `overlay.default`     | `contrastRatio`-independent — `color.alpha(neutral[10], 0.55, 'oklch')`                 |

   This is the full `DesignColorValues` shape from `theme-architecture.md` — no
   more, no less. `text.disabled`, `text.placeholder`, `accent.subtle`,
   `danger.subtle`/`border`, etc. are **not** computed here — they're already
   handled by the existing `color-mix()` derived-token machinery in
   `tokens/index.ts` (`colorRefShape`), unchanged.

8. Dark mode reads the **same four ramps** in the mirrored direction (e.g. light
   `background.app = neutral[1]` → dark `background.app = neutral[10]`). Known
   limitation: the discrete 10-step ramp's darkest step won't be as dark as the
   hand-tuned `default.ts` theme's custom near-black values (`theme-architecture.md`
   already flags this gap for the existing palette). Accept this for v1;
   `contrast: 'high'`'s wider floor (12% vs 22%) partially compensates. Revisit
   only if it reads as a visual regression during Task 7's validation.

9. Contrast validation (dev-mode only): after building both `light` and `dark`
   results, run `contrastRatio` on: `text.primary`/`background.app`,
   `text.secondary`/`background.app`, `text.onAccent`/`accent.default`,
   `text.onDanger`/`danger.solid`. `console.warn` once per failing pair per mode
   if below `4.5` (standard) or `7` (high). Never throws.

---

## Testing

- **`color-scale.test.ts`** (core): `parseColor` round-trips known hex fixtures
  (`#ffffff`, `#000000`, `#ff0000`, …) against known OKLCH reference values within
  floating-point tolerance; `generateRamp` — monotonic lightness across steps,
  deterministic output for fixed `(hue, chroma)` inputs (snapshot); `contrastRatio`
  — `black`/`white` → `21`, identical colors → `1`.
- **`create-color-theme.test.ts`** (design-system): snapshot the full `light`/`dark`
  output for 2–3 representative accents (the current default theme's accent, a
  highly saturated pink, a near-gray custom accent to exercise the chroma clamp);
  assert both outputs satisfy the `DesignColorValues` shape; spy on
  `console.warn` and assert it fires for a deliberately low-contrast accent and
  stays silent for a known-good one.

---

## Implementation Tasks

### Task 1 — Extract ramp math into `packages/typestyles/src/color-scale.ts`

Move `buildScale`, `lightnessStops`, and `CHROMA_ENVELOPE` out of
`examples/design-system/src/tokens/palette.ts` into the new core file, generalized
per the `generateRamp` signature above. `palette.ts` calls the new export instead
of its local copy.

**Done when:** `palette.ts`'s `basePaletteTokenValues` output is byte-identical to
before the refactor (diff the generated CSS/values, not just "compiles").

### Task 2 — Add `parseColor`

Hex → OKLCH per the algorithm above.

**Done when:** round-trip tests pass for a handful of known hex/OKLCH pairs;
throws a clear error on non-hex input.

### Task 3 — Add `contrastRatio`

WCAG relative-luminance math, accepting hex or `oklch()` strings.

**Done when:** `contrastRatio('#000', '#fff') === 21` (within tolerance);
`contrastRatio('#888', '#888') === 1`.

### Task 4 — Wire the `typestyles/color-scale` subpath export

Add the entry file (mirror `color-entry.ts`), update `package.json` `exports`
(mirror the `./color` block), update the build config so it's tree-shaken from
the main entry like `typestyles/color` already is.

**Done when:** `import { parseColor, generateRamp, contrastRatio } from
'typestyles/color-scale'` resolves in both ESM and CJS consumers; main entry
bundle size is unaffected (verify against the existing size-budget CI check from
P1.5).

### Task 5 — `createColorTheme` in `examples/design-system`

Implement the algorithm above in `src/tokens/create-color-theme.ts`.

**Done when:** produces a `DesignColorValues`-shaped `{ light, dark }` for a test
accent; contrast warnings fire/stay silent per the test cases in the Testing
section.

### Task 6 — Validate against the existing default theme

Temporarily swap `default.ts` to call `createColorTheme({ accent: '#0064E0' })`
(or the closest equivalent to its current accent) side-by-side with its current
hand-authored values. Visually compare in the docs site theme switcher. Tune the
step-to-slot mapping table and the chroma clamp constant from Task 5 based on
this comparison. **Do not merge this swap** — `default.ts` keeps its
hand-authored values; this task is purely a calibration exercise. Record the
final tuned constants back into the spec/code comments.

**Done when:** side-by-side comparison is documented (screenshot or written
note) and the mapping table / clamp constant are finalized based on it.

### Task 7 — Tests

Write the tests described in the Testing section for both new files.

**Done when:** `pnpm test` passes in both `packages/typestyles` and
`examples/design-system` with the new suites included.

### Task 8 — Docs

Add a "Generating a theme from one accent color" section to the theming docs
page introducing `createColorTheme`, with a live example if `LiveDemo` (P1.6)
is available by then. Mark P5.1 as shipped in `IMPROVEMENTS.md` with the PR link.

**Done when:** docs page builds and renders the new section; `IMPROVEMENTS.md`
checkbox is checked with a PR reference.

---

## Explicitly out of scope for this spec

- Non-hex accent input (named colors, `rgb()`, `hsl()`, `oklch()` passthrough).
- Migrating any _other_ built-in theme (`forest`, `rose`, `amber`, …) to
  `createColorTheme` — Task 6 is calibration-only, not a rollout.
- A `typestyles/color-scale`-level opinionated semantic mapper — that layer
  stays in `examples/design-system` by design (see Layering section).
