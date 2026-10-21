import { describe, it, expect, beforeEach } from 'vitest';
import { reset } from './sheet';
import { createStyles } from './styles';
import { createTypeStyles } from './create-type-styles';
import { getComponentMeta } from './component-meta';
import { getRegisteredComponentRefs } from './component-registry';

describe('component registry', () => {
  beforeEach(() => {
    reset();
  });

  it('registers components by namespace on createStyles', () => {
    const styles = createStyles({ scopeId: 'reg' });
    const button = styles.component({ name: 'button', styles: { base: { color: 'red' } } });
    styles.component({
      name: 'visually-hidden',
      themeable: false,
      styles: { base: { clip: 'rect(0,0,0,0)' } },
    });

    expect(styles.getComponent('button')).toBe(button);
    expect(styles.getComponent('missing')).toBeUndefined();
    expect(styles.listComponentNamespaces()).toEqual(['button', 'visually-hidden']);
    expect([...styles.getThemeableComponents().keys()]).toEqual(['button']);
    expect(getComponentMeta(button)?.namespace).toBe('button');
  });

  it('does not share registry across createTypeStyles instances', () => {
    const a = createTypeStyles({ scopeId: 'a' });
    const b = createTypeStyles({ scopeId: 'b' });
    a.recipe({ name: 'card', styles: { base: { padding: '1rem' } } });
    b.recipe({ name: 'card', styles: { base: { padding: '2rem' } } });

    expect(a.getComponent('card')).not.toBe(b.getComponent('card'));
  });

  it('getRegisteredComponentRefs returns themeable handles keyed by namespace', () => {
    const styles = createStyles({ scopeId: 'refs' });
    const button = styles.component({ name: 'button', styles: { base: { color: 'blue' } } });
    styles.component({ name: 'util', themeable: false, styles: { base: { display: 'none' } } });
    expect(getRegisteredComponentRefs(styles)).toEqual({ button });
  });

  it('replaces duplicate namespace on the same instance', () => {
    const styles = createStyles({ scopeId: 'dup' });
    const first = styles.component({ name: 'chip', styles: { base: { color: 'a' } } });
    const second = styles.component({ name: 'chip', styles: { base: { color: 'b' } } });
    expect(styles.getComponent('chip')).toBe(second);
    expect(styles.getComponent('chip')).not.toBe(first);
  });
});
