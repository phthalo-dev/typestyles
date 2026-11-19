import type { ThemeConfig, ThemeOverrideContext, Theme } from './types';
import type { ComponentRegistryApi } from './component-registry';
import type { OverrideFn } from './override';
import type { ThemeTokenContext } from './theme-token-context';
import type { ThemeComponentPatch } from './theme-types';

export type { ThemeOverrideContext };

export type ThemeComponentOverrides = NonNullable<ThemeConfig['components']>;

export type ThemeComponentsBridge = ComponentRegistryApi & {
  readonly override: OverrideFn;
};

export function applyThemeComponentOverrides(
  surface: Theme,
  components: ThemeComponentOverrides | undefined,
  tokens: ThemeTokenContext,
  styles: ThemeComponentsBridge,
): void {
  if (!components) return;

  const themeable = styles.getThemeableComponents();

  for (const [namespace, entry] of Object.entries(components)) {
    const handle = styles.getComponent(namespace);
    if (!handle) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `[typestyles] createTheme: unknown component namespace "${namespace}". ` +
            `Register the recipe with recipe({ name: '${namespace}', … }) on the same createTypeStyles instance.`,
        );
      }
      continue;
    }
    if (!themeable.has(namespace)) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `[typestyles] createTheme: component "${namespace}" is not themeable ` +
            `(recipe({ name: '${namespace}', themeable: false })).`,
        );
      }
      continue;
    }

    const patch = entry as ThemeComponentPatch;
    const styleValue =
      typeof patch.styles === 'function'
        ? (patch.styles as unknown as (ctx: { vars: object; tokens: ThemeTokenContext }) => object)(
            {
              vars: (handle as { vars?: object }).vars ?? {},
              tokens,
            },
          )
        : (patch.styles ?? {});
    styles.override({
      recipe: handle,
      selectorPrefix: `.${surface.className}`,
      vars: patch.vars,
      styles: styleValue,
    } as Parameters<OverrideFn>[0]);
  }
}
