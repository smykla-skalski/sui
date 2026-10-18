<script lang="ts">
  import { word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';

  const titleId = $props.id();

  let {
    dirty,
    saving = false,
    error = null,
    title = word('SaveBar.title', 'You have unsaved changes'),
    subtitle = word('SaveBar.subtitle', 'Save to keep them, or discard to go back'),
    failedTitle = word('SaveBar.failedTitle', 'Your changes were not saved'),
    savedTitle = word('SaveBar.savedTitle', 'Your changes are saved'),
    discardedTitle = word('SaveBar.discardedTitle', 'Your changes were discarded'),
    saveLabel = word('SaveBar.saveLabel', 'Save'),
    savingLabel = word('SaveBar.savingLabel', 'Saving…'),
    discardLabel = word('SaveBar.discardLabel', 'Discard'),
    undoLabel = word('SaveBar.undoLabel', 'Undo'),
    dismissLabel = word('SaveBar.dismissLabel', 'Dismiss'),
    onsave,
    ondiscard,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** Shows the bar. It stays until the work is saved or discarded. */
    dirty: boolean;
    /** Holds both actions while the save runs and says so on the Save button. */
    saving?: boolean;
    /** Why the last save failed. It replaces the subtitle, under `failedTitle`. */
    error?: string | null;
    title?: string;
    subtitle?: string;
    failedTitle?: string;
    /** Said for 5 seconds once a save lands, by the bar on its way out. */
    savedTitle?: string;
    /** Said once Discard has thrown the work away, beside Undo when `ondiscard` returns one. */
    discardedTitle?: string;
    saveLabel?: string;
    savingLabel?: string;
    discardLabel?: string;
    undoLabel?: string;
    dismissLabel?: string;
    /** Sends the draft. Also runs on Ctrl+S or Cmd+S inside the bar's pane. */
    onsave: () => void;
    /** Throws the draft away. Return a function that brings it back, and the bar offers Undo. */
    ondiscard: () => void | (() => void);
    element?: HTMLElement | null;
    /** Layout for the call site only, never the bar's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'hidden'> = $props();

  /** How long a notice with nothing to press stays, as a toast does (L-60). */
  const LINGER_MS = 5000;
  const FOCUSABLE =
    'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex^="-"])';

  /** What the bar says once the work is gone from it: saved, or discarded with a way back. */
  let notice = $state<{ kind: 'saved' | 'discarded'; undo?: () => void } | null>(null);
  let hovered = $state(false);
  let within = $state(false);
  let undoButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let dismissButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let saveButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  /* The control the reader came from into the bar, where focus goes back when the bar's
     buttons leave. */
  let returnTo: HTMLElement | null = null;
  let asked: 'save' | null = null;

  $effect(() => {
    if (dirty) {
      notice = null;
      return;
    }
    if (asked !== 'save') return;
    asked = null;
    notice = { kind: 'saved' };
    void tick().then(() => handBack());
  });

  $effect(() => {
    if (!notice || notice.undo || hovered || within) return;
    const timer = setTimeout(() => void dismiss(), LINGER_MS);
    return () => clearTimeout(timer);
  });

  function save(): void {
    asked = 'save';
    onsave();
  }

  async function discard(): Promise<void> {
    const back = ondiscard();
    notice = { kind: 'discarded', undo: typeof back === 'function' ? back : undefined };
    await tick();
    (undoButton ?? dismissButton)?.focus({ preventScroll: true });
  }

  async function bringBack(): Promise<void> {
    notice?.undo?.();
    notice = null;
    await tick();
    handBack(saveButton);
  }

  async function dismiss(): Promise<void> {
    notice = null;
    await tick();
    handBack();
  }

  // Focus left on a button that went away falls to the page, so it goes back where the reader
  // came from, else to the pane's first control (L-89). Focus the reader moved on stays.
  function handBack(fallback?: HTMLElement | null): void {
    const focused = document.activeElement;
    if (focused && focused !== document.body && !element?.contains(focused)) return;
    if (focused && element?.contains(focused) && focused.checkVisibility()) return;
    const pane = element?.parentElement;
    const first = [...(pane?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].find(
      (node) => !element?.contains(node)
    );
    (returnTo?.isConnected ? returnTo : (fallback ?? first))?.focus({ preventScroll: true });
  }

  function onfocusin(event: FocusEvent): void {
    within = true;
    const from = event.relatedTarget;
    if (from instanceof HTMLElement && !element?.contains(from)) returnTo = from;
  }

  function onfocusout(event: FocusEvent): void {
    const to = event.relatedTarget;
    within = to instanceof Node && Boolean(element?.contains(to));
  }

  // Ctrl+S or Cmd+S anywhere in the pane saves, so a reader need not tab to the bar's end.
  function shortcut(bar: HTMLElement) {
    const pane = bar.parentElement;
    if (!pane) return;
    const onkeydown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyS' || !(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey || !dirty || saving) return;
      event.preventDefault();
      save();
    };
    pane.addEventListener('keydown', onkeydown);
    return () => pane.removeEventListener('keydown', onkeydown);
  }

  // Resolving the style before the flag lands means a bar that is up at first paint already
  // has one, so only a later reveal slides in.
  function settle(bar: HTMLElement) {
    void getComputedStyle(bar).opacity;
    bar.dataset.settled = '';
  }
</script>

<!--
@component
The bar that floats over a pane while it holds unsaved work, and the one place that work is
saved or thrown away. Every edit on the pane stages a draft; this bar sends it. It is the gold
exception: its border and its Save button wear the decision accent, which belongs only to
unsaved state and the action that resolves it.

Place it last in the content that scrolls, the page's or a pane's. It sticks to the block end
of that scroller, 16px in, while there is content past it, and once the reader reaches the end
it rests after the last content, so it never covers that content and nothing is measured.

- Semantics: an `aside` named by its title, with a polite live copy and native buttons.
- Content: a title and a subtitle while there is work; `savedTitle` once a save lands; `discardedTitle` with Undo once Discard has run.
- States: unsaved (Discard and Save), saving (both held, Save busy with `savingLabel`), failed (`failedTitle` over the reason), saved (a quiet notice for 5 seconds, paused while hovered) and discarded (Undo and Dismiss until the reader acts).
- Keyboard: Tab reaches Discard and Save at the pane's end; Ctrl+S or Cmd+S saves from anywhere in the bar's pane; Escape never discards.
- Pointer and touch: buttons are 34px tall, 44px on a phone.
- Focus: after Discard focus moves to Undo, or to Dismiss without one; after a save lands, Undo or Dismiss, focus goes back to the control the reader came from, else the pane's first control, never to the page.
- Responsive: the copy wraps and the actions wrap under it; on a screen under 30rem tall, as at 400% zoom, the bar stops sticking and only sits at the pane's end, so it never covers most of the view.
- Accessibility: the copy is a polite live region, so a failure, a save and a discard are each said; the bar's name is its title.
- Localization: every word is a prop with an English default; the actions end the line in the reading direction.
- Performance: no script measures it; a fade and 8px rise on entry, removed under reduced motion.
- Analytics: `onsave` hears each save, the shortcut included, `ondiscard` each discard, and the function it returns each undo.
- Failure: a failed save keeps the bar up with the reason and the work is never dropped on its own; without an undo from `ondiscard` the discard still says so before the bar leaves.
-->

<aside
  bind:this={element}
  {@attach settle}
  {@attach shortcut}
  {...rest}
  class={['sui-save-bar', className, { notice: notice !== null }]}
  aria-labelledby={titleId}
  hidden={!dirty && !notice}
  {onfocusin}
  {onfocusout}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
>
  <div class="copy" aria-live="polite">
    {#if notice}
      <p id={titleId} class="title">
        {notice.kind === 'saved' ? savedTitle : discardedTitle}
      </p>
    {:else}
      <p id={titleId} class="title">{error ? failedTitle : title}</p>
      <p class={['subtitle', { error: Boolean(error) }]}>{error || subtitle}</p>
    {/if}
  </div>
  {#if notice?.kind === 'discarded'}
    <div class="actions">
      <Button bind:element={dismissButton} tone="ghost" onclick={dismiss}>{dismissLabel}</Button>
      {#if notice.undo}
        <Button bind:element={undoButton} onclick={bringBack}>{undoLabel}</Button>
      {/if}
    </div>
  {:else if !notice}
    <div class="actions">
      <Button disabled={saving} onclick={discard}>{discardLabel}</Button>
      <Button
        bind:element={saveButton}
        tone="decision"
        loading={saving}
        aria-keyshortcuts="Control+S Meta+S"
        onclick={save}>{saving ? savingLabel : saveLabel}</Button
      >
    </div>
  {/if}
</aside>

<style>
  .sui-save-bar {
    --sui-surface-raised: transparent;
    align-items: center;
    background: var(--sui-popover-bg);
    border: var(--sui-decision-border-width) solid var(--sui-decision-accent);
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-plate);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3) var(--sui-space-5);
    inline-size: 100%;
    inset-block-end: max(var(--sui-space-4), env(safe-area-inset-bottom));
    justify-content: space-between;
    margin-inline: auto;
    max-inline-size: 50rem;
    opacity: 1;
    /* One inset all round, measured to the ink (L-33). */
    padding: var(--sui-space-4);
    position: sticky;
    transition:
      opacity var(--sui-duration-normal) var(--sui-ease-standard),
      translate var(--sui-duration-normal) var(--sui-ease-standard),
      display var(--sui-duration-normal) allow-discrete;
    translate: 0 0;
    z-index: var(--sui-layer-sticky);
  }

  /* Discard sits beside the decision, so it is quiet in the unsaved hue: no ground of its own,
     a gold edge and the unsaved ink (L-92). */
  .sui-save-bar:not(.notice) {
    --sui-control-border: var(--sui-unsaved-control-border);
    --sui-control-border-hover: var(--sui-unsaved-border);
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-unsaved-ink) 10%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-unsaved-ink) 16%, transparent);
  }

  /* Once the work is saved or discarded nothing is unsaved, so the bar leaves the gold for the
     neutral frame and controls (L-16), keeping its edge's width so nothing moves. */
  .sui-save-bar.notice {
    border-color: var(--sui-border-subtle);
  }

  .sui-save-bar[hidden] {
    display: none;
    opacity: 0;
    transition-duration: var(--sui-duration-fast);
    translate: 0 var(--sui-space-2);
  }

  @starting-style {
    .sui-save-bar[data-settled]:not([hidden]) {
      opacity: 0;
      translate: 0 var(--sui-space-2);
    }
  }

  .copy {
    display: grid;
    flex: 1 1 18rem;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .title,
  .subtitle {
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .title {
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .subtitle {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .subtitle.error {
    color: var(--sui-danger);
  }

  /* The bar spreads its two parts, so the actions end the line they share with the copy and
     start the line they wrap to (L-90). */
  .actions {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  .sui-save-bar:not(.notice) .actions {
    --sui-text-primary: var(--sui-unsaved-ink);
  }

  /* On a screen this short a sticking bar would cover most of it (400% zoom is 256px tall), so
     the bar only sits at the pane's end, where Ctrl+S or a scroll reaches it. */
  @media (max-height: 30rem) {
    .sui-save-bar {
      position: static;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-save-bar {
      transition: none;
    }
  }
</style>
