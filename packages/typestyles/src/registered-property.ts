import type {
  CSSVarRef,
  PropertyOptions,
  PropertyRegistration,
  RegisteredPropertyRef,
  StylesPropertyFn,
} from './types';
import { sanitizeClassSegment, scopedTokenNamespace, type ClassNamingConfig } from './class-naming';
import { syntaxPlaceholderFor } from './at-property';
import { registerCustomProperty } from './custom-properties';
import { insertRule } from '#sheet';

const propertyRegistrations = new Map<
  string,
  { syntax: string; inherits: boolean; initial?: string | number }
>();

export function propertyRegistrationsEqual(
  a: { syntax: string; inherits?: boolean; initial?: string | number },
  b: { syntax: string; inherits?: boolean; initial?: string | number },
): boolean {
  return (
    a.syntax === b.syntax &&
    (a.inherits ?? false) === (b.inherits ?? false) &&
    (a.initial ?? undefined) === (b.initial ?? undefined)
  );
}

/** @internal Test helper */
export function resetPropertyRegistrations(): void {
  propertyRegistrations.clear();
}

export function escapePropertySyntaxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function createRegisteredPropertyRef(name: string): RegisteredPropertyRef {
  const varRef = `var(${name})` as CSSVarRef;
  return {
    name,
    var: varRef,
    toString() {
      return varRef;
    },
    valueOf() {
      return varRef;
    },
  };
}

/**
 * `@property` initial values must be *computationally independent*
 * (CSS Properties & Values Level 1, §2.4) — `var()` / `env()` references are not.
 */
function isComputationallyIndependent(value: string): boolean {
  return !/\b(?:var|env)\(/i.test(value);
}

/**
 * Looks up a safe placeholder for `syntax`. Strips one optional trailing `+`/`#`
 * list multiplier first — a single item always satisfies "one or more", so list
 * syntaxes reuse their base placeholder. Anything not an exact match (unions,
 * multi-component syntaxes, `<custom-ident>`, `<url>`, …) returns `undefined`;
 * callers must not guess beyond the {@link atProperty} preset table.
 */
function placeholderForSyntax(syntax: string): string | undefined {
  const base = syntax.trim().replace(/[+#]$/, '');
  return syntaxPlaceholderFor(base);
}

export function registerAtPropertyRule(
  name: string,
  options: { value: string; syntax: string; inherits?: boolean; initial?: string | number },
): void {
  const inherits = options.inherits ?? false;

  if (isComputationallyIndependent(options.value)) {
    const css = `@property ${name} { syntax: "${escapePropertySyntaxString(options.syntax)}"; inherits: ${inherits}; initial-value: ${options.value}; }`;
    insertRule(`@property:${name}`, css);
    return;
  }

  // The real (dependent) value reaches the cascade via a separate `:root`
  // declaration — `@property`'s `initial-value` only needs to be *some* valid,
  // computationally independent placeholder for the registered syntax.
  let placeholder: string | undefined;

  if (options.initial !== undefined) {
    const initialStr = String(options.initial);
    // Explicit initial must also be computationally independent
    if (!isComputationallyIndependent(initialStr)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[typestyles] Skipping @property for "${name}": explicit \`initial\` value "${initialStr}" ` +
            `depends on var()/env() and cannot be used as an initial-value (must be computationally ` +
            `independent). Omit \`initial\` to use the built-in placeholder table for this syntax, ` +
            `or provide a literal computationally independent value.`,
        );
      }
      return;
    }
    placeholder = initialStr;
  } else {
    placeholder = placeholderForSyntax(options.syntax);
  }

  if (placeholder === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[typestyles] Skipping @property for "${name}": its value depends on var()/env() and ` +
          `syntax "${options.syntax}" has no built-in placeholder initial-value. Pass an explicit ` +
          `\`initial\` (e.g. { initial: '0' }) to register it typed, or accept the untyped custom property.`,
      );
    }
    return;
  }

  const css = `@property ${name} { syntax: "${escapePropertySyntaxString(options.syntax)}"; inherits: ${inherits}; initial-value: ${placeholder}; }`;
  insertRule(`@property:${name}`, css);
}

export function registerAtPropertySchema(
  name: string,
  options: { syntax: string; inherits?: boolean; initial?: string | number },
): void {
  const normalized = {
    syntax: options.syntax,
    inherits: options.inherits ?? false,
    initial: options.initial,
  };
  const existing = propertyRegistrations.get(name);
  if (existing) {
    if (propertyRegistrationsEqual(existing, normalized)) return;
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`[typestyles] Conflicting @property registration for "${name}".`);
    }
    return;
  }

  const inherits = normalized.inherits;
  let placeholder: string | undefined;

  if (options.initial !== undefined) {
    const initialStr = String(options.initial);
    if (!isComputationallyIndependent(initialStr)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[typestyles] Skipping @property for "${name}": explicit \`initial\` value "${initialStr}" ` +
            `depends on var()/env() and cannot be used as an initial-value.`,
        );
      }
      return;
    }
    placeholder = initialStr;
  } else {
    placeholder = placeholderForSyntax(options.syntax);
  }

  if (placeholder === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[typestyles] Skipping @property for "${name}": syntax "${options.syntax}" has no ` +
          `built-in placeholder initial-value. Pass an explicit \`initial\`.`,
      );
    }
    return;
  }

  const css = `@property ${name} { syntax: "${escapePropertySyntaxString(options.syntax)}"; inherits: ${inherits}; initial-value: ${placeholder}; }`;
  propertyRegistrations.set(name, normalized);
  insertRule(`@property:${name}`, css);
}

export function registerRootCustomProperty(name: string, value: string): void {
  registerCustomProperty(name, value, ':root');
}

export function registerRegisteredProperty(
  name: string,
  options: { value?: string; syntax?: string; inherits?: boolean; initial?: string | number },
): void {
  if (options.syntax != null) {
    if (options.value == null) {
      throw new Error(
        '[typestyles] Registered properties with `syntax` require `value` for `@property` initial-value.',
      );
    }
    registerAtPropertyRule(name, {
      value: options.value,
      syntax: options.syntax,
      inherits: options.inherits,
      initial: options.initial,
    });
  }

  if (options.value != null) {
    registerRootCustomProperty(name, options.value);
  }
}

const propertyRefInstances = new WeakMap<RegisteredPropertyRef, unknown>();

export function createStylesPropertyFn(classNaming: ClassNamingConfig): StylesPropertyFn {
  const seen = new Set<string>();
  const ns = scopedTokenNamespace(classNaming.scopeId?.trim() || undefined, 'property');
  const prefix = `--${ns}-`;
  const instanceToken = {};

  function resolveName(id: string): string {
    return `${prefix}${sanitizeClassSegment(id)}`;
  }

  function trackId(id: string): void {
    const safeId = sanitizeClassSegment(id);
    if (seen.has(safeId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[typestyles] Duplicate styles.property("${id}") on this styles instance. ` +
            `Declare each id once and reuse the returned ref.`,
        );
      }
    } else {
      seen.add(safeId);
    }
  }

  function createInstanceRef(name: string): RegisteredPropertyRef {
    const ref = createRegisteredPropertyRef(name);
    propertyRefInstances.set(ref, instanceToken);
    return ref;
  }

  function declareFn(id: string, registration: PropertyRegistration): RegisteredPropertyRef {
    trackId(id);
    const name = resolveName(id);
    registerAtPropertySchema(name, registration);
    return createInstanceRef(name);
  }

  function setFn(ref: RegisteredPropertyRef, value: string | number): void {
    const refInstance = propertyRefInstances.get(ref);
    if (refInstance !== undefined && refInstance !== instanceToken) {
      throw new Error(
        '[typestyles] styles.property.set() received a ref from a different styles instance.',
      );
    }
    if (refInstance === undefined && !ref.name.startsWith(prefix)) {
      throw new Error(
        '[typestyles] styles.property.set() received a ref from a different styles instance.',
      );
    }
    registerCustomProperty(ref.name, String(value), ':root');
  }

  function propertyFn(id: string, options?: PropertyOptions): RegisteredPropertyRef {
    if (!options) {
      trackId(id);
      return createInstanceRef(resolveName(id));
    }

    const { value, syntax, inherits, initial } = options;

    if (syntax != null) {
      const registration: PropertyRegistration = { syntax, inherits, initial };
      if (
        registration.initial === undefined &&
        value != null &&
        isComputationallyIndependent(String(value))
      ) {
        registration.initial = value;
      }
      const ref = declareFn(id, registration);
      if (value != null) {
        setFn(ref, value);
      }
      return ref;
    }

    trackId(id);
    const name = resolveName(id);

    if (value != null) {
      registerCustomProperty(name, String(value), ':root');
    }

    return createInstanceRef(name);
  }

  return Object.assign(propertyFn, { declare: declareFn, set: setFn });
}
