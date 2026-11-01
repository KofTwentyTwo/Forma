import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'forma-config-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('parses a YAML config', async () => {
    const path = join(dir, '.confluence-publish.yml');
    await writeFile(path, 'version: 1\nconfluence:\n  baseUrl: https://example.atlassian.net/wiki\n  spaceKey: DOC\n');

    const config = await loadConfig(path);

    expect(config.version).toBe(1);
    expect(config.confluence.spaceKey).toBe('DOC');
  });

  it('parses a JSON config when the file ends in .json', async () => {
    const path = join(dir, 'config.json');
    await writeFile(path, JSON.stringify({ version: 2, confluence: { baseUrl: 'https://x', spaceKey: 'K' } }));

    const config = await loadConfig(path);

    expect(config.version).toBe(2);
    expect(config.confluence.baseUrl).toBe('https://x');
  });

  it('rejects when the file does not exist', async () => {
    await expect(loadConfig(join(dir, 'missing.yml'))).rejects.toThrow();
  });

  it('rejects malformed JSON instead of returning a partial config', async () => {
    const path = join(dir, 'broken.json');
    await writeFile(path, '{ "version": ');

    await expect(loadConfig(path)).rejects.toThrow();
  });
});
