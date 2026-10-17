import { untrack } from 'svelte';

export type ToastTone = 'neutral' | 'danger';

/** How a toast left: its Dismiss, its clock, its action, or `dismiss()` from code. */
export type ToastEnd = 'dismissed' | 'expired' | 'acted' | 'withdrawn';

export type ToastOptions = {
  title: string;
  /** Adds to the title and never repeats it. */
  description?: string;
  /** `danger` reports a failure and stays until it is dismissed. */
  tone?: ToastTone;
  /** One way back or forward, such as Undo. The toast stays until it runs or is dismissed. */
  action?: { label: string; run: () => void };
  /** Runs once when the toast leaves, with how it left. */
  ondismiss?: (reason: ToastEnd) => void;
};

export type Toast = ToastOptions & {
  id: number;
  tone: ToastTone;
  /** The modal dialog that was topmost when the toast was raised, or null for the page. */
  host: Element | null;
};

let last = 0;

/** What `Toaster` draws, oldest first. */
export const toasts = $state<Toast[]>([]);

/**
 * The words and timing every `Toaster` uses, including the ones each `Modal` draws for itself.
 * The page's `Toaster` sets them from its props, so a dialog's toasts speak the page's language.
 */
export const toaster = $state({
  dismissLabel: 'Dismiss',
  label: 'Notifications',
  linger: 5000,
  hotkey: 'F8'
});

/**
 * Open modal dialogs, topmost last. A modal dialog makes the rest of the page inert, so the
 * `Toaster` inside the topmost one draws the toasts while it is open.
 */
export const hosts = $state<Element[]>([]);

/**
 * Makes `dialog` the topmost host until the returned function runs. It is called from an
 * effect, which must not come to depend on the stack it changes.
 */
export function hostToasts(dialog: Element): () => void {
  untrack(() => hosts.push(dialog));
  return () =>
    untrack(() => {
      const index = hosts.lastIndexOf(dialog);
      if (index !== -1) hosts.splice(index, 1);
    });
}

/** Shows a toast in the page's `Toaster` and returns its id for `dismiss`. */
export function toast(options: ToastOptions): number {
  const id = ++last;
  toasts.push({ ...options, tone: options.tone ?? 'neutral', id, host: hosts.at(-1) ?? null });
  return id;
}

/** Takes a toast back. `reason` is what its `ondismiss` hears, `withdrawn` from code. */
export function dismiss(id: number, reason: ToastEnd = 'withdrawn'): void {
  const index = toasts.findIndex((item) => item.id === id);
  if (index === -1) return;
  const [gone] = toasts.splice(index, 1);
  gone.ondismiss?.(reason);
}
