import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { byteRange, cacheNames, choose, storable } from '../src/lib/service-worker/strategy.ts';

// Node strips types but does not apply the bundler's `.js` to `.ts` source resolution.
registerHooks({
  resolve: (specifier, context, next) =>
    next(
      specifier === './strategy.js' && context.parentURL?.endsWith('/service-worker/index.ts')
        ? './strategy.ts'
        : specifier,
      context
    )
});
const { serve } = await import('../src/lib/service-worker/index.ts');

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

test('global and sticky path rules match from the start without changing lastIndex', () => {
  const pages = /^page/g;
  pages.lastIndex = 2;
  const local = { ...rules, never: [], pages: [pages] };
  for (let i = 0; i < 2; i++) {
    assert.equal(
      choose(
        {
          url: `${base}page`,
          method: 'GET',
          mode: 'navigate',
          destination: 'document',
          cache: 'default',
          range: false
        },
        local
      ),
      'navigate'
    );
    assert.equal(pages.lastIndex, 2);
  }

  const never = /^api\//y;
  never.lastIndex = 4;
  for (let i = 0; i < 2; i++) {
    assert.equal(
      choose(
        {
          url: `${base}api/me`,
          method: 'GET',
          mode: 'no-cors',
          destination: 'image',
          cache: 'default',
          range: false
        },
        { ...rules, never: [never] }
      ),
      'pass'
    );
    assert.equal(never.lastIndex, 4);
  }
});

/**
 * A response with the fields install validation and Cache.put use.
 * @param {number} status
 * @param {Record<string, string>} [headers]
 */
const required = (status, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  type: 'basic',
  headers: new Headers(headers),
  redirected: false
});

/** @param {(request: Request) => ReturnType<typeof required>} answer */
function installHarness(answer) {
  /** @type {Record<string, (event: any) => void>} */
  const listeners = {};
  /** @type {{ fetched: string[]; opened: number; written: string[] }} */
  const state = { fetched: [], opened: 0, written: [] };
  const self = /** @type {import('../src/lib/service-worker/index.ts').ServiceWorkerScope} */ (
    /** @type {unknown} */ ({
      location: { href: `${base}service-worker.js` },
      registration: { scope: base, waiting: null, unregister: async () => true },
      caches: {
        has: async () => false,
        open: async () => {
          state.opened++;
          return {
            put: async (/** @type {string} */ url) => {
              state.written.push(url);
            }
          };
        },
        delete: async () => true
      },
      clients: {
        claim: async () => {},
        matchAll: async () => []
      },
      fetch: async (/** @type {Request} */ request) => {
        state.fetched.push(request.url);
        return answer(request);
      },
      skipWaiting: async () => {},
      addEventListener: (
        /** @type {string} */ type,
        /** @type {(event: any) => void} */ listener
      ) => {
        listeners[type] = listener;
      }
    })
  );
  return { listeners, self, state };
}

/** @param {ReturnType<typeof installHarness>} harness */
async function install(harness) {
  /** @type {Promise<void> | undefined} */
  let work;
  harness.listeners.install({
    waitUntil: (/** @type {Promise<void>} */ promise) => (work = promise)
  });
  assert.ok(work);
  await work;
}

test('install path filtering is stateless with a global RegExp', async () => {
  const never = /^never\//g;
  const harness = installHarness(() => required(200));
  serve(harness.self, {
    version: '1',
    immutable: [],
    assets: [{ path: 'never/a' }, { path: 'never/b' }, { path: 'kept' }],
    prerendered: [],
    never: [never]
  });
  await install(harness);
  assert.deepEqual(harness.state.fetched, [`${base}kept`]);
  assert.deepEqual(harness.state.written, [`${base}kept`]);
  assert.equal(never.lastIndex, 0);
});

test('an unstoreable required response rejects the whole install before any cache write', async () => {
  for (const response of [
    required(200, { 'cache-control': 'no-store' }),
    required(204),
    required(206)
  ]) {
    const harness = installHarness((request) =>
      new URL(request.url).pathname.endsWith('/bad') ? response : required(200)
    );
    serve(harness.self, {
      version: '1',
      immutable: [],
      assets: [{ path: 'good' }, { path: 'bad' }],
      prerendered: []
    });
    await assert.rejects(install(harness), TypeError);
    assert.equal(harness.state.opened, 0);
    assert.deepEqual(harness.state.written, []);
  }
});

/**
 * @param {unknown} waiting
 * @param {(request: Request) => Promise<Response>} fetch
 * @param {boolean} [kept] whether the page is in the install
 */
async function navigate(waiting, fetch, kept = true) {
  /** @type {Record<string, (event: any) => void>} */
  const listeners = {};
  /** @type {Promise<unknown>[]} */
  const lifetime = [];
  const self = /** @type {import('../src/lib/service-worker/index.ts').ServiceWorkerScope} */ (
    /** @type {unknown} */ ({
      location: { href: `${base}service-worker.js` },
      registration: { scope: base, waiting, unregister: async () => true },
      caches: { match: async () => (kept ? new Response('installed') : undefined) },
      clients: { claim: async () => {}, matchAll: async () => [] },
      fetch,
      skipWaiting: async () => {},
      addEventListener: (
        /** @type {string} */ type,
        /** @type {(event: any) => void} */ listener
      ) => {
        listeners[type] = listener;
      }
    })
  );
  serve(self, { version: '1', immutable: [], assets: [], prerendered: [{ path: '' }] });
  /** @type {Promise<Response> | undefined} */
  let answered;
  listeners.fetch({
    request: {
      url: base,
      method: 'GET',
      mode: 'navigate',
      destination: 'document',
      cache: 'default',
      headers: new Headers()
    },
    preloadResponse: Promise.resolve(undefined),
    waitUntil: (/** @type {Promise<unknown>} */ work) => lifetime.push(work),
    respondWith: (/** @type {Promise<Response>} */ response) => (answered = response)
  });
  assert.ok(answered);
  const response = await answered;
  await Promise.all(lifetime);
  return response.text();
}

test('a waiting update pins navigation to the install; otherwise it stays network first', async () => {
  assert.equal(await navigate(null, async () => new Response('network')), 'network');
  assert.equal(
    await navigate({}, async () => {
      assert.fail('a waiting update allowed the navigation to reach the network');
    }),
    'installed'
  );
  assert.equal(
    await navigate(null, async () => {
      throw new TypeError('offline');
    }),
    'installed'
  );
  // A page the old version never installed, such as a server-rendered one, is no error.
  assert.equal(await navigate({}, async () => new Response('network'), false), 'network');
});
