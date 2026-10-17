import assert from 'node:assert/strict';
import test from 'node:test';
import { deltaE2000 } from '../src/routes/audit/color.ts';

// Reference pairs from Sharma, Wu and Dalal (2005), the published CIEDE2000 test data.
/** @type {[[number, number, number], [number, number, number], number][]} */
const pairs = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373]
];

test('CIEDE2000 matches the published reference pairs', () => {
  for (const [first, second, expected] of pairs)
    assert.ok(
      Math.abs(deltaE2000(first, second) - expected) < 1e-4,
      `${first} vs ${second}: ${deltaE2000(first, second)} != ${expected}`
    );
});
