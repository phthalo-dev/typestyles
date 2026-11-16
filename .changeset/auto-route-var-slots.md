---
'typestyles': minor
---

Auto-route recipe var defaults to slots that read them (#322). Recipe `vars` defaults were declared on the var host slot plus any slots listed in the var's explicit `slots` option. A slot rendered **outside** the host element (a portaled popover, a flyout) that read a var without being listed silently computed `var(--x)` to the `@property` `initial-value` instead — for `atProperty.color` that is `transparent`, so the element disappeared.

- While building a recipe, TypeStyles now records which slots read `vars.x.var` in their styles — in `base` blocks, variant options, and compound variants — and emits the var's default on each of those slots too, so the default reaches every slot whose styles use it no matter where the slot renders.
- Theme (`override()`) values for the var are emitted on those slots as well, so portal-rendered slots pick up theme overrides without relying on inheritance.
- The explicit `slots` option is now an override for slots that must carry a var without reading it in the recipe styles (for example a slot styled only through a consumer override); reads and explicit `slots` lists union, and defaults are never emitted twice on the same slot.
- Dimensioned / flat recipes are unaffected (there is only the host slot).
