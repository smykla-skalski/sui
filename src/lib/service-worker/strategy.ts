/**
 * How the worker answers one request:
 *
 * - `pass`: the browser fetches it as if no worker were there, so nothing is cached
 * - `network`: a navigation that is not the app's own page, answered by its navigation preload
 *   or the network, so the preload is never thrown away
 * - `precache`: a file this version installed, answered from the version's cache
 * - `navigate`: the app's own page, network first, then the installed copy, then the fallback
 * - `revalidate`: another file the page embeds, answered from the runtime cache while the network
 *   refreshes it, as HTTP's stale-while-revalidate does
 */
export type Strategy = 'pass' | 'network' | 'precache' | 'navigate' | 'revalidate';

/** The message a page posts to the waiting worker once the reader agrees to the new version. */
export const SKIP_WAITING = 'skip-waiting';

/** The message the worker posts to its pages, with `online`, when the network starts or stops answering. */
export const NETWORK = 'network';

/** The parts of a request that decide its strategy. */
export type Asked = {
  url: string;
  method: string;
  mode: string;
  destination: string;
  cache: string;
  range: boolean;
};

export type Rules = {
  /** The app's base, the directory the worker script is served from, ending in `/`. */
  base: string;
  /** Every address this version installed, without its fragment. */
  precached: ReadonlySet<string>;
  /** Paths relative to the base that no cache ever answers or keeps. */
  never: readonly RegExp[];
  /** Paths relative to the base whose navigations are the app's own pages. */
  pages: readonly RegExp[];
};

/** The path of `url` relative to `base`, with its query, or null when it is outside the app. */
export function relative(url: string, base: string): string | null {
  const address = new URL(url);
  address.hash = '';
  return address.href.startsWith(base) ? address.href.slice(base.length) : null;
}

/** Tests from the expression's start without changing the expression the caller gave. */
export function matches(pattern: RegExp, path: string): boolean {
  return new RegExp(pattern.source, pattern.flags).test(path);
}

export function choose(asked: Asked, rules: Rules): Strategy {
  const navigation = asked.mode === 'navigate';
  if (asked.method !== 'GET') return 'pass';
  const path = relative(asked.url, rules.base);
  if (path === null || rules.never.some((pattern) => matches(pattern, path)))
    return navigation ? 'network' : 'pass';
  if (navigation)
    return rules.pages.some((pattern) => matches(pattern, path)) ? 'navigate' : 'network';
  const address = new URL(asked.url);
  address.hash = '';
  if (rules.precached.has(address.href)) return 'precache';
  // A partial request is the network's to answer, and the page that asks to skip caches, or
  // fetches data rather than embedding a file, gets the network's answer and nothing older.
  if (asked.range || asked.destination === '') return 'pass';
  if (asked.cache === 'no-store' || asked.cache === 'reload' || asked.cache === 'no-cache')
    return 'pass';
  return 'revalidate';
}

/**
 * Whether a response may be kept: a whole, successful, same-origin answer that its server lets
 * a cache store. `Cache.put` refuses a partial or a `Vary: *` answer outright.
 */
export function storable(response: Pick<Response, 'status' | 'type' | 'headers'>): boolean {
  const control = response.headers.get('cache-control') ?? '';
  return (
    response.status === 200 &&
    response.type === 'basic' &&
    !/(?:^|,)\s*no-store\s*(?:,|$)/i.test(control) &&
    response.headers.get('vary')?.trim() !== '*'
  );
}

/**
 * The bytes a `Range` header asks for out of `size`, as RFC 9110 reads one: undefined when the
 * header asks for nothing a server must honour, so the whole body answers, and null when the
 * range starts past the end, which is a 416.
 */
export function byteRange(
  header: string,
  size: number
): { start: number; end: number } | null | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return undefined;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    return suffix === 0 || size === 0 ? null : { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const last = match[2] === '' ? Infinity : Number(match[2]);
  if (last < start) return undefined;
  return start >= size ? null : { start, end: Math.min(last, size - 1) };
}

/**
 * The caches of one registration and one version. Caches belong to the origin, which apps under
 * other paths of the same host share, so each name carries the worker's scope and a worker only
 * ever deletes names under its own prefix.
 */
export function cacheNames(scope: string, version: string) {
  const prefix = `sui:${encodeURIComponent(scope)}:`;
  return {
    prefix,
    precache: `${prefix}precache:${version}`,
    runtime: `${prefix}runtime:${version}`
  };
}
