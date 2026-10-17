import { register } from 'node:module';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true
});

// Node ships its own Event classes; components and Testing Library must share jsdom's.
const overrides = new Set(['Event', 'EventTarget', 'CustomEvent']);

for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis) || overrides.has(key)) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      get: () => window[key]
    });
  }
}

register('./svelte-hooks.mjs', import.meta.url);
