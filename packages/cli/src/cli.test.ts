import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { runSnapshot } from './commands/snapshot';

describe('typestyles cli', () => {
  let stdout: string[];
  let stderr: string[];

  beforeEach(() => {
    stdout = [];
    stderr = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('snapshot --help prints command usage', async () => {
    await runSnapshot(['--help']);
    expect(stdout.join('')).toContain('typestyles snapshot');
    expect(stdout.join('')).toContain('--write');
  });
});
