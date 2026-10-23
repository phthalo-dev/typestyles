import { describe, expect, it } from 'vite-plus/test';
import { decodePlaygroundCode, encodePlaygroundCode, readPlaygroundUrlState } from './urlState';

describe('playground urlState', () => {
  it('round-trips editor source through encode/decode', () => {
    const source = `import { createTypeStyles } from 'typestyles';\nexport default function App() { return null; }`;
    const encoded = encodePlaygroundCode(source);
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded).not.toContain(' ');
    expect(decodePlaygroundCode(encoded)).toBe(source);
  });

  it('returns null for empty or corrupt payloads', () => {
    expect(decodePlaygroundCode(null)).toBeNull();
    expect(decodePlaygroundCode('')).toBeNull();
    expect(decodePlaygroundCode('%%%not-valid%%%')).toBeNull();
  });

  it('parses preset and code from search strings', () => {
    const encoded = encodePlaygroundCode('const x = 1;');
    expect(readPlaygroundUrlState(`?preset=hello-button`)).toEqual({
      code: undefined,
      preset: 'hello-button',
    });
    expect(readPlaygroundUrlState(`?code=${encoded}`)).toEqual({
      code: 'const x = 1;',
      preset: undefined,
    });
  });
});
