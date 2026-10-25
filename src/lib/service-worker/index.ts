import {
  NETWORK,
  SKIP_WAITING,
  byteRange,
  cacheNames,
  choose,
  matches,
  storable
} from './strategy.js';

export { NETWORK, SKIP_WAITING } from './strategy.js';

type Lifetime = { waitUntil(work: Promise<unknown>): void };

type FetchLike = Lifetime & {
  readonly request: Request;
  readonly preloadResponse: Promise<Response | undefined>;
  respondWith(response: Promise<Response>): void;
};

type MessageLike = Lifetime & { readonly data: unknown };

/**
 * What the module uses of the worker's global scope. SvelteKit's `self` from
 * `$app/service-worker` is one, and so is any `ServiceWorkerGlobalScope`.
 */
export type ServiceWorkerScope = {
  readonly location: { readonly href: string };
  readonly registration: {
    readonly scope: string;
    readonly waiting?: unknown;
    readonly navigationPreload?: { enable(): Promise<void> };
    unregister(): Promise<boolean>;
  };
  readonly caches: CacheStorage;
  readonly clients: {
    claim(): Promise<void>;
    matchAll(options: {
      includeUncontrolled: boolean;
      type: 'window';
    }): Promise<readonly { postMessage(message: unknown): void }[]>;
  };
  fetch(request: Request): Promise<Response>;
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: Lifetime) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchLike) => void): void;
  addEventListener(type: 'message', listener: (event: MessageLike) => void): void;
};

export type ServeOptions = {
  /** The build's version, `version` from `$app/env`, which names this build's caches. */
  version: string;
  /** `immutable` from `$app/manifest`: the hashed build files, which never change at one URL. */
  immutable: readonly { path: string }[];
  /** `assets` from `$app/manifest`: the static files. */
  assets: readonly { path: string }[];
  /** `prerendered` from `$app/manifest`: the prerendered pages and endpoints. */
  prerendered: readonly { path: string }[];
  /** `dev` from `$app/env`. The dev server's worker caches nothing and takes itself away. */
  dev?: boolean;
  /**
   * Paths relative to the base that no cache ever answers or keeps, such as API calls, sign-in
   * and exports. They are never installed either.
   */
  never?: readonly RegExp[];
  /** Paths relative to the base whose navigations are the app's own pages. Every path by default. */
  pages?: readonly RegExp[];
  /**
   * A page, relative to the base, that answers one of the app's navigations when neither the
   * network nor the installed pages can: an offline page, or a single-page app's shell.
   */
  fallback?: string;
};

/**
 * Network first, as Workbox's page cache recipe waits: after this long a slow navigation is
 * answered from the installed copy while the network keeps going.
 */
const NAVIGATION_TIMEOUT_MS = 3000;

/** ponytail: oldest-written entries leave first; a byte budget would track sizes per entry. */
const RUNTIME_ENTRIES = 100;

/**
 * Makes the worker serve the app offline and update only with the reader's consent. Call it once
 * from the app's `src/service-worker/index.ts`.
 *
 * Install fetches every build file, static file and prerendered page, and keeps them in a cache
 * named by the version only once all of them have arrived and can be stored, so a version is
 * installed whole or not at all. The new worker then waits: it activates only when the page posts
 * `{ type: 'skip-waiting' }`, which `registerServiceWorker` does when the reader presses Reload,
 * or when no page of the old version is left open. Activation deletes this worker's older
 * caches, enables navigation preload and takes control of the open pages.
 *
 * A request for an installed file is answered from the install. A navigation goes to the network
 * first, through its preload, and falls back to the installed page and then to `fallback`; while
 * a new worker waits, the installed page or fallback answers without the network, and only a page
 * with neither goes to it. Any other file a page embeds is answered from the runtime cache while
 * the network refreshes it. Everything else goes to the network untouched: other methods, other origins,
 * `never` paths, partial requests for files that were not installed, data the page fetches, and
 * requests that ask to skip caches. Nothing partial, failed, opaque or marked `no-store` is kept,
 * and a full storage quota only means the network answers.
 */
export function serve(self: ServiceWorkerScope, options: ServeOptions): void {
  if (options.dev) return retire(self, cacheNames(self.registration.scope, '').prefix);
  // Two builds under one cache name would install into the cache the open pages read, so a
  // worker without its version refuses to install at all, and the old one keeps serving.
  if (!options.version)
    throw new TypeError('serve() needs the build version: $app/env gave none, see docs/offline.md');
  const names = cacheNames(self.registration.scope, options.version);

  const base = new URL('./', self.location.href).href;
  const never = options.never ?? [];
  const pages = options.pages ?? [/(?:)/];
  const address = (path: string) => new URL(path, base).href;
  const fallback = options.fallback === undefined ? undefined : address(options.fallback);
  const hashed = new Set(options.immutable.map((file) => address(file.path)));
  const precached = new Set(
    [...options.immutable, ...options.assets, ...options.prerendered, { path: options.fallback }]
      .map((file) => file.path)
      .filter((path): path is string => path !== undefined)
      .filter((path) => !never.some((pattern) => matches(pattern, path)))
      .map(address)
  );
  const rules = { base, precached, never, pages };
  /* Whether the network answered last, unknown each time the browser starts the worker again,
     so the first answer after a restart is always told. */
  let reachable: boolean | undefined;

  async function report(online: boolean): Promise<void> {
    if (online === reachable) return;
    reachable = online;
    const pages = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const page of pages) page.postMessage({ type: NETWORK, online });
  }

  function network(event: FetchLike, preload?: Promise<Response | undefined>): Promise<Response> {
    const answer = preload
      ? preload.then((response) => response ?? self.fetch(event.request))
      : self.fetch(event.request);
    return answer.then(
      (response) => {
        event.waitUntil(report(true));
        return response;
      },
      (error: unknown) => {
        event.waitUntil(report(false));
        throw error;
      }
    );
  }

  const installed = (url: string, options: CacheQueryOptions = {}) =>
    self.caches.match(url, { ...options, cacheName: names.precache, ignoreVary: true });

  // Every response arrives before the first is kept, so a failed fetch leaves no cache behind,
  // and a version whose files cannot all be kept fails to install while the old one serves on.
  // The build's hashed files may come from the HTTP cache, since their names change with their
  // bytes; every other file is revalidated, so a stale copy never enters a new version.
  async function precache(): Promise<void> {
    const answers = await Promise.all(
      [...precached].map(async (url) => {
        const response = await self.fetch(
          new Request(url, { cache: hashed.has(url) ? 'default' : 'no-cache' })
        );
        if (!response.ok || !storable(response)) throw new TypeError(`${response.status} ${url}`);
        return { url, response };
      })
    );
    const existed = await self.caches.has(names.precache);
    const cache = await self.caches.open(names.precache);
    try {
      await Promise.all(
        answers.map(async ({ url, response }) => cache.put(url, await followed(response)))
      );
    } catch (error) {
      if (!existed) await self.caches.delete(names.precache);
      throw error;
    }
  }

  async function activate(): Promise<void> {
    await Promise.all([
      self.registration.navigationPreload?.enable().catch(() => {}),
      self.caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(names.prefix))
            .filter((key) => key !== names.precache && key !== names.runtime)
            .map((key) => self.caches.delete(key))
        )
      )
    ]);
    await self.clients.claim();
  }

  async function fromInstall(event: FetchLike): Promise<Response> {
    const kept = await installed(event.request.url);
    if (!kept) return network(event);
    const range = event.request.headers.get('range');
    return range === null ? kept : partial(kept, range);
  }

  async function navigate(event: FetchLike): Promise<Response> {
    const copy = () => installed(event.request.url, { ignoreSearch: true });
    const fromThisVersion = async () =>
      (await copy()) ?? (fallback === undefined ? undefined : await installed(fallback));
    // A new deploy's HTML would not match this page's installed files. Until the reader lets the
    // waiting worker in, this version answers even when the network could serve the new deploy;
    // a page it never installed still comes from the network rather than as an error.
    if (self.registration.waiting) {
      const page = await fromThisVersion();
      if (page) return page;
    }
    const answer = network(event, event.preloadResponse);
    // The navigation's own fetch keeps going after a copy has answered, so its preload is never
    // cut off mid-flight.
    event.waitUntil(answer.catch(() => {}));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const slow = new Promise<void>(
      (resolve) => (timer = setTimeout(resolve, NAVIGATION_TIMEOUT_MS))
    );
    try {
      return await Promise.race([answer, slow.then(async () => (await copy()) ?? answer)]);
    } catch {
      return (await fromThisVersion()) ?? Response.error();
    } finally {
      clearTimeout(timer);
    }
  }

  async function revalidate(event: FetchLike): Promise<Response> {
    const kept = await self.caches.match(event.request, { cacheName: names.runtime });
    const fresh = network(event);
    event.waitUntil(
      fresh.then(
        (response) => keep(response.clone()),
        () => {}
      )
    );
    return kept ?? fresh;

    async function keep(response: Response): Promise<void> {
      if (!storable(response)) return;
      try {
        const cache = await self.caches.open(names.runtime);
        await cache.put(event.request, response);
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, -RUNTIME_ENTRIES).map((key) => cache.delete(key)));
      } catch {
        // A full quota keeps nothing more, and the page already has the network's answer.
      }
    }
  }

  self.addEventListener('install', (event) => event.waitUntil(precache()));
  self.addEventListener('activate', (event) => event.waitUntil(activate()));
  self.addEventListener('message', (event) => {
    const data = event.data as { type?: unknown } | null;
    if (data?.type === SKIP_WAITING) event.waitUntil(self.skipWaiting());
  });
  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const strategy = choose(
      {
        url: request.url,
        method: request.method,
        mode: request.mode,
        destination: request.destination,
        cache: request.cache,
        range: request.headers.has('range')
      },
      rules
    );
    if (strategy === 'network') event.respondWith(network(event, event.preloadResponse));
    else if (strategy === 'precache') event.respondWith(fromInstall(event));
    else if (strategy === 'navigate') event.respondWith(navigate(event));
    else if (strategy === 'revalidate') event.respondWith(revalidate(event));
  });
}

/**
 * The dev server serves its worker too, and a worker left from a build on the same address
 * would keep answering from that build. This one replaces it at once, deletes the caches, and
 * unregisters, with no fetch handler, so every request reaches the dev server.
 */
function retire(self: ServiceWorkerScope, prefix: string): void {
  self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
  self.addEventListener('activate', (event) =>
    event.waitUntil(
      (async () => {
        const keys = await self.caches.keys();
        await Promise.all(
          keys.filter((key) => key.startsWith(prefix)).map((key) => self.caches.delete(key))
        );
        await self.registration.unregister();
      })()
    )
  );
}

/**
 * A redirected response may not answer a navigation, whose redirects the browser follows
 * itself, so the copy that is kept is the final answer without the redirect behind it.
 */
async function followed(response: Response): Promise<Response> {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

/** Answers a `Range` request from a whole copy, as a media element asks for its file. */
async function partial(whole: Response, header: string): Promise<Response> {
  const body = await whole.blob();
  const range = byteRange(header, body.size);
  const headers = new Headers(whole.headers);
  if (range === undefined) return new Response(body, { status: whole.status, headers });
  if (range === null) {
    return new Response(null, {
      status: 416,
      headers: { 'content-range': `bytes */${body.size}` }
    });
  }
  const part = body.slice(range.start, range.end + 1);
  headers.set('content-range', `bytes ${range.start}-${range.end}/${body.size}`);
  headers.set('content-length', String(part.size));
  return new Response(part, { status: 206, headers });
}
