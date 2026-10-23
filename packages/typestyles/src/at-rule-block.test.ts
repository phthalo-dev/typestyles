import { describe, it, expect } from 'vite-plus/test';
import { atRuleBlock } from './at-rule-block';
import { container } from './container';
import type { CSSProperties } from './types';

describe('atRuleBlock', () => {
  it('returns a one-key object for runtime merge', () => {
    expect(atRuleBlock('@media (max-width: 1px)', { display: 'none' })).toEqual({
      '@media (max-width: 1px)': { display: 'none' },
    });
  });

  it('spreads into CSSProperties without assertion', () => {
    const key = container({ minWidth: 400 });
    const merged: CSSProperties = {
      color: 'blue',
      ...atRuleBlock(key, { display: 'grid' }),
    };
    expect(merged[key]).toEqual({ display: 'grid' });
  });
});
