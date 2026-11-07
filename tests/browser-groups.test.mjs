import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { argumentsFor, groups, jobCount } from './browser/run.mjs';

test('CI runs every browser file in exactly one group', () => {
  const files = globSync('tests/browser/**/*.test.mjs').sort();
  assert.deepEqual(Object.values(groups).sort(), files);
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

test('a local run takes SUI_JOBS only as a whole number from 1, so no group is left unrun', () => {
  assert.equal(jobCount(undefined, 12), 4);
  assert.equal(jobCount('', 2), 1);
  assert.equal(jobCount('3', 12), 3);
  for (const asked of ['0', '-1', '0.5', 'two'])
    assert.throws(() => jobCount(asked, 12), /SUI_JOBS/, `SUI_JOBS=${asked} was taken`);
});
