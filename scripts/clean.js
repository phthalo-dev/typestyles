import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const removableNames = ['dist', 'node_modules', '.turbo'];

async function workspaceDirectories() {
  const raw = await fs.readFile(path.join(workspaceRoot, 'pnpm-workspace.yaml'), 'utf8');
  const patterns = [];
  let inPackages = false;

  for (const line of raw.split('\n')) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (/^\S/.test(line)) break;

    const match = line.match(/^\s*-\s+['"]?([^'"#\s]+)['"]?\s*$/);
    if (match) patterns.push(match[1]);
  }

  const directories = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const parent = path.join(workspaceRoot, pattern.slice(0, -2));
      let entries = [];
      try {
        entries = await fs.readdir(parent, { withFileTypes: true });
      } catch (error) {
        if (error && error.code === 'ENOENT') continue;
        throw error;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) directories.push(path.join(parent, entry.name));
      }
      continue;
    }

    directories.push(path.join(workspaceRoot, pattern));
  }

  return directories;
}

async function removeDirectory(target) {
  const resolved = path.resolve(target);
  const insideRepo = resolved === workspaceRoot || resolved.startsWith(workspaceRoot + path.sep);
  if (!insideRepo) {
    throw new Error(`Refusing to delete outside the repo: ${resolved}`);
  }

  try {
    await fs.rm(resolved, { recursive: true, force: false });
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

const removed = [];

for (const directory of await workspaceDirectories()) {
  for (const name of removableNames) {
    const target = path.join(directory, name);
    if (await removeDirectory(target)) {
      removed.push(path.relative(workspaceRoot, target));
    }
  }
}

for (const name of ['node_modules', '.turbo']) {
  if (await removeDirectory(path.join(workspaceRoot, name))) {
    removed.push(name);
  }
}

if (removed.length === 0) {
  console.log('Already clean.');
} else {
  for (const relativePath of removed.sort()) {
    console.log(`removed ${relativePath}`);
  }
  console.log(`Cleaned ${removed.length} directories.`);
}
