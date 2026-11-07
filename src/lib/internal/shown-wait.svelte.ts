/** A wait that ends sooner than this draws no spinner or placeholder at all. */
export const SHOW_AFTER = 150;
/** A spinner or placeholder, once drawn, stays at least this long. */
export const SHOW_FOR = 400;

/**
 * A wait as the reader sees it (L-117): its spinner or placeholder is drawn only once the work
 * has run `SHOW_AFTER`, and then for at least `SHOW_FOR`, so a fast answer never flashes one
 * (Vercel Web Interface Guidelines, React's Suspense). A wait already running when the component
 * first draws shows at once, since nothing changes under the reader. Only the drawing waits: the
 * state the work sets (`aria-busy`, a refused press) follows `waiting` at once.
 */
export function shownWait(waiting: () => boolean): { readonly current: boolean } {
  let shown = $state(waiting());
  let since = shown ? performance.now() : 0;
  $effect(() => {
    const on = waiting();
    if (on === shown) return;
    const left = on ? SHOW_AFTER : SHOW_FOR - (performance.now() - since);
    const settle = () => {
      shown = on;
      if (on) since = performance.now();
    };
    if (left <= 0) {
      settle();
      return;
    }
    const timer = setTimeout(settle, left);
    return () => clearTimeout(timer);
  });
  return {
    get current() {
      return shown;
    }
  };
}
