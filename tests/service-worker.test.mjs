import assert from 'node:assert/strict';
import test from 'node:test';
import { byteRange, cacheNames, choose, storable } from '../src/lib/service-worker/strategy.ts';

const base = 'https://example.test/app/';
const rules = {
  base,
  precached: new Set([`${base}_app/immutable/start.Ab12.js`, base, `${base}media/intro.mp4`]),
  never: [/^api\//],
  pages: [/^(?!docs\/)/]
};
/** @param {Partial<import('../src/lib/service-worker/strategy.ts').Asked>} asked */
const ask = (asked) =>
  choose(
    {
      url: `${base}page`,
      method: 'GET',
      mode: 'no-cors',
      destination: 'image',
      cache: 'default',
      range: false,
      ...asked
    },
    rules
  );

test('a request goes to the network untouched unless the app may answer it from a cache', () => {
  assert.equal(ask({ method: 'POST', url: `${base}_app/immutable/start.Ab12.js` }), 'pass');
  assert.equal(ask({ method: 'HEAD' }), 'pass');
  assert.equal(ask({ url: 'https://cdn.example.test/app/logo.svg' }), 'pass');
  assert.equal(ask({ url: 'https://example.test/other/logo.svg' }), 'pass');
  assert.equal(ask({ url: `${base}api/me`, destination: 'image' }), 'pass');
  assert.equal(ask({ url: `${base}data.json`, destination: '' }), 'pass');
  assert.equal(ask({ url: `${base}avatar.png`, range: true }), 'pass');
  for (const cache of ['no-store', 'reload', 'no-cache'])
    assert.equal(ask({ url: `${base}avatar.png`, cache }), 'pass');
  assert.equal(ask({ url: `${base}avatar.png` }), 'revalidate');
});

test('an installed file answers from the install, whole or in part, whatever the page asks', () => {
  assert.equal(
    ask({ url: `${base}_app/immutable/start.Ab12.js#x`, destination: 'script' }),
    'precache'
  );
  assert.equal(
    ask({ url: `${base}media/intro.mp4`, destination: 'video', range: true }),
    'precache'
  );
  assert.equal(ask({ url: `${base}_app/immutable/start.Ab12.js`, cache: 'no-cache' }), 'precache');
  assert.equal(ask({ url: `${base}_app/immutable/start.Ab12.js?v=2` }), 'revalidate');
});

test('only the app’s own navigations fall back, and the rest still use their preload', () => {
  const navigate = { mode: 'navigate', destination: 'document' };
  assert.equal(ask({ ...navigate, url: base }), 'navigate');
  assert.equal(ask({ ...navigate, url: `${base}settings?tab=2` }), 'navigate');
  assert.equal(ask({ ...navigate, url: `${base}docs/start` }), 'network');
  assert.equal(ask({ ...navigate, url: `${base}api/export` }), 'network');
  assert.equal(ask({ ...navigate, url: 'https://example.test/pr-12/' }), 'network');
  assert.equal(ask({ ...navigate, method: 'POST', url: base }), 'pass');
});

test('only a whole, successful, same-origin answer that may be stored is kept', () => {
  /** @param {number} status @param {ResponseType} type @param {Record<string, string>} [headers] */
  const answer = (status, type, headers = {}) => ({ status, type, headers: new Headers(headers) });
  assert.equal(storable(answer(200, 'basic')), true);
  assert.equal(storable(answer(200, 'basic', { 'cache-control': 'public, max-age=60' })), true);
  assert.equal(storable(answer(206, 'basic')), false);
  assert.equal(storable(answer(404, 'basic')), false);
  assert.equal(storable(answer(500, 'basic')), false);
  assert.equal(storable(answer(204, 'basic')), false);
  assert.equal(storable(answer(0, 'opaque')), false);
  assert.equal(storable(answer(200, 'cors')), false);
  assert.equal(storable(answer(200, 'basic', { 'cache-control': 'private, No-Store' })), false);
  assert.equal(storable(answer(200, 'basic', { vary: '*' })), false);
  assert.equal(storable(answer(200, 'basic', { vary: 'accept-encoding' })), true);
});

test('a range reads as RFC 9110 reads it', () => {
  assert.deepEqual(byteRange('bytes=0-99', 1000), { start: 0, end: 99 });
  assert.deepEqual(byteRange('bytes=900-', 1000), { start: 900, end: 999 });
  assert.deepEqual(byteRange('bytes=-100', 1000), { start: 900, end: 999 });
  assert.deepEqual(byteRange('bytes=-5000', 1000), { start: 0, end: 999 });
  assert.deepEqual(byteRange('bytes=990-2000', 1000), { start: 990, end: 999 });
  assert.equal(byteRange('bytes=1000-', 1000), null);
  assert.equal(byteRange('bytes=-0', 1000), null);
  assert.equal(byteRange('bytes=5-1', 1000), undefined);
  assert.equal(byteRange('bytes=0-1,5-9', 1000), undefined);
  assert.equal(byteRange('items=0-1', 1000), undefined);
});

test('each registration names and clears only its own caches', () => {
  const root = cacheNames('https://example.test/', '1');
  const preview = cacheNames('https://example.test/pr-12/', '1');
  assert.notEqual(root.precache, preview.precache);
  assert.equal(preview.precache.startsWith(root.prefix), false);
  assert.equal(root.precache.startsWith(preview.prefix), false);
  const next = cacheNames('https://example.test/', '2');
  assert.equal(next.prefix, root.prefix);
  assert.notEqual(next.precache, root.precache);
  assert.notEqual(next.runtime, root.runtime);
});
