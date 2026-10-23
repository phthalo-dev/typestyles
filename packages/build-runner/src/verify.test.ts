import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { VerifyTypestylesBuildError, verifyTypestylesBuild } from './verify';

function writeFixture(
  root: string,
  css: string,
  manifest?: { version: number; css: string },
): { cssFile: string; manifestFile?: string } {
  mkdirSync(join(root, 'app'), { recursive: true });
  const cssFile = 'app/typestyles.css';
  writeFileSync(join(root, cssFile), css, 'utf8');
  if (manifest) {
    const manifestFile = 'app/typestyles.manifest.json';
    writeFileSync(join(root, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { cssFile, manifestFile };
  }
  return { cssFile };
}

describe('verifyTypestylesBuild', () => {
  it('passes when CSS and manifest match defaults', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-ok-'));
    const { cssFile, manifestFile } = writeFixture(root, '.button { color: red; }', {
      version: 1,
      css: 'app/typestyles.css',
    });

    try {
      const result = verifyTypestylesBuild({
        root,
        cssFile,
        manifestFile,
        requiredCssSubstrings: ['.button {'],
      });
      expect(result.cssBytes).toBeGreaterThan(0);
      expect(result.manifestVersion).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips manifest checks when manifestFile is omitted', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-css-only-'));
    const { cssFile } = writeFixture(root, '.card { padding: 1rem; }');

    try {
      const result = verifyTypestylesBuild({ root, cssFile });
      expect(result.manifestPath).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when CSS is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-missing-css-'));
    try {
      expect(() => verifyTypestylesBuild({ root, cssFile: 'app/typestyles.css' })).toThrow(
        VerifyTypestylesBuildError,
      );
      expect(() => verifyTypestylesBuild({ root, cssFile: 'app/typestyles.css' })).toThrow(
        /Missing .*typestyles\.css/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when CSS is below minBytes', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-small-css-'));
    const { cssFile } = writeFixture(root, 'x');

    try {
      expect(() => verifyTypestylesBuild({ root, cssFile, minBytes: 500 })).toThrow(
        /unexpectedly small/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when a required substring is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-substring-'));
    const { cssFile } = writeFixture(root, '.button { color: red; }');

    try {
      expect(() =>
        verifyTypestylesBuild({
          root,
          cssFile,
          requiredCssSubstrings: ['.missing-class {'],
        }),
      ).toThrow(/Expected CSS to contain/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when manifest css path does not match', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-manifest-css-'));
    const { cssFile, manifestFile } = writeFixture(root, '.button { color: red; }', {
      version: 1,
      css: 'wrong/path.css',
    });

    try {
      expect(() => verifyTypestylesBuild({ root, cssFile, manifestFile })).toThrow(
        /Expected manifest\.css/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('validates v2 route CSS files', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-verify-v2-'));
    mkdirSync(join(root, 'app/_typestyles/routes'), { recursive: true });
    const { cssFile } = writeFixture(root, '.button { color: red; }');
    const manifestFile = 'app/typestyles.manifest.json';
    writeFileSync(join(root, 'app/_typestyles/routes/index.css'), '.home { color: red; }');
    writeFileSync(
      join(root, 'app/typestyles.manifest.json'),
      `${JSON.stringify(
        {
          version: 2,
          css: cssFile,
          routes: {
            '/': { css: 'app/_typestyles/routes/index.css' },
          },
        },
        null,
        2,
      )}\n`,
    );

    try {
      const result = verifyTypestylesBuild({
        root,
        cssFile,
        manifestFile,
        manifestVersion: 2,
        minRouteEntries: 1,
      });
      expect(result.manifestVersion).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
