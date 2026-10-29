import { describe, expect, it } from 'vite-plus/test';
import * as dtcg from './index';

describe('typestyles/dtcg entry', () => {
  it('exports fromDTCG and toDTCG', () => {
    expect(typeof dtcg.fromDTCG).toBe('function');
    expect(typeof dtcg.toDTCG).toBe('function');
  });
});
