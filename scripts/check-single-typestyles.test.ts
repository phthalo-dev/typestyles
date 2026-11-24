import { describe, expect, it } from 'vite-plus/test';
import {
  findTypestylesRangeMismatches,
  reportRangeMismatches,
  findTypestylesResolutions,
  satisfiesRange,
} from './check-single-typestyles.ts';

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

describe('satisfiesRange', () => {
  it('handles caret ranges with npm 0.x semantics', () => {
    expect(satisfiesRange('0.37.0', '^0.37.0')).toBe(true);
    expect(satisfiesRange('0.37.4', '^0.37.0')).toBe(true);
    expect(satisfiesRange('0.38.0', '^0.37.0')).toBe(false);
    expect(satisfiesRange('0.36.9', '^0.37.0')).toBe(false);
    expect(satisfiesRange('1.4.0', '^1.2.0')).toBe(true);
    expect(satisfiesRange('2.0.0', '^1.2.0')).toBe(false);
    expect(satisfiesRange('0.0.2', '^0.0.1')).toBe(false);
  });

  it('handles tilde, comparator sets, alternatives, exact and *', () => {
    expect(satisfiesRange('0.37.9', '~0.37.1')).toBe(true);
    expect(satisfiesRange('0.38.0', '~0.37.1')).toBe(false);
    expect(satisfiesRange('0.40.0', '>=0.37.0 <1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.0', '>=0.37.0 <1.0.0')).toBe(false);
    expect(satisfiesRange('0.38.1', '^0.37.0 || ^0.38.0')).toBe(true);
    expect(satisfiesRange('0.37.0', '0.37.0')).toBe(true);
    expect(satisfiesRange('0.37.1', '0.37.0')).toBe(false);
    expect(satisfiesRange('0.37.0', '*')).toBe(true);
  });

  it('excludes prereleases below the range and throws on unsupported ranges', () => {
    expect(satisfiesRange('0.37.0-unstable.abc', '^0.37.0')).toBe(false);
    expect(() => satisfiesRange('0.37.0', '0.37.x')).toThrow(/unsupported/);
  });
});

describe('findTypestylesRangeMismatches', () => {
  const packages = [
    { name: '@var-ui/core', version: '0.14.0', dependencies: { typestyles: '^0.37.0' } },
    { name: '@var-ui/docs', version: '0.14.0', peerDependencies: { typestyles: '^0.37.0' } },
    { name: '@var-ui/icons', version: '0.14.0', peerDependencies: { react: '^19.0.0' } },
  ];

  it('passes when the workspace version satisfies every declared range', () => {
    expect(findTypestylesRangeMismatches('0.37.0', packages)).toEqual([]);
  });

  it('reports each package whose range excludes the workspace version', () => {
    expect(findTypestylesRangeMismatches('0.38.0', packages)).toEqual([
      '@var-ui/core@0.14.0 dependencies.typestyles is ^0.37.0; workspace typestyles is 0.38.0',
      '@var-ui/docs@0.14.0 peerDependencies.typestyles is ^0.37.0; workspace typestyles is 0.38.0',
    ]);
  });
});

describe('reportRangeMismatches', () => {
  const mismatch =
    '@var-ui/core@0.14.0 dependencies.typestyles is ^0.37.0; workspace typestyles is 0.38.0';

  it('is silent and exits 0 without mismatches', () => {
    expect(reportRangeMismatches([], false)).toEqual({ exitCode: 0, lines: [] });
    expect(reportRangeMismatches([], true)).toEqual({ exitCode: 0, lines: [] });
  });

  it('warns but exits 0 by default (ci must not deadlock release PRs)', () => {
    const { exitCode, lines } = reportRangeMismatches([mismatch], false);
    expect(exitCode).toBe(0);
    expect(lines[0]).toMatch(/^WARNING/);
    expect(lines).toContain(`  - ${mismatch}`);
    expect(lines.join('\n')).toMatch(/bump all @var-ui\/\* pins/);
  });

  it('exits 1 with --strict-ranges', () => {
    const { exitCode, lines } = reportRangeMismatches([mismatch], true);
    expect(exitCode).toBe(1);
    expect(lines[0]).toMatch(/^ERROR/);
  });
});
