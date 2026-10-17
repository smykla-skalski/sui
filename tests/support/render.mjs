import { afterEach } from 'node:test';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { within } from '@testing-library/dom';

const mounted = new Set();

afterEach(() => {
  for (const component of mounted) unmount(component);
  mounted.clear();
  document.body.innerHTML = '';
});

/** Mounts a component into document.body and returns Testing Library queries scoped to it. */
export function render(Component, props = {}) {
  const target = document.body.appendChild(document.createElement('div'));
  const component = mount(Component, { target, props });
  mounted.add(component);
  flushSync();
  return { component, container: target, ...within(target) };
}

/** Builds a snippet prop from static HTML, e.g. `children: snippet('<strong>Save</strong>')`. */
export function snippet(html) {
  return createRawSnippet(() => ({ render: () => html }));
}

export { flushSync };
