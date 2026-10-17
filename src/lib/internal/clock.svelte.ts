import { createSubscriber } from 'svelte/reactivity';

/* Relative wording changes by the minute at the finest, so half a minute keeps every
   reading within one step of the truth without waking the page more than it must. */
const TICK = 30_000;

let current: number | null = null;

const subscribe = createSubscriber((update) => {
  current = Date.now();
  const timer = setInterval(() => {
    current = Date.now();
    update();
  }, TICK);
  return () => {
    clearInterval(timer);
    current = null;
  };
});

/**
 * The page's one clock, in epoch milliseconds. Every reader inside an effect or a
 * template shares a single timer, which starts with the first reader and stops with
 * the last, so a list of a hundred times agrees on "now" and wakes the page once.
 */
export function pageNow(): number {
  subscribe();
  return current ?? Date.now();
}
