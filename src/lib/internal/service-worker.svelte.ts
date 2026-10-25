import { NETWORK, SKIP_WAITING } from '../service-worker/strategy.js';

type Worker = {
  readonly state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
};

type Registration = {
  readonly active: Worker | null;
  readonly waiting: Worker | null;
  readonly installing: Worker | null;
  update(): Promise<unknown>;
  unregister(): Promise<boolean>;
  addEventListener(type: 'updatefound', listener: () => void): void;
};

/** What the page uses of `navigator.serviceWorker`, which a demo can stand in for. */
export type ServiceWorkerContainerLike = {
  readonly controller: unknown;
  register(url: string, options: RegistrationOptions): Promise<Registration>;
  getRegistration(scope: string): Promise<Registration | undefined>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
};

export type ServiceWorkerOptions = {
  /**
   * `dev` from `$app/env`. On the dev server nothing registers, and a worker that a build left
   * on the same address is unregistered, so a dev page never runs a build's caches.
   */
  dev?: boolean;
  /** The registration's scope, the worker's own directory by default. */
  scope?: string;
  /** `navigator.serviceWorker` by default. */
  container?: ServiceWorkerContainerLike;
  /** How the page reloads once the new version controls it, `location.reload()` by default. */
  reload?: () => void;
};

/** How long a page that lost the network waits between checks that it is back. */
const PROBE_MS = 15_000;

/**
 * What a page knows of its service worker: whether a new version waits for the reader, and
 * whether the network answers. `ServiceWorkerStatus` draws it, and an app may show `offline`
 * anywhere else too.
 */
class ServiceWorkerState {
  /** A newer version than the page's is installed, and waits until the reader agrees. */
  waiting = $state(false);
  /** The reader agreed; the page reloads once the new version controls it. */
  reloading = $state(false);
  #disconnected = $state(false);
  #unreachable = $state(false);
  /** The device has no network, or the worker's last fetch could not reach it. */
  readonly offline = $derived(this.#disconnected || this.#unreachable);

  #registration: Registration | null = null;
  #script = '';
  #reload: () => void;
  #probe: ReturnType<typeof setTimeout> | undefined;
  #reloaded = false;

  constructor(url: string, options: ServiceWorkerOptions) {
    this.#reload = options.reload ?? (() => location.reload());
    if (typeof window === 'undefined') return;
    this.#watchNetwork();
    const container =
      options.container ?? ('serviceWorker' in navigator ? navigator.serviceWorker : undefined);
    if (!container) return;
    const controller = container.controller;
    const begin = () => void this.#start(container, url, options, controller).catch(() => {});
    if (document.readyState === 'complete') begin();
    else addEventListener('load', begin, { once: true });
  }

  /**
   * Lets the waiting version in and reloads the page under it. When another tab has let it in
   * already, the page only reloads.
   */
  update(): void {
    if (this.reloading) return;
    this.reloading = true;
    const next = this.#registration?.waiting;
    if (!next) return this.#reloadOnce();
    // The page reloads when the new version takes it over, or once that version is active or
    // replaced by a newer one, so a page the new version never takes over is not left busy.
    next.addEventListener('statechange', () => {
      if (next.state === 'activated' || next.state === 'redundant') this.#reloadOnce();
    });
    next.postMessage({ type: SKIP_WAITING });
  }

  #reloadOnce(): void {
    if (this.#reloaded) return;
    this.#reloaded = true;
    this.#reload();
  }

  async #start(
    container: ServiceWorkerContainerLike,
    url: string,
    options: ServiceWorkerOptions,
    initialController: unknown
  ) {
    if (options.dev) {
      const scope = options.scope ?? new URL('./', new URL(url, location.href)).href;
      await (await container.getRegistration(scope))?.unregister();
      return;
    }
    const registration = await container.register(url, { type: 'module', scope: options.scope });
    this.#registration = registration;
    this.#script = url;

    const ready = (worker: Worker) => {
      const settled = () => {
        if (worker.state === 'installed' && registration.active) this.waiting = true;
      };
      worker.addEventListener('statechange', settled);
      settled();
    };
    if (registration.waiting && registration.active) this.waiting = true;
    if (registration.installing) ready(registration.installing);
    registration.addEventListener('updatefound', () => {
      if (registration.installing) ready(registration.installing);
    });

    // The first worker takes control of the page that installed it, which is no new version;
    // any later change of controller is one, whether this page let it in or another tab did.
    // Comparing with the controller captured before `load` also catches a change another tab
    // caused while this page was still loading and had no listener yet.
    let controlled = Boolean(container.controller);
    if (initialController && container.controller !== initialController) this.waiting = true;
    container.addEventListener('controllerchange', () => {
      if (this.reloading) this.#reloadOnce();
      else if (controlled) this.waiting = true;
      controlled = true;
    });
    container.addEventListener('message', ({ data }) => {
      const report = data as { type?: unknown; online?: unknown } | null;
      if (report?.type === NETWORK && typeof report.online === 'boolean')
        this.#reached(report.online);
    });
    void this.#check();
  }

  #watchNetwork(): void {
    this.#disconnected = !navigator.onLine;
    addEventListener('offline', () => (this.#disconnected = true));
    addEventListener('online', () => {
      this.#disconnected = false;
      void this.#check();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.#check();
    });
  }

  // A worker that cannot reach the network says so, but it can only say the network is back
  // when a fetch goes through it, so the page asks again now and then. An update check fetches
  // the worker's script past every cache, so only the network answers it.
  #reached(online: boolean): void {
    this.#unreachable = !online;
    clearTimeout(this.#probe);
    if (!online) this.#probe = setTimeout(() => void this.#check(), PROBE_MS);
  }

  async #check(): Promise<void> {
    if (!this.#registration) return;
    try {
      await this.#registration.update();
      this.#reached(true);
    } catch {
      // An update also fails when the server answers with an error or a broken script, so only
      // a request that gets no answer at all says the network is gone.
      this.#reached(
        await fetch(this.#script, { method: 'HEAD', cache: 'no-store' }).then(
          () => true,
          () => false
        )
      );
    }
  }
}

export type { ServiceWorkerState };

/**
 * Registers the app's service worker once the page has loaded, as SvelteKit's own registration
 * does, and returns its state for `ServiceWorkerStatus`. Call it once, in the root layout. On the
 * server, and in a browser without service workers, it registers nothing, and `offline` still
 * follows the device.
 */
export function registerServiceWorker(
  url: string,
  options: ServiceWorkerOptions = {}
): ServiceWorkerState {
  return new ServiceWorkerState(url, options);
}
