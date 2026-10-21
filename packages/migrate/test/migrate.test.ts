import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runMigration } from '../src/migrate';
import { migrateSource } from '../src/transform';

const fixture = (name: string) => join(process.cwd(), 'test', 'fixtures', name);

describe('migrateSource', () => {
  it('migrates styled-components templates to typestyles class usage', async () => {
    const input = await readFile(fixture('styled-input.tsx'), 'utf8');
    const result = migrateSource('styled-input.tsx', input);

    expect(result.changed).toBe(true);
    expect(result.code).toContain(`from "typestyles"`);
    expect(result.code).toContain(`style("button"`);
    expect(result.code).toContain('<button');
    expect(result.code).toContain('className');
  });

  it('migrates emotion css tagged templates to styles.class', async () => {
    const input = await readFile(fixture('emotion-input.ts'), 'utf8');
    const result = migrateSource('emotion-input.ts', input);

    expect(result.changed).toBe(true);
    expect(result.code).toContain(`style("button"`);
    expect(result.code).not.toContain(`css\``);
  });

  it('migrates prop-based template interpolations to createVar and assignVars', async () => {
    const input = `
import styled from 'styled-components';
const Button = styled.button\`
  color: \${(props) => props.color};
\`;
function App() {
  return <Button color="red" />;
}
`.trim();
    const result = migrateSource('button.tsx', input);

    expect(result.changed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.code).toContain('createVar');
    expect(result.code).toContain('assignVars');
    expect(result.code).toContain('style("button"');
    expect(result.code).toContain('<button');
    expect(result.code).not.toContain('color="red"');
    expect(result.code).not.toContain('<Button');
  });

  it('migrates multiple prop interpolations with css suffixes', async () => {
    const input = await readFile(fixture('interpolated-input.tsx'), 'utf8');
    const result = migrateSource('interpolated-input.tsx', input);

    expect(result.changed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.code).toContain('createVar');
    expect(result.code).toContain('assignVars');
    expect(result.code).toContain('style("box"');
    expect(result.code).not.toContain('<Box');
    expect(result.code).not.toContain('width={200}');
  });

  it('migrates destructured prop interpolations', async () => {
    const input = await readFile(fixture('destructured-input.tsx'), 'utf8');
    const result = migrateSource('destructured-input.tsx', input);

    expect(result.changed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.code).toContain('createVar');
    expect(result.code).toContain('assignVars');
    expect(result.code).not.toContain('<Button');
  });

  it('migrates boolean prop ternaries to styles.component variants', async () => {
    const input = await readFile(fixture('variant-input.tsx'), 'utf8');
    const result = migrateSource('variant-input.tsx', input);

    expect(result.changed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.code).toContain('name: "button"');
    expect(result.code).toContain('variant.boolean');
    expect(result.code).toContain('styles:');
    expect(result.code).not.toContain('defaultVariants');
    expect(result.code).toContain('primary: true');
    expect(result.code).toContain('.className');
    expect(result.code).not.toContain('<Button');
  });

  it('migrates static templates with @media rules', async () => {
    const input = await readFile(fixture('media-input.tsx'), 'utf8');
    const result = migrateSource('media-input.tsx', input);

    expect(result.changed).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.code).toContain('"@media (max-width: 640px)"');
    expect(result.code).not.toContain('<Card');
  });

  it('skips unsupported interpolated templates with warning', async () => {
    const input = await readFile(fixture('unsupported-input.tsx'), 'utf8');
    const result = migrateSource('unsupported-input.tsx', input);

    expect(result.changed).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.message).toContain('unsupported interpolations');
  });

  it('migrates @emotion/styled default import the same as styled-components', () => {
    const source = `
import styled from '@emotion/styled';
const card = styled.div\`
  padding: 16px;
  border-radius: 8px;
\`;
function App() {
  return <card />;
}
`.trim();
    const result = migrateSource('card.tsx', source);
    expect(result.changed).toBe(true);
    expect(result.code).toContain(`style("card"`);
    expect(result.code).toContain('<div');
    expect(result.code).toContain('className');
    expect(result.code).not.toContain(`styled.div`);
  });

  it('migrates css tagged template from @emotion/css', () => {
    const source = `
import { css } from '@emotion/css';
const button = css\`
  color: white;
  background: blue;
\`;
`.trim();
    const result = migrateSource('button.ts', source);
    expect(result.changed).toBe(true);
    expect(result.code).toContain(`style("button"`);
    expect(result.code).not.toContain(`css\``);
  });

  it('migrates css named export from styled-components', () => {
    const source = `
import { css } from 'styled-components';
const badge = css\`
  font-size: 12px;
\`;
`.trim();
    const result = migrateSource('badge.ts', source);
    expect(result.changed).toBe(true);
    expect(result.code).toContain(`style("badge"`);
  });

  it('migrates styled(Component) wrapping another component', () => {
    const source = `
import styled from 'styled-components';
function Button(props) { return <button {...props} />; }
const StyledButton = styled(Button)\`
  color: red;
\`;
function App() {
  return <StyledButton />;
}
`.trim();
    const result = migrateSource('app.tsx', source);
    expect(result.changed).toBe(true);
    expect(result.code).toContain(`style("styled-button"`);
    expect(result.code).toContain('<Button');
    expect(result.code).toContain('className');
    // The JSX element tag should no longer be StyledButton
    expect(result.code).not.toContain('<StyledButton');
  });

  it('merges className when the element already has one', () => {
    const source = `
import styled from 'styled-components';
const Box = styled.div\`color: red;\`;
function App() {
  return <Box className="existing" />;
}
`.trim();
    const result = migrateSource('box.tsx', source);
    expect(result.changed).toBe(true);
    // Both the generated class and the existing one should be present
    expect(result.code).toContain('existing');
    expect(result.code).toContain('className');
    // The merge expression joins them
    expect(result.code).toContain('filter');
    expect(result.code).toContain('join');
  });

  it('warns and skips exported styled components', () => {
    const source = `
import styled from 'styled-components';
export const Button = styled.button\`color: red;\`;
`.trim();
    const result = migrateSource('exported.tsx', source);
    expect(result.changed).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.message.includes('exported'))).toBe(true);
  });

  it('warns and skips styled components with non-JSX references', () => {
    const source = `
import styled from 'styled-components';
const Button = styled.button\`color: red;\`;
const copy = Button;
`.trim();
    const result = migrateSource('non-jsx.tsx', source);
    expect(result.changed).toBe(false);
    expect(result.warnings.some((w) => w.message.includes('non-JSX'))).toBe(true);
  });

  it('adds styles to an existing typestyles import instead of creating a new one', () => {
    const source = `
import { createTypeStyles, createVar } from 'typestyles';
import { css } from '@emotion/react';
const v = createVar();
const button = css\`color: red;\`;
`.trim();
    const result = migrateSource('existing-import.ts', source);
    expect(result.changed).toBe(true);
    // Should not have two separate typestyles imports
    const importCount = (result.code.match(/from ['"]typestyles['"]/g) ?? []).length;
    expect(importCount).toBe(1);
    expect(result.code).toContain('createVar');
    expect(result.code).toContain('createTypeStyles');
    expect(result.code).toContain('style(');
  });

  it('does not duplicate createTypeStyles when style is already bound', () => {
    const source = `
import { createTypeStyles } from 'typestyles';
const { style } = createTypeStyles();
import { css } from '@emotion/react';
const button = css\`color: red;\`;
`.trim();
    const result = migrateSource('already-style.ts', source);
    expect(result.changed).toBe(true);
    expect((result.code.match(/createTypeStyles\(\)/g) ?? []).length).toBe(1);
  });

  it('returns changed:false and original code when no migration applies', () => {
    const source = `const x = 1 + 2;\nconsole.log(x);\n`;
    const result = migrateSource('plain.ts', source);
    expect(result.changed).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('converts multi-word variable names to kebab-case in class name', () => {
    const source = `
import { css } from '@emotion/react';
const primaryButton = css\`color: white;\`;
`.trim();
    const result = migrateSource('kebab.ts', source);
    expect(result.changed).toBe(true);
    expect(result.code).toContain(`style("primary-button"`);
  });
});

describe('runMigration', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('supports dry-run and write modes', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));
    const filePath = join(tempDir, 'button.ts');
    const source = `import { css } from '@emotion/react';\nconst button = css\`color: red;\`;\n`;
    await writeFile(filePath, source, 'utf8');

    const dryRunReport = await runMigration(tempDir, {
      targets: ['.'],
      write: false,
      include: [],
      exclude: [],
      extensions: ['.ts'],
    });
    const afterDryRun = await readFile(filePath, 'utf8');

    expect(dryRunReport.summary.filesChanged).toBe(1);
    expect(afterDryRun).toBe(source);

    const writeReport = await runMigration(tempDir, {
      targets: ['.'],
      write: true,
      include: [],
      exclude: [],
      extensions: ['.ts'],
    });
    const afterWrite = await readFile(filePath, 'utf8');

    expect(writeReport.summary.filesChanged).toBe(1);
    expect(afterWrite).toContain('style(');
  });

  it('returns correct summary counts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));
    // Two migratable files and one plain file
    await writeFile(
      join(tempDir, 'a.ts'),
      `import { css } from '@emotion/react';\nconst a = css\`color: red;\`;\n`,
      'utf8',
    );
    await writeFile(
      join(tempDir, 'b.ts'),
      `import { css } from '@emotion/react';\nconst b = css\`color: blue;\`;\n`,
      'utf8',
    );
    await writeFile(join(tempDir, 'c.ts'), `const x = 1;\n`, 'utf8');

    const report = await runMigration(tempDir, {
      targets: ['.'],
      write: false,
      include: [],
      exclude: [],
      extensions: ['.ts'],
    });

    expect(report.summary.filesScanned).toBe(3);
    expect(report.summary.filesChanged).toBe(2);
    expect(report.summary.warnings).toBe(0);
    expect(report.files).toHaveLength(3);
  });

  it('writes a JSON report when reportPath is set', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));
    const filePath = join(tempDir, 'btn.ts');
    await writeFile(
      filePath,
      `import { css } from '@emotion/react';\nconst btn = css\`color: red;\`;\n`,
      'utf8',
    );
    const reportPath = join(tempDir, 'reports', 'migration.json');

    await runMigration(tempDir, {
      targets: ['.'],
      write: false,
      include: [],
      exclude: [],
      extensions: ['.ts'],
      reportPath,
    });

    const reportContent = await readFile(reportPath, 'utf8');
    const parsed = JSON.parse(reportContent) as { summary: { filesScanned: number } };
    expect(parsed.summary.filesScanned).toBe(1);
  });

  it('respects the extensions option', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));
    await writeFile(
      join(tempDir, 'styles.ts'),
      `import { css } from '@emotion/react';\nconst s = css\`color: red;\`;\n`,
      'utf8',
    );
    await writeFile(
      join(tempDir, 'styles.js'),
      `import { css } from '@emotion/react';\nconst s = css\`color: red;\`;\n`,
      'utf8',
    );

    const report = await runMigration(tempDir, {
      targets: ['.'],
      write: false,
      include: [],
      exclude: [],
      extensions: ['.ts'],
    });

    // Only the .ts file should be scanned
    expect(report.summary.filesScanned).toBe(1);
  });

  it('accumulates warnings in the report', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));
    await writeFile(
      join(tempDir, 'warn.ts'),
      `
import styled from 'styled-components';

export const Btn = styled.button\`color: red;\`;
`.trim(),
      'utf8',
    );

    const report = await runMigration(tempDir, {
      targets: ['.'],
      write: false,
      include: [],
      exclude: [],
      extensions: ['.ts'],
    });

    expect(report.summary.warnings).toBeGreaterThan(0);
    expect(report.files[0]?.warnings.length).toBeGreaterThan(0);
  });

  it('handles an empty directory gracefully', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));

    const report = await runMigration(tempDir, {
      targets: ['.'],
      write: false,
      include: [],
      exclude: [],
      extensions: ['.ts'],
    });

    expect(report.summary.filesScanned).toBe(0);
    expect(report.summary.filesChanged).toBe(0);
  });

  it('creates nested report directory if it does not exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'typestyles-migrate-'));
    await writeFile(join(tempDir, 'x.ts'), `const x = 1;\n`, 'utf8');
    const reportPath = join(tempDir, 'deep', 'nested', 'report.json');

    await expect(
      runMigration(tempDir, {
        targets: ['.'],
        write: false,
        include: [],
        exclude: [],
        extensions: ['.ts'],
        reportPath,
      }),
    ).resolves.not.toThrow();

    const content = await readFile(reportPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });
});
