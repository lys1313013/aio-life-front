// @vitest-environment node

import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
let fixture: string;
let script: string;
let output: string;
function configure(config: unknown) {
  writeFileSync(
    join(fixture, 'scripts/icons/local-icons.config.json'),
    JSON.stringify(config),
  );
}

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'aio-local-icons-'));
  mkdirSync(join(fixture, 'scripts/icons'), { recursive: true });
  symlinkSync(resolve(root, 'node_modules'), join(fixture, 'node_modules'));
  script = join(fixture, 'scripts/icons/generate.mjs');
  copyFileSync(resolve(root, 'scripts/icons/generate.mjs'), script);
  output = join(fixture, 'packages/@core/base/icons/src/local-icons/generated');
});
afterEach(() => rmSync(fixture, { recursive: true, force: true }));

it('adds a new whole collection and resolves selected aliases without manual resource edits', () => {
  configure({
    collections: ['tabler'],
    icons: ['lucide:code-2', 'mdi:run', 'mdi:run'],
  });
  execFileSync(process.execPath, [script]);
  const manifest = JSON.parse(
    readFileSync(join(output, 'manifest.json'), 'utf8'),
  );
  expect(
    manifest.collections.map((item: { prefix: string }) => item.prefix),
  ).toEqual(['tabler']);
  expect(manifest.icons).toEqual(['lucide:code-2', 'mdi:run']);
  const base = JSON.parse(readFileSync(join(output, 'base.json'), 'utf8'));
  const lucide = base.find(
    (item: { prefix: string }) => item.prefix === 'lucide',
  );
  expect(lucide.icons[lucide.aliases['code-2'].parent].body).toBeTruthy();
  expect(readFileSync(join(output, 'loaders.ts'), 'utf8')).toContain(
    "import('./tabler.json')",
  );
  execFileSync(process.execPath, [script, '--check']);
  writeFileSync(join(output, 'base.json'), '[]');
  expect(spawnSync(process.execPath, [script, '--check']).status).toBe(1);
});

it('rejects unknown icons before overwriting existing resources', () => {
  configure({ collections: [], icons: ['mdi:run'] });
  execFileSync(process.execPath, [script]);
  const before = readFileSync(join(output, 'base.json'), 'utf8');
  configure({ collections: [], icons: ['mdi:aio-does-not-exist'] });
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Unknown icon: mdi:aio-does-not-exist');
  expect(readFileSync(join(output, 'base.json'), 'utf8')).toBe(before);
});
