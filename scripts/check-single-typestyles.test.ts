import { describe, expect, it } from 'vite-plus/test';
import { findTypestylesResolutions } from './check-single-typestyles.ts';

describe('findTypestylesResolutions', () => {
  it('returns one key for a single typestyles resolution', () => {
    const lock = `
packages:
  typestyles@0.37.0:
    resolution: {integrity: sha512-x}

snapshots:
  typestyles@0.37.0: {}
`;
    expect(findTypestylesResolutions(lock)).toEqual(['typestyles@0.37.0']);
  });

  it('returns every distinct version when several are resolved', () => {
    const lock = `
packages:
  typestyles@0.36.0:
    resolution: {integrity: sha512-a}
  typestyles@0.37.0:
    resolution: {integrity: sha512-b}
snapshots:
  typestyles@0.36.0: {}
  typestyles@0.37.0(react@19.0.0): {}
`;
    expect(findTypestylesResolutions(lock)).toEqual(['typestyles@0.36.0', 'typestyles@0.37.0']);
  });

  it('counts the workspace link as a copy next to a registry resolution', () => {
    const lock = `
importers:
  docs:
    dependencies:
      typestyles:
        specifier: workspace:*
        version: link:../packages/typestyles

packages:
  typestyles@0.37.0:
    resolution: {integrity: sha512-x}
`;
    expect(findTypestylesResolutions(lock)).toEqual(['typestyles@0.37.0', 'typestyles@workspace']);
  });

  it('returns one key for a workspace link alone', () => {
    const lock = `
importers:
  docs:
    dependencies:
      typestyles:
        specifier: workspace:*
        version: link:../packages/typestyles
`;
    expect(findTypestylesResolutions(lock)).toEqual(['typestyles@workspace']);
  });

  it('ignores scoped packages and prefix-sharing names', () => {
    const lock = `
packages:
  '@typestyles/vite@0.9.0':
    resolution: {integrity: sha512-a}
  typestyles-foo@1.0.0:
    resolution: {integrity: sha512-b}
snapshots:
  '@typestyles/vite@0.9.0(vite@6.4.1)': {}
`;
    expect(findTypestylesResolutions(lock)).toEqual([]);
  });
});
