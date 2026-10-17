export type ToastTone = 'neutral' | 'danger';

export type ToastOptions = {
  title: string;
  /** Adds to the title and never repeats it. */
  description?: string;
  /** `danger` reports a failure and stays until it is dismissed. */
  tone?: ToastTone;
  /** One way back or forward, such as Undo. Running it dismisses the toast. */
  action?: { label: string; run: () => void };
  /** Keeps a neutral toast until it is dismissed, for unsaved work. */
  sticky?: boolean;
};

export type Toast = ToastOptions & { id: number; tone: ToastTone };

let last = 0;

/** What `Toaster` draws, oldest first. */
export const toasts = $state<Toast[]>([]);

/** Shows a toast in the page's `Toaster` and returns its id for `dismiss`. */
export function toast(options: ToastOptions): number {
  const id = ++last;
  toasts.push({ ...options, tone: options.tone ?? 'neutral', id });
  return id;
}

export function dismiss(id: number): void {
  const index = toasts.findIndex((item) => item.id === id);
  if (index !== -1) toasts.splice(index, 1);
}
