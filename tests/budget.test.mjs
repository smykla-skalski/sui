import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

// The theme stylesheet holds the first paint and carries the Latin faces inline, so every byte
// in it delays the first frame. Its budget is the size it had when the budget was set, plus a
// little room; a change that needs more raises the number here, on purpose and in review.
const BUDGET = 70 * 1024;

test('the theme stylesheet with its inline faces stays within its gzip budget', () => {
  const css = readFileSync('src/lib/styles.css', 'utf8').replace(
    /url\('\.\/([^?']+)\?inline'\)/g,
    (_, file) =>
      `url(data:font/woff2;base64,${readFileSync(join('src/lib', file)).toString('base64')})`
  );
  const size = gzipSync(css, { level: 9 }).length;
  assert.ok(size <= BUDGET, `${size} bytes gzipped, over the ${BUDGET}-byte budget`);
});
