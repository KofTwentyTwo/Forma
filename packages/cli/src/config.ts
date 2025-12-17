/**
 * Config loading and validation
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Config } from '@forma/publisher';

export async function loadConfig(configPath: string): Promise<Config> {
  const content = await readFile(configPath, 'utf-8');

  let parsed: unknown;
  if (configPath.endsWith('.json')) {
    parsed = JSON.parse(content);
  } else {
    parsed = parseYaml(content);
  }

  // TODO: Add schema validation (zod or similar)
  return parsed as Config;
}
