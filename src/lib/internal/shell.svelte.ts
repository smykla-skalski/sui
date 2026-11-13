import { getContext, setContext, type Snippet } from 'svelte';
import { tabStops } from './focus.js';

/** `drawer` is a phone, `collapsed` the labelled icon strip on a wide screen, `full` everything else. */
export type ShellMode = 'full' | 'collapsed' | 'drawer';

export type ShellState = {
  readonly mode: ShellMode;
  readonly collapsed: boolean;
  /** The shell is wide enough to fold its sidebar into the strip. */
  readonly foldable: boolean;
  /** On a phone the rail's places stand in a bar along the bottom instead of in the drawer. */
  readonly bottomNav: boolean;
  toggleCollapsed(): void;
  closeDrawer(): void;
};

const key = Symbol('sui-shell');
const pagesKey = Symbol('sui-shell-pages');

export function setShell(state: ShellState): void {
  setContext(key, state);
}

/** The shell around a navigation component, or nothing when it stands on its own. */
export function getShell(): ShellState | undefined {
  return getContext<ShellState | undefined>(key);
}

/**
 * Hands the shell's pages to the rail beside them, which draws them between its places and its
 * foot, so the folded strip and the rail are one column whose Tab order is its visual order.
 */
export function setRailPages(pages: Snippet): void {
  setContext(pagesKey, pages);
}

export function getRailPages(): Snippet | undefined {
  return getContext<Snippet | undefined>(pagesKey);
}

/**
 * A press that follows a link in place: the primary button with no modifier, which a new tab
 * or window never is. Navigation inside the drawer closes it only for this press.
 */
export function followsInPlace(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Keeps Tab and Shift+Tab inside `container`, for a layer that acts as a modal. */
export function trapTab(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const stops = tabStops(container);
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

export function firstStop(container: HTMLElement): HTMLElement | undefined {
  return tabStops(container)[0];
}
