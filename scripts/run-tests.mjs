import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const tests = readdirSync('tests')
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => join('tests', name));

const result = spawnSync(
  process.execPath,
  ['node_modules/tsx/dist/cli.mjs', '--test', ...tests],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
