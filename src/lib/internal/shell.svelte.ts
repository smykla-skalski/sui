import { getContext, setContext } from 'svelte';

/** `drawer` is a phone, `collapsed` the icon strip on a wide screen, `full` everything else. */
export type ShellMode = 'full' | 'collapsed' | 'drawer';

export type ShellState = {
  readonly mode: ShellMode;
  readonly collapsed: boolean;
  toggleCollapsed(): void;
  closeDrawer(): void;
};

const key = Symbol('sui-shell');

export function setShell(state: ShellState): void {
  setContext(key, state);
}

/** The shell around a navigation component, or nothing when it stands on its own. */
export function getShell(): ShellState | undefined {
  return getContext<ShellState | undefined>(key);
}

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside `container`, for a layer that acts as a modal. */
export function trapTab(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const stops = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]')
  );
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
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].find(
    (element) => element.getClientRects().length > 0
  );
}
