import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { brief, long, startSink, visit } from './sink.mjs';

const root = process.cwd();
const vite = join(root, 'node_modules/vite/bin/vite.js');

/**
 * Says whether an asynchronous check in the page holds within `timeout`. `waitForFunction` reads
 * the promise an async check returns as a value that holds at once, so the page is asked again
 * until the check holds; a page that is reloading between two asks is asked again too.
 * @param {import('playwright-core').Page} page
 * @param {(arg: any) => Promise<boolean>} check
 * @param {unknown} arg
 * @param {number} timeout
 */
async function holds(page, check, arg, timeout) {
  for (const end = Date.now() + timeout; Date.now() < end;) {
    if (await page.evaluate(check, arg).catch(() => false)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

test('a dev page never runs a build’s caches: it registers no worker, and one left behind leaves', async (t) => {
  const { server, browser, url } = await startSink({ dev: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });
  const page = await browser.newPage();
  // The dev worker takes itself away as soon as it runs, so the page's asking is what is counted.
  await page.addInitScript(() => {
    const register = ServiceWorkerContainer.prototype.register;
    ServiceWorkerContainer.prototype.register = function (
      /** @type {Parameters<ServiceWorkerContainer['register']>} */ ...asked
    ) {
      Object.assign(window, { registered: true });
      return register.apply(this, asked);
    };
  });
  await visit(page, url);
  await page.waitForFunction(() => document.readyState === 'complete');
  assert.equal(
    await holds(page, async () => 'registered' in window, null, brief.timeout),
    false,
    'the dev page registered a service worker'
  );

  // A build served on the same address earlier left its worker and caches; the browser's next
  // update check fetches the dev server's worker, which deletes them and unregisters.
  await page.evaluate(async () => {
    const scope = encodeURIComponent(new URL('/', location.href).href);
    await (await caches.open(`sui:${scope}:precache:left`)).put('/left', new Response('left'));
    await navigator.serviceWorker.register('/service-worker.js', { type: 'module' });
  });
  assert.equal(
    await holds(
      page,
      async () =>
        (await navigator.serviceWorker.getRegistrations()).length === 0 &&
        (await caches.keys()).length === 0,
      null,
      10_000
    ),
    true,
    'the dev server’s worker kept the registration or the caches'
  );
});

/*
 * The preview server of each build also answers a few files that no build holds, one for each
 * kind of answer a cache must keep or refuse.
 */
const FIXTURE = `import sink from './vite.config.ts';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
const answers = {
  '/fixture/kept.svg': [200, {}],
  '/fixture/missing.svg': [404, {}],
  '/fixture/failed.svg': [500, {}],
  '/fixture/private.svg': [200, { 'cache-control': 'private, no-store' }],
  '/fixture/partial.svg': [206, { 'content-range': 'bytes 0-' + (svg.length - 1) + '/' + svg.length }],
  '/fixture/never/kept.svg': [200, {}]
};

export default {
  ...sink,
  plugins: [
    ...sink.plugins,
    {
      name: 'offline-fixture',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const answer = answers[new URL(request.url, 'http://fixture').pathname];
          if (!answer) return next();
          response.writeHead(answer[0], { 'content-type': 'image/svg+xml', ...answer[1] });
          response.end(svg);
        });
      }
    }
  ]
};
`;

/**
 * Builds the sink in a copy of its own, so the build touches neither the checkout's `.svelte-kit`
 * nor a dev server reading it. The copy's worker keeps one `never` pattern for the fixture, its
 * static files hold one under that pattern, and its page carries `build`, so a test can tell
 * which build drew it. The copy is removed with the test's other leftovers, even when it fails
 * to build.
 * @param {string} build
 * @param {(() => Promise<void>)[]} cleanup
 */
async function buildSink(build, cleanup) {
  const dir = await mkdtemp(join(tmpdir(), `sui-offline-${build}-`));
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'src'), join(dir, 'src'), { recursive: true });
  for (const file of ['vite.config.ts', 'tsconfig.json', 'package.json'])
    await cp(join(root, file), join(dir, file));
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  await writeFile(join(dir, 'offline.config.ts'), FIXTURE);
  await mkdir(join(dir, 'static/fixture/never'), { recursive: true });
  await writeFile(join(dir, 'static/fixture/never/static.txt'), build);
  /** @param {string} file @param {string} from @param {string} to */
  const edit = async (file, from, to) => {
    const text = await readFile(join(dir, file), 'utf8');
    assert.ok(text.includes(from), `${file} no longer holds ${from}`);
    await writeFile(join(dir, file), text.replace(from, to));
  };
  await edit(
    'src/app.html',
    '<meta charset="utf-8" />',
    `$&<meta name="sui-build" content="${build}" />`
  );
  await edit(
    'src/service-worker/index.ts',
    'never: [/^pr-\\d+\\//]',
    'never: [/^pr-\\d+\\//, /^fixture\\/never\\//]'
  );
  await promisify(execFile)(process.execPath, [vite, 'build', '--config', 'offline.config.ts'], {
    cwd: dir
  });
  const { version } = JSON.parse(await readFile(join(dir, 'build/_app/version.json'), 'utf8'));
  return { dir, version: /** @type {string} */ (version) };
}

/**
 * Every path the build serves to a page: everything but the worker, SvelteKit's version file and
 * the `never` paths.
 */
async function served(/** @type {string} */ dir) {
  const out = join(dir, 'build');
  const files = await readdir(out, { recursive: true, withFileTypes: true });
  return files
    .filter((file) => file.isFile())
    .map((file) => relative(out, join(file.parentPath, file.name)))
    .filter((path) => path !== 'service-worker.js' && path !== '_app/version.json')
    .filter((path) => !path.startsWith('fixture/never/'))
    .map((path) => (path === 'index.html' ? '/' : `/${path}`))
    .sort();
}

const freePort = () =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });

/**
 * Serves a build with `vite preview` until the returned function stops it.
 * @param {string} dir
 * @param {number} port
 */
async function preview(dir, port) {
  const child = spawn(
    process.execPath,
    [
      vite,
      'preview',
      '--config',
      'offline.config.ts',
      '--host',
      '127.0.0.1',
      '--port',
      `${port}`,
      '--strictPort'
    ],
    { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] }
  );
  for await (const chunk of /** @type {import('node:stream').Readable} */ (child.stdout))
    if (String(chunk).includes(`${port}`)) break;
  return async () => {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
  };
}

/**
 * Every cache of the page's origin, by name, with the paths it holds.
 * @param {import('playwright-core').Page} page
 */
const cached = (page) =>
  page.evaluate(async () => {
    /** @type {Record<string, string[]>} */
    const all = {};
    for (const name of await caches.keys())
      all[name] = (await (await caches.open(name)).keys()).map((key) => new URL(key.url).pathname);
    return all;
  });

/**
 * Embeds each path as an image and waits until each has loaded or failed.
 * @param {import('playwright-core').Page} page
 * @param {string[]} paths
 */
const embed = (page, paths) =>
  page.evaluate(
    (paths) =>
      Promise.all(
        paths.map(
          (path) =>
            new Promise((resolve) => {
              const image = new Image();
              image.onload = () => resolve(`${path} loaded`);
              image.onerror = () => resolve(`${path} failed`);
              image.src = path;
            })
        )
      ),
    paths
  );

test(
  'a build installs whole, works offline, and lets a new version in only on Reload',
  { ...long, timeout: 240_000 },
  async (t) => {
    /** @type {(() => Promise<void>)[]} */
    const cleanup = [];
    t.after(async () => {
      for (const step of cleanup.reverse()) await step().catch(() => {});
    });
    const first = await buildSink('first', cleanup);
    const second = await buildSink('second', cleanup);
    assert.notEqual(first.version, second.version);

    const port = /** @type {number} */ (await freePort());
    const origin = `http://127.0.0.1:${port}`;
    let stop = await preview(first.dir, port);
    cleanup.push(() => stop());
    const browser = await chromium.launch({ channel: process.env.SUI_BROWSER_CHANNEL ?? 'chrome' });
    cleanup.push(() => browser.close());
    const context = await browser.newContext();
    const page = await context.newPage();
    // The page's own bar, apart from the section's pictures of it.
    const bar = (/** @type {string} */ name) =>
      page.locator('aside:popover-open').and(page.getByRole('complementary', { name }));
    const names = (/** @type {string} */ version) => {
      const prefix = `sui:${encodeURIComponent(`${origin}/`)}:`;
      return { precache: `${prefix}precache:${version}`, runtime: `${prefix}runtime:${version}` };
    };

    // The first visit installs every file the build serves, and the worker takes the page.
    await page.goto(`${origin}/`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 60_000
    });
    assert.deepEqual(Object.keys(await cached(page)), [names(first.version).precache]);
    assert.deepEqual(
      (await cached(page))[names(first.version).precache].sort(),
      await served(first.dir)
    );

    // A file the page embeds is kept only when its whole, successful answer may be stored, and a
    // `never` path is neither installed, above, nor kept.
    const fixture = ['kept', 'missing', 'failed', 'private', 'partial', 'never/kept'].map(
      (name) => `/fixture/${name}.svg`
    );
    await embed(page, fixture);
    // The worker keeps a copy after it has answered, so the test waits for the one it keeps
    // and then gives the others the same time to arrive.
    const kept = (/** @type {number} */ count) =>
      holds(
        page,
        async ({ name, count }) =>
          (await caches.has(name)) && (await (await caches.open(name)).keys()).length >= count,
        { name: names(first.version).runtime, count },
        brief.timeout
      );
    assert.equal(await kept(1), true);
    assert.equal(await kept(2), false);
    assert.deepEqual((await cached(page))[names(first.version).runtime], ['/fixture/kept.svg']);

    // With the server gone and the device offline, a reload draws the installed page in its own
    // faces and says it is offline, while other methods and refused answers find no network.
    await stop();
    await context.setOffline(true);
    await page.reload();
    assert.equal(await page.locator('meta[name="sui-build"]').getAttribute('content'), 'first');
    assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Kitchen sink');
    const faces = await page.evaluate(async () => {
      await document.fonts.load('16px "SUI Plus Jakarta Sans"', 'Ąą');
      await document.fonts.load('16px "SUI JetBrains Mono"', 'Ąą');
      return [...document.fonts]
        .filter((face) => face.family.includes('SUI'))
        .map((face) => `${face.family} ${face.unicodeRange.slice(0, 11)} ${face.status}`);
    });
    assert.equal(faces.length, 4);
    for (const face of faces) assert.match(face, /loaded$/);
    await bar('You are offline').waitFor({ timeout: 10_000 });
    assert.equal(
      await page.evaluate(() =>
        fetch('/', { method: 'POST' }).then(
          () => 'answered',
          () => 'failed'
        )
      ),
      'failed'
    );
    assert.deepEqual(await embed(page, fixture), [
      '/fixture/kept.svg loaded',
      '/fixture/missing.svg failed',
      '/fixture/failed.svg failed',
      '/fixture/private.svg failed',
      '/fixture/partial.svg failed',
      '/fixture/never/kept.svg failed'
    ]);
    await context.setOffline(false);

    // A new deploy installs beside the old one and waits, and the page stays as it is; even a
    // reload keeps the old worker in control.
    stop = await preview(second.dir, port);
    await page.evaluate(() => {
      Object.assign(window, { untouched: true });
      return navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.update());
    });
    const waits = () =>
      holds(
        page,
        async () =>
          (await navigator.serviceWorker.getRegistration())?.waiting?.state === 'installed',
        null,
        60_000
      );
    assert.equal(await waits(), true);
    const ready = bar('A new version is ready');
    await ready.waitFor();
    assert.equal(await page.evaluate(() => 'untouched' in window), true);
    assert.deepEqual(
      Object.keys(await cached(page)).sort(),
      [
        names(first.version).precache,
        names(second.version).precache,
        names(first.version).runtime
      ].sort()
    );
    await page.reload();
    assert.equal(await waits(), true);
    await ready.waitFor();

    // Reload lets the new version in, the page reloads once it is in control, and the old
    // version's caches are gone.
    await page.evaluate(() => Object.assign(window, { untouched: true }));
    await Promise.all([
      page.waitForEvent('load'),
      ready.getByRole('button', { name: 'Reload' }).click()
    ]);
    assert.equal(await page.evaluate(() => 'untouched' in window), false);
    assert.equal(
      await page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration())?.waiting)
      ),
      false
    );
    assert.deepEqual(Object.keys(await cached(page)).sort(), [names(second.version).precache]);
    assert.equal(await page.locator('meta[name="sui-build"]').getAttribute('content'), 'second');
  }
);
