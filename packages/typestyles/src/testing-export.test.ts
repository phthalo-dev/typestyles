import { describe, it, expect } from 'vite-plus/test';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist');
const distExists = existsSync(dist);

if (!distExists) {
  console.warn(
    '[typestyles:testing-export.test] dist/ not found — run `pnpm build` first. Skipping.',
  );
}

describe.skipIf(!distExists)('typestyles/testing dist output', () => {
  it('emits esm, cjs, and type declaration files', () => {
    expect(existsSync(`${dist}/testing.js`)).toBe(true);
    expect(existsSync(`${dist}/testing.cjs`)).toBe(true);
    expect(existsSync(`${dist}/testing.d.ts`)).toBe(true);
    expect(existsSync(`${dist}/testing.d.cts`)).toBe(true);
  });
});
