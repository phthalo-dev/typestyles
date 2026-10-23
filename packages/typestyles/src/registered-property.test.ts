import { describe, it, expect, beforeEach } from 'vite-plus/test';
import {
  registerAtPropertyRule,
  registerAtPropertySchema,
  registerRegisteredProperty,
} from './registered-property';
import { getRegisteredCss, reset, flushSync } from './sheet';

describe('registerAtPropertyRule', () => {
  beforeEach(() => {
    reset();
  });

  it('emits a typed @property with initial-value for computationally independent values', () => {
    registerAtPropertyRule('--ts-test-literal', { value: '#fff', syntax: '<color>' });
    expect(getRegisteredCss()).toContain(
      '@property --ts-test-literal { syntax: "<color>"; inherits: false; initial-value: #fff; }',
    );
  });

  it('registers @property with a placeholder initial-value for var()-dependent <color> values', () => {
    registerAtPropertyRule('--ts-test-var', {
      value: 'var(--ts-token-ref)',
      syntax: '<color>',
      inherits: false,
    });
    const css = getRegisteredCss();
    expect(css).toContain(
      '@property --ts-test-var { syntax: "<color>"; inherits: false; initial-value: transparent; }',
    );
  });

  it('registers @property with a placeholder initial-value for env()-dependent <length> values', () => {
    registerAtPropertyRule('--ts-test-env', {
      value: 'env(safe-area-inset-top)',
      syntax: '<length>',
      inherits: true,
    });
    const css = getRegisteredCss();
    expect(css).toContain(
      '@property --ts-test-env { syntax: "<length>"; inherits: true; initial-value: 0px; }',
    );
  });

  it('strips a trailing + list multiplier before matching the placeholder table', () => {
    registerAtPropertyRule('--ts-test-list', {
      value: 'var(--ts-a) var(--ts-b)',
      syntax: '<color>+',
      inherits: false,
    });
    const css = getRegisteredCss();
    expect(css).toContain(
      '@property --ts-test-list { syntax: "<color>+"; inherits: false; initial-value: transparent; }',
    );
  });

  it('strips a trailing # list multiplier before matching the placeholder table', () => {
    registerAtPropertyRule('--ts-test-list-hash', {
      value: 'var(--ts-a)',
      syntax: '<color>#',
      inherits: false,
    });
    const css = getRegisteredCss();
    expect(css).toContain(
      '@property --ts-test-list-hash { syntax: "<color>#"; inherits: false; initial-value: transparent; }',
    );
  });

  it('falls back to skipping @property when the syntax has no placeholder and none is given', () => {
    registerAtPropertyRule('--ts-test-noplaceholder', {
      value: 'var(--ts-token-ref)',
      syntax: '<custom-ident>',
      inherits: false,
    });
    const css = getRegisteredCss();
    expect(css).not.toContain('@property --ts-test-noplaceholder');
  });

  it('uses an explicit initial override instead of the placeholder table', () => {
    registerAtPropertyRule('--ts-test-explicit', {
      value: 'var(--ts-token-ref)',
      syntax: '<color>',
      inherits: false,
      initial: 'hotpink',
    });
    const css = getRegisteredCss();
    expect(css).toContain(
      '@property --ts-test-explicit { syntax: "<color>"; inherits: false; initial-value: hotpink; }',
    );
  });

  it('accepts a numeric explicit initial override', () => {
    registerAtPropertyRule('--ts-test-explicit-number', {
      value: 'calc(var(--ts-a) + 1)',
      syntax: '<number>',
      inherits: false,
      initial: 0,
    });
    const css = getRegisteredCss();
    expect(css).toContain('initial-value: 0;');
  });

  it('keeps the :root default assignment for var() values alongside the registered placeholder', () => {
    registerRegisteredProperty('--ts-test-root', {
      value: 'var(--ts-token-ref)',
      syntax: '<color>',
    });
    const css = getRegisteredCss();
    expect(css).toContain(':root { --ts-test-root: var(--ts-token-ref); }');
    expect(css).toContain('@property --ts-test-root');
    expect(css).toContain('initial-value: transparent');
  });

  it('skips @property when explicit initial contains var()/env() (not computationally independent)', () => {
    registerAtPropertyRule('--ts-test-dependent-initial', {
      value: 'var(--ts-token-ref)',
      syntax: '<color>',
      inherits: false,
      initial: 'var(--other-token)',
    });
    const css = getRegisteredCss();
    expect(css).not.toContain('@property --ts-test-dependent-initial');
  });
});

describe('registerAtPropertySchema', () => {
  beforeEach(() => {
    reset();
  });

  it('registerAtPropertySchema emits @property with syntax placeholder and no value arg', () => {
    reset();
    registerAtPropertySchema('--ts-schema-color', { syntax: '<color>', inherits: false });
    flushSync();
    expect(getRegisteredCss()).toContain(
      '@property --ts-schema-color { syntax: "<color>"; inherits: false; initial-value: transparent; }',
    );
  });

  it('registerAtPropertySchema uses explicit initial when provided', () => {
    reset();
    registerAtPropertySchema('--ts-schema-explicit', {
      syntax: '<color>',
      inherits: false,
      initial: 'hotpink',
    });
    flushSync();
    expect(getRegisteredCss()).toContain('initial-value: hotpink');
  });
});

describe('registerAtPropertySchema conflict detection', () => {
  beforeEach(() => {
    reset();
  });

  it('identical re-registration is a no-op', () => {
    registerAtPropertySchema('--ts-conflict', { syntax: '<color>', inherits: false });
    registerAtPropertySchema('--ts-conflict', { syntax: '<color>', inherits: false });
    flushSync();
    expect(getRegisteredCss().match(/@property --ts-conflict/g)?.length).toBe(1);
  });

  it('conflicting re-registration throws in dev mode', () => {
    registerAtPropertySchema('--ts-conflict', { syntax: '<color>', inherits: false });
    expect(() =>
      registerAtPropertySchema('--ts-conflict', { syntax: '<length>', inherits: false }),
    ).toThrow(/conflicting/i);
  });
});
