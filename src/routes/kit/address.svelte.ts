import { afterNavigate, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { onMount } from 'svelte';

/**
 * A demo's choice kept in the address, so a shared link or a refresh shows it again. A
 * prerendered page has no query to read, so the address counts only once the page runs, and
 * the server and the first frame draw the fallback. Call it while a component initializes.
 */
export function addressed(key: string, fallback: string) {
  let running = $state(false);
  let chosen = $state<string | null>(null);
  let pending = 0;
  onMount(() => {
    running = true;
    return () => clearTimeout(pending);
  });
  // A link to this page with another query is a new address, which wins over the last choice.
  // The choice's own write is shallow and starts no navigation.
  afterNavigate(() => {
    chosen = null;
    clearTimeout(pending);
  });
  return {
    get value(): string {
      return chosen ?? ((running && page.url.searchParams.get(key)) || fallback);
    },
    set value(next: string) {
      chosen = next;
      // A browser limits how often a page rewrites its address (Safari throws past 100 in 10
      // seconds), so a run of keystrokes writes it once, after a pause.
      clearTimeout(pending);
      pending = window.setTimeout(() => {
        // `page.url` keeps the address the page loaded at, so another choice written since is
        // read from the window's own.
        const url = new URL(location.href);
        if (next === fallback) url.searchParams.delete(key);
        else url.searchParams.set(key, next);
        replaceState(url, page.state);
      }, 300);
    }
  };
}
