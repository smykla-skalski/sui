import { createSubscriber } from 'svelte/reactivity';

let current = 16;

const subscribe = createSubscriber((update) => {
  // A box one rem wide resizes whenever the root's text size does, as when a reader sets a
  // larger default or zooms only text, so a ResizeObserver hears every change.
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position: absolute; inset: 0 auto auto 0; inline-size: 1rem; block-size: 0; overflow: hidden; visibility: hidden; pointer-events: none';
  document.body.append(probe);
  const read = () => {
    current = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  };
  read();
  const observer = new ResizeObserver(() => {
    read();
    update();
  });
  // The first read often comes from inside another observer's report, as a shell's width
  // does, and a box nearer the root observed there is one the browser must hold back and
  // report as a loop, so the probe is observed from the next frame.
  const frame = requestAnimationFrame(() => observer.observe(probe));
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    probe.remove();
  };
});

/**
 * The root's text size in CSS pixels, kept current while anything reads it inside an effect or
 * a template; every reader shares one probe. A server render reads the 16px default.
 */
export function rootFontSize(): number {
  if (typeof document === 'undefined') return 16;
  subscribe();
  return current;
}
