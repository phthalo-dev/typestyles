import { describe, expect, it } from 'vite-plus/test';
import {
  docContentToAiMarkdown,
  normalizeInstallTabGroupsForAi,
  stripFrontmatterForAi,
} from './aiMarkdown';

describe('stripFrontmatterForAi', () => {
  it('extracts description and body', () => {
    const raw = `---
title: Test
description: A test page
---

Hello world`;
    const { description, body } = stripFrontmatterForAi(raw);
    expect(description).toBe('A test page');
    expect(body.trim()).toBe('Hello world');
  });
});

describe('normalizeInstallTabGroupsForAi', () => {
  it('collapses install tabs to pnpm with npm/yarn as comments', () => {
    const input = `Before

<!-- doc-install-tabs -->

\`\`\`bash
pnpm add typestyles
\`\`\`

\`\`\`bash
npm install typestyles
\`\`\`

\`\`\`bash
yarn add typestyles
\`\`\`

<!-- /doc-install-tabs -->

After`;

    const out = normalizeInstallTabGroupsForAi(input);
    expect(out).toContain('```bash');
    expect(out).toContain('pnpm add typestyles');
    expect(out).toContain('# npm: npm install typestyles');
    expect(out).toContain('# yarn: yarn add typestyles');
    expect(out).not.toContain('doc-install-tabs');
    expect(out).toContain('Before');
    expect(out).toContain('After');
  });
});

describe('docContentToAiMarkdown', () => {
  it('emits title, description, body, and source footer', async () => {
    const raw = `---
title: Page title
description: Lead paragraph
---

Body content here.`;
    const md = await docContentToAiMarkdown(raw, { title: 'Page title', slug: 'test-page' });
    expect(md).toMatch(/^# Page title/);
    expect(md).toContain('Lead paragraph');
    expect(md).toContain('Body content here.');
    expect(md).toContain('Source: https://typestyles.dev/docs/test-page');
    expect(md).not.toContain('---\ntitle:');
  });

  it('replaces known live demo markers with source code', async () => {
    const raw = `---
title: Demo page
---

<!-- doc-live-demo id="getting-started-button" -->`;
    const md = await docContentToAiMarkdown(raw, { title: 'Demo page', slug: 'demo' });
    expect(md).toContain('Interactive demo: https://typestyles.dev/docs/demo');
    expect(md).toContain('```ts');
    expect(md).toContain('createTypeStyles');
    expect(md).not.toContain('doc-live-demo');
  });

  it('fails the build on unknown demo id', async () => {
    const raw = `---
title: Bad demo
---

<!-- doc-live-demo id="does-not-exist" -->`;
    await expect(docContentToAiMarkdown(raw, { title: 'Bad demo', slug: 'bad' })).rejects.toThrow(
      /Unknown live demo id/,
    );
  });
});
