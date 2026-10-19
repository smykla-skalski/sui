import { createSubscriber } from 'svelte/reactivity';

export type Theme = 'light' | 'dark';

const SYSTEM_DARK = '(prefers-color-scheme: dark)';

/* One watcher serves every layer: it starts with the first reader and stops with the last,
   and wakes them all when a theme is chosen anywhere on the page or the system's changes. */
const subscribe = createSubscriber((update) => {
  const observer = new MutationObserver(() => update());
  observer.observe(document.documentElement, {
    attributeFilter: ['data-sui-theme', 'data-theme'],
    subtree: true
  });
  const system = matchMedia(SYSTEM_DARK);
  system.addEventListener('change', update);
  return () => {
    observer.disconnect();
    system.removeEventListener('change', update);
  };
});

/**
 * The theme the page wears at `place`: its nearest themed ancestor's, else the page's, else the
 * reader's system preference. A layer the library draws in the top layer is a surface of its own,
 * so it names this theme in its own `data-sui-theme`: the whole palette applies to it again, and a
 * tone an ancestor restates, such as a changed setting row's gold, stops at the layer, while a
 * subtree themed on purpose keeps its theme in its layers. Undefined until `place` is in the page.
 */
export function themeAt(place: Element | null | undefined): Theme | undefined {
  if (!place?.isConnected) return undefined;
  subscribe();
  const chosen =
    place.closest('[data-sui-theme]')?.getAttribute('data-sui-theme') ??
    document.documentElement.getAttribute('data-theme');
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light';
}
