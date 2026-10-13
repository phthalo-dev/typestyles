import path from 'node:path';
import {
  PUBLIC_CLASSNAMES_SNAPSHOT,
  collectPublicClassNames,
  writePublicClassNamesSnapshot,
} from '../snapshot-classnames.js';

export const SNAPSHOT_HELP = `typestyles snapshot [options]

Scan TypeScript sources for semantic \`style\` / \`recipe\` (and legacy \`styles.class\` /
\`styles.component\`) class names and write or print the public API snapshot used by
\`@typestyles/no-removed-public-classname\`.

Options:
  --write                 Write ${PUBLIC_CLASSNAMES_SNAPSHOT} in the project root
  --out <path>            Snapshot output path (default: ./${PUBLIC_CLASSNAMES_SNAPSHOT})
  --root <path>           Project root for scanning (default: cwd)
  --help                  Show this help
`;

type SnapshotOptions = {
  write: boolean;
  outPath: string;
  rootDir: string;
  help: boolean;
};

function parseSnapshotArgs(argv: string[]): SnapshotOptions {
  let write = false;
  let outPath = PUBLIC_CLASSNAMES_SNAPSHOT;
  let rootDir = process.cwd();
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      help = true;
      continue;
    }
    if (token === '--write') {
      write = true;
      continue;
    }
    if (token === '--out' && argv[i + 1]) {
      outPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--root' && argv[i + 1]) {
      rootDir = path.resolve(argv[i + 1]);
      i += 1;
    }
  }

  return { write, outPath, rootDir, help };
}

function buildPreview(entries: Awaited<ReturnType<typeof collectPublicClassNames>>) {
  return {
    version: 1 as const,
    classNames: entries.map((entry) => entry.className),
    entries,
  };
}

export async function runSnapshot(argv: string[]): Promise<void> {
  const { write, outPath, rootDir, help } = parseSnapshotArgs(argv);
  if (help) {
    process.stdout.write(SNAPSHOT_HELP);
    return;
  }

  const entries = await collectPublicClassNames({ rootDir });
  const resolvedOut = path.resolve(rootDir, outPath);

  if (write) {
    const snapshot = writePublicClassNamesSnapshot(resolvedOut, entries);
    process.stdout.write(
      `Wrote ${snapshot.classNames.length} public class name(s) to ${resolvedOut}\n`,
    );
    return;
  }

  process.stdout.write(`${JSON.stringify(buildPreview(entries), null, 2)}\n`);
}
