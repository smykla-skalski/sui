import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const script = new URL('../preview/previews.sh', import.meta.url).pathname;

test('installs the piped preview and removes those of closed pull requests', (t) => {
  const data = mkdtempSync(join(tmpdir(), 'sui-previews-'));
  t.after(() => rmSync(data, { recursive: true, force: true }));
  for (const pr of [1, 10, 12]) mkdirSync(join(data, 'previews', `pr-${pr}`), { recursive: true });
  const site = join(data, 'site');
  mkdirSync(site);
  writeFileSync(join(site, 'index.html'), 'pr 3');

  // pr-1 is closed, and must not survive on the strength of 10 being open.
  execFileSync('sh', [script, '3', '3', '10', '12'], {
    input: execFileSync('tar', ['-cz', '-C', site, '.']),
    env: { ...process.env, PREVIEWS_DATA: data }
  });

  assert.deepEqual(readdirSync(join(data, 'previews')).sort(), ['pr-10', 'pr-12', 'pr-3']);
  assert.equal(readFileSync(join(data, 'previews', 'pr-3', 'index.html'), 'utf8'), 'pr 3');
});
