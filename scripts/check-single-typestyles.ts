/**
 * Fails when pnpm-lock.yaml resolves more than one copy of the `typestyles` runtime.
 * Two copies mean two class-name/token registries, which breaks the @var-ui kit silently.
 *
 * Also checks that the workspace `typestyles` version satisfies the `typestyles` range each
 * pinned `@var-ui/*` package (from `docs/package.json`) declares. `pnpm-workspace.yaml` overrides
 * `@var-ui/core>typestyles` and `@var-ui/astro>typestyles` to the workspace copy, so pnpm itself
 * never warns when typestyles moves past what Var UI supports.
 *
 * A range mismatch only WARNS by default (exit 0). This runs in `vp run ci`, and failing there
 * would deadlock releases: the `chore: version packages` PR that bumps typestyles to a new 0.x
 * minor could never pass Verify, so typestyles could never publish and Var UI could never ship a
 * compatible release. The docs build in `vp run ci` is the real gate: a truly incompatible kit
 * breaks it. Pass `--strict-ranges` to exit 1 on a mismatch (manual use).
 *
 * Usage: node scripts/check-single-typestyles.ts [--strict-ranges]
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Unique `typestyles@<version>` keys under the `packages:` / `snapshots:` sections, plus
 * `typestyles@workspace` when any importer links the in-repo `packages/typestyles`.
 * A registry copy next to the workspace link is two runtimes, so it reports two keys.
 */
export function findTypestylesResolutions(lockfile: string): string[] {
  const found = new Set<string>();
  let section = '';
  for (const line of lockfile.split('\n')) {
    const top = /^([A-Za-z]+):/.exec(line);
    if (top) {
      section = top[1];
      continue;
    }
    if (section !== 'packages' && section !== 'snapshots') continue;
    // Entry keys sit at two-space indent, optionally quoted; scoped names start with `@`.
    const match = /^ {2}'?typestyles@([^\s:'(]+)/.exec(line);
    if (match) found.add(`typestyles@${match[1]}`);
  }
  if (
    /^\s+typestyles:\s*\n\s+specifier:[^\n]*\n\s+version: link:[^\n]*packages\/typestyles\s*$/m.test(
      lockfile,
    )
  ) {
    found.add('typestyles@workspace');
  }
  return [...found].sort();
}

type Version = [number, number, number, string];

function parseVersion(text: string): Version | undefined {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ?? ''] : undefined;
}

function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number);
  if (a[3] === b[3]) return 0;
  // A prerelease sorts before its release (string order is enough for our own versions).
  if (!a[3]) return 1;
  if (!b[3]) return -1;
  return a[3] < b[3] ? -1 : 1;
}

/** `[lower inclusive, upper exclusive]` for `^x.y.z` / `~x.y.z` (npm semantics for 0.x). */
function caretOrTildeBounds(op: '^' | '~', v: Version): [Version, Version] {
  const [major, minor, patch] = v;
  if (op === '~') return [v, [major, minor + 1, 0, '']];
  if (major > 0) return [v, [major + 1, 0, 0, '']];
  if (minor > 0) return [v, [0, minor + 1, 0, '']];
  return [v, [0, 0, patch + 1, '']];
}

function satisfiesComparator(version: Version, comparator: string): boolean {
  if (comparator === '*' || comparator === 'x' || comparator === '') return true;
  const m = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(comparator);
  const target = m && parseVersion(m[2]);
  if (!m || !target) throw new Error(`unsupported range comparator: ${comparator}`);
  const op = m[1] ?? '=';
  if (op === '^' || op === '~') {
    const [low, high] = caretOrTildeBounds(op, target);
    return compareVersions(version, low) >= 0 && compareVersions(version, high) < 0;
  }
  const cmp = compareVersions(version, target);
  if (op === '>=') return cmp >= 0;
  if (op === '<=') return cmp <= 0;
  if (op === '>') return cmp > 0;
  if (op === '<') return cmp < 0;
  return cmp === 0;
}

/**
 * Minimal npm-range check (no dependency on `semver`): `||` alternatives of space-separated
 * comparators (`^`, `~`, `>=`, `<=`, `>`, `<`, `=`, exact, `*`). Throws on anything else, such as
 * `x`-ranges or hyphen ranges, so an unsupported range fails loudly instead of passing.
 */
export function satisfiesRange(version: string, range: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) throw new Error(`invalid version: ${version}`);
  return range.split('||').some((set) =>
    set
      .trim()
      .replace(/(\^|~|>=|<=|>|<|=)\s+/g, '$1')
      .split(/\s+/)
      .every((comparator) => satisfiesComparator(parsed, comparator)),
  );
}

export interface VarUiPackage {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** One message per `@var-ui/*` package whose declared `typestyles` range excludes `workspaceVersion`. */
export function findTypestylesRangeMismatches(
  workspaceVersion: string,
  packages: VarUiPackage[],
): string[] {
  const problems: string[] = [];
  for (const pkg of packages) {
    for (const field of ['dependencies', 'peerDependencies'] as const) {
      const range = pkg[field]?.typestyles;
      if (range && !satisfiesRange(workspaceVersion, range)) {
        problems.push(
          `${pkg.name}@${pkg.version} ${field}.typestyles is ${range}; workspace typestyles is ${workspaceVersion}`,
        );
      }
    }
  }
  return problems;
}

function readJson<T>(url: URL): T {
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as T;
}

/** The `@var-ui/*` packages pinned in docs/package.json, read from their installed package.json. */
function installedVarUiPackages(): VarUiPackage[] {
  const docs = readJson<VarUiPackage>(new URL('../docs/package.json', import.meta.url));
  return Object.keys({ ...docs.dependencies })
    .filter((name) => name.startsWith('@var-ui/'))
    .map((name) => {
      const url = new URL(`../docs/node_modules/${name}/package.json`, import.meta.url);
      if (!existsSync(fileURLToPath(url))) {
        throw new Error(`${name} is not installed under docs/node_modules; run pnpm install`);
      }
      return readJson<VarUiPackage>(url);
    });
}

/** Lines for a mismatch report; exit code 1 only in strict mode. */
export function reportRangeMismatches(
  mismatches: string[],
  strict: boolean,
): { exitCode: 0 | 1; lines: string[] } {
  if (!mismatches.length) return { exitCode: 0, lines: [] };
  const lines = [
    strict
      ? 'ERROR: workspace typestyles is outside the range a pinned @var-ui package declares:'
      : 'WARNING: workspace typestyles is outside the range a pinned @var-ui package declares:',
    ...mismatches.map((problem) => `  - ${problem}`),
    'pnpm-workspace.yaml overrides @var-ui/{core,astro}>typestyles to the workspace copy, so pnpm ' +
      'does not warn. Once Var UI publishes a release that supports this typestyles, bump all ' +
      '@var-ui/* pins in docs/package.json together (see docs/README.md, Var UI version pin policy).',
  ];
  if (!strict) {
    lines.push(
      'Not failing: the docs build is the gate for real incompatibility. ' +
        'Run with --strict-ranges to fail on this.',
    );
  }
  return { exitCode: strict ? 1 : 0, lines };
}

function main(): void {
  const lockPath = fileURLToPath(new URL('../pnpm-lock.yaml', import.meta.url));
  const resolutions = findTypestylesResolutions(readFileSync(lockPath, 'utf8'));
  if (resolutions.length > 1) {
    console.error('Multiple typestyles copies resolved in pnpm-lock.yaml:');
    for (const key of resolutions) console.error(`  - ${key}`);
    console.error('Align versions (pnpm.overrides / catalog) so exactly one is installed.');
    process.exit(1);
  }
  console.log(`single typestyles resolution OK (${resolutions[0] ?? 'workspace link only'})`);

  const workspaceVersion = readJson<VarUiPackage>(
    new URL('../packages/typestyles/package.json', import.meta.url),
  ).version;
  const varUi = installedVarUiPackages();
  const mismatches = findTypestylesRangeMismatches(workspaceVersion, varUi);
  if (mismatches.length) {
    const strict = process.argv.includes('--strict-ranges');
    const { exitCode, lines } = reportRangeMismatches(mismatches, strict);
    const bar = '!'.repeat(72);
    console.warn([bar, ...lines, bar].join('\n'));
    process.exit(exitCode);
  }
  console.log(
    `typestyles ${workspaceVersion} satisfies the range of ${varUi.map((p) => `${p.name}@${p.version}`).join(', ')}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
