/**
 * Fails when pnpm-lock.yaml resolves more than one copy of the `typestyles` runtime.
 * Two copies mean two class-name/token registries, which breaks the @var-ui kit silently.
 *
 * Usage: node scripts/check-single-typestyles.ts
 */
import { readFileSync } from 'node:fs';
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
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
