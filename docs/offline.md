# Offline and updates

SUI ships a service worker for SvelteKit apps and the page side that goes with it. The worker installs each build whole, serves it offline, and never lets a new version take over a page on its own: the reader lets it in with Reload ([L-111](laws.md)). It is native code with no dependency, and it does not import SvelteKit, so it takes what SvelteKit gives the worker as arguments.

## Adopt it

1. Add the worker. SvelteKit builds `src/service-worker/index.ts` and serves it as `service-worker.js` at the app's base:

   ```ts
   import { dev, version } from '$app/env';
   import { assets, immutable, prerendered } from '$app/manifest';
   import { self } from '$app/service-worker';
   import { serve } from '@smykla-skalski/sui/service-worker';

   serve(self, { dev, version, immutable, assets, prerendered, never: [/^api\//] });
   ```

   Give the folder its own `tsconfig.json` that extends `$app/tsconfig/service-worker`, and add `src/service-worker` to the `exclude` of the root `tsconfig.json`, as the [SvelteKit docs](https://svelte.dev/docs/kit/service-workers#Type-safety) ask.

2. Turn off SvelteKit's own registration, which also registers on the dev server, in the `sveltekit()` options of `vite.config.ts`:

   ```ts
   serviceWorker: {
     register: false;
   }
   ```

3. Register the worker and draw its state once, in the root layout:

   ```svelte
   <script lang="ts">
     import { dev } from '$app/env';
     import { resolve } from '$app/paths';
     import { ServiceWorkerStatus, registerServiceWorker } from '@smykla-skalski/sui';

     let { children } = $props();
     const worker = registerServiceWorker(`${resolve('/')}service-worker.js`, { dev });
   </script>

   {@render children()}
   <ServiceWorkerStatus {worker} />
   ```

   `registerServiceWorker` registers after the page has loaded, as SvelteKit does, and registers nothing during server rendering or on the dev server. `worker.offline` and `worker.waiting` are reactive, so the app can show them anywhere else too, such as an Offline pill in its bar.

If the app's `package.json` has a `sideEffects` field, it must also list `./.svelte-kit/generated/**/env/service-worker.js`. SvelteKit sets the worker's `version` in that module through an import with no bindings, and a `sideEffects` list without it lets the bundler drop the import. `serve()` then has no version and refuses to install, so the old worker keeps serving.

## Options

- `never`: paths, relative to the base, that no cache ever answers or keeps, such as API calls, sign-in, sign-out and exports. They are never installed either.
- `pages`: paths, relative to the base, whose navigations are the app's own pages. Every path by default. Other navigations go to the network as they are.
- `fallback`: a page, relative to the base, that answers one of the app's navigations when neither the network nor an installed page can. A static app points it at an offline page it prerenders; a single-page app points it at its shell, such as `''` for the shell at the base, and the shell then draws the route offline.

## What each request gets

| Request                                                  | Answer                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A file of the build, a static file or a prerendered page | The installed copy, and the network only when the copy is gone. A `Range` request gets the bytes it asks for from the copy.                                                                                                       |
| A navigation to one of `pages`                           | The network first, through navigation preload. After 3 seconds, or when the network fails, the installed page for that path, then `fallback`, then the browser's own offline page.                                                |
| Another file a page embeds, such as an image             | The runtime copy at once while the network refreshes it (stale-while-revalidate), or the network when there is none.                                                                                                              |
| Anything else                                            | The network, untouched: other methods, other origins, `never` paths, navigations outside `pages`, data the page fetches with `fetch()`, partial requests for files that were not installed, and requests that ask to skip caches. |

Only a whole `200` answer from the same origin is kept, and never one marked `Cache-Control: no-store` or `Vary: *`; a `206`, an error and an opaque answer never are. The runtime cache keeps its 100 most recently written entries. A full storage quota fails only the write: the page still gets the network's answer, and a version whose files cannot all be kept fails to install while the old version keeps serving.

## Versions and consent

Each build's caches are named after its scope and its version, so two apps under one host never touch each other's caches, as PR previews under a main deployment do. Install fetches and validates every file before it keeps any, so a version is installed whole or not at all; any required response that cannot be stored rejects the install. The hashed build files may come from the HTTP cache, since their names change with their bytes; every other file is revalidated with the server, so a stale copy never enters a new version.

The new worker then waits. `ServiceWorkerStatus` says "A new version is ready" with Later and Reload. While it waits, the old worker answers navigations from its own installed pages and fallback rather than fetching the new deploy's HTML; a page it has neither for still comes from the network. Reload posts `{ type: 'skip-waiting' }` to the waiting worker, and the page reloads once, when the new version takes control. Only then does the new version enable navigation preload, delete its scope's older caches and take control of the open pages. A browser reload alone does not let it in, because the old and new page overlap. Another open page that the new version takes over keeps offering Reload, since it still runs the old version's code, even if its controller changed before it finished loading. The browser checks for a new worker on every full navigation; the page also checks each time it becomes visible again, because SvelteKit's client-side navigations do not.

## Offline state

`worker.offline` is true while the device has no network or the worker's last fetch could not reach the server, which also catches a network that is connected but answers nothing. The worker tells its pages each time the network stops or starts answering. The page also checks when it starts, because a cached navigation can finish before its message listener exists, and a page that lost the network asks again every 15 seconds. These checks request a worker update, which only the network can answer; an update that fails is followed by a `HEAD` request for the worker's script, so a server that answers with an error or a broken script never reads as a lost network. The browser's `online` event starts a check too; by itself it does not say the server answered. `ServiceWorkerStatus` says "You are offline" until the network answers, and "You are back online" for five seconds after. Each is announced politely once.

## Server headers

- Hashed build files (`_app/immutable/`): `Cache-Control: public, max-age=31536000, immutable`, so a new version installs only the files that changed.
- Pages, `service-worker.js`, `_app/version.json` and static files: `Cache-Control: no-cache`, so the browser revalidates them and a new deploy is seen at once. Keep `no-store` for private answers only, and off every file the worker installs: one installed file marked `no-store` stops its whole version from installing. A page marked `no-store` also leaves the back-forward cache.
- Navigation preload sends `Service-Worker-Navigation-Preload: true` with each navigation. A server that answers it differently also sends `Vary: Service-Worker-Navigation-Preload`.
- The worker controls its own directory and below. Serve it from the base, and send `Service-Worker-Allowed` only if it must control a wider path.

## Development

The dev server never runs a build's caches. `registerServiceWorker` registers nothing when `dev` is true, and removes a registration that a build served earlier from the same address left behind. If such a worker still controls a page, the dev server's worker replaces it at once, deletes its caches and unregisters, with no fetch handler, so every request reaches the dev server.

`tests/browser/offline.test.mjs` builds the kitchen sink twice and serves each build with `vite preview`, then checks that the first visit installs every file, that an offline reload draws the page in its own faces, that nothing refused is kept, and that the second build waits until Reload. It runs with `npm run test:browser:long`.
