import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { argumentsFor, groups } from './browser/run.mjs';

test('CI includes every browser file and partitions each file without a gap', () => {
  const files = globSync('tests/browser/**/*.test.mjs').sort();
  assert.deepEqual([...new Set(Object.values(groups).map(({ file }) => file))].sort(), files);
  for (const file of files) {
    const partitions = Object.values(groups).filter((group) => group.file === file);
    const fallback = partitions.filter((group) => !('pattern' in group));
    assert.equal(fallback.length, 1, `${file} needs exactly one fallback group`);
    const patterns = partitions.filter((group) => 'pattern' in group).map((group) => group.pattern);
    if (patterns.length) assert.equal(fallback[0].skip, patterns.join('|'));
    else assert.equal('skip' in fallback[0], false, `${file} excludes tests without another group`);
  }
});

test('the CI matrix includes every group, and an unknown group fails', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const matrix = [...workflow.matchAll(/^          - ([a-z0-9-]+)$/gm)].map((match) => match[1]);
  assert.deepEqual(matrix.sort(), Object.keys(groups).sort());
  assert.throws(() => argumentsFor('missing'), /Unknown browser test group/);
  assert.throws(() => argumentsFor('toString'), /Unknown browser test group/);
});

test('the visual group runs in the Playwright image of playwright-core, as its pictures were recorded', () => {
  const image = /mcr\.microsoft\.com\/playwright:v([0-9.]+)-noble@sha256:[a-f0-9]{64}/;
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8').match(image);
  const recording = readFileSync('.mise.toml', 'utf8').match(image);
  const core = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies['playwright-core'];
  assert.ok(ci && recording, 'CI and the recording task name a pinned Playwright image');
  assert.equal(ci[0], recording[0], 'CI compares pictures recorded in another image');
  assert.equal(ci[1], core, 'the image ships browsers for another playwright-core');
});
