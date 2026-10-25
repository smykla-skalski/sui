<script lang="ts">
  import { word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { holdForWork } from '../internal/held.svelte.js';
  import Button from './Button.svelte';

  const titleId = $props.id();

  let {
    dirty,
    saving = false,
    error = null,
    conflict = false,
    reloading = false,
    title = word('SaveBar.title', 'You have unsaved changes'),
    subtitle = word('SaveBar.subtitle', 'Save to keep them, or discard to go back'),
    failedTitle = word('SaveBar.failedTitle', 'Your changes were not saved'),
    savedTitle = word('SaveBar.savedTitle', 'Your changes are saved'),
    discardedTitle = word('SaveBar.discardedTitle', 'Your changes were discarded'),
    conflictReason = word(
      'SaveBar.conflictReason',
      'Someone else saved first, so reload to see their version before you save again'
    ),
    reloadedTitle = word('SaveBar.reloadedTitle', 'The latest version replaced your changes'),
    saveLabel = word('SaveBar.saveLabel', 'Save'),
    savingLabel = word('SaveBar.savingLabel', 'Saving…'),
    discardLabel = word('SaveBar.discardLabel', 'Discard'),
    reloadLabel = word('SaveBar.reloadLabel', 'Reload'),
    reloadingLabel = word('SaveBar.reloadingLabel', 'Reloading…'),
    undoLabel = word('SaveBar.undoLabel', 'Undo'),
    dismissLabel = word('SaveBar.dismissLabel', 'Dismiss'),
    onsave,
    ondiscard,
    onreload,
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
    /**
     * The last save failed because the work changed elsewhere since it loaded, so saving again
     * would fail too: the bar offers Reload, through `onreload`, in place of Discard and Save.
     */
    conflict?: boolean;
    /** Holds Reload while the latest version loads and says so on it. */
    reloading?: boolean;
    title?: string;
    subtitle?: string;
    failedTitle?: string;
    /** Said for 5 seconds once a save lands, by the bar on its way out. */
    savedTitle?: string;
    /** Said once Discard has thrown the work away, beside Undo when `ondiscard` returns one. */
    discardedTitle?: string;
    /** Said under `failedTitle` in a conflict when `error` gives no reason of its own. */
    conflictReason?: string;
    /** Said once a reload has replaced the draft, beside Undo, which puts the draft back. */
    reloadedTitle?: string;
    saveLabel?: string;
    savingLabel?: string;
    discardLabel?: string;
    reloadLabel?: string;
    reloadingLabel?: string;
    undoLabel?: string;
    dismissLabel?: string;
    /** Sends the draft. Also runs on Ctrl+S or Cmd+S inside the bar's pane. */
    onsave: () => void;
    /** Throws the draft away. Return a function that brings it back, and the bar offers Undo. */
    ondiscard: () => void | (() => void);
    /**
     * Loads the latest saved version in place of the draft, after a conflict. Return a function
     * that puts the draft back over it: a reload drops the reader's work, so the bar always
     * offers that way back as Undo rather than asking first (L-58).
     */
    onreload?: () => () => void;
    element?: HTMLElement | null;
    /** Layout for the call site only, never the bar's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'hidden'> = $props();

  /** How long a notice with nothing to press stays, as a toast does (L-60). */
  const LINGER_MS = 5000;
  const FOCUSABLE =
    'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex^="-"])';

  /** What the bar says once the work is gone from it: saved, or discarded or replaced by a
      reload, with a way back. */
  let notice = $state<{ kind: 'saved' | 'discarded' | 'reloaded'; undo?: () => void } | null>(null);
  let hovered = $state(false);
  let within = $state(false);
  let undoButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let dismissButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let saveButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  /* The control the reader came from into the bar, where focus goes back when the bar's
     buttons leave. */
  let returnTo: HTMLElement | null = null;
  let asked: 'save' | 'reload' | null = null;
  /* The way back a reload handed over, offered once the reloaded version lands. */
  let putBack: (() => void) | null = null;
  const reloadable = $derived(conflict && Boolean(onreload));
  const told = $derived({ saved: savedTitle, discarded: discardedTitle, reloaded: reloadedTitle });

  $effect(() => {
    if (dirty) {
      notice = null;
      return;
    }
    if (asked === 'save') {
      asked = null;
      notice = { kind: 'saved' };
      void tick().then(() => handBack());
    } else if (asked === 'reload') {
      asked = null;
      notice = { kind: 'reloaded', undo: putBack ?? undefined };
      putBack = null;
      void tick().then(offerUndo);
    }
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
    asked = null;
    const back = ondiscard();
    notice = { kind: 'discarded', undo: typeof back === 'function' ? back : undefined };
    await tick();
    (undoButton ?? dismissButton)?.focus({ preventScroll: true });
  }

  // The draft goes once the latest version lands, which may take a while, so the bar waits for
  // the work to be clean before it offers the way back.
  function reload(): void {
    if (!onreload || reloading) return;
    asked = 'reload';
    putBack = onreload();
  }

  // Reload left with the conflict, so focus that was on it, or fell to the page, moves on to
  // Undo; focus the reader moved elsewhere while the version loaded stays (L-89).
  function offerUndo(): void {
    const focused = document.activeElement;
    if (focused && focused !== document.body && !element?.contains(focused)) return;
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
  // While the bar holds work it never opens the browser's own save, even when a save cannot
  // run now: one is on its way, a reload is, or a conflict would refuse it.
  function shortcut(bar: HTMLElement) {
    const pane = bar.parentElement;
    if (!pane) return;
    const onkeydown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyS' || !(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey || !dirty) return;
      event.preventDefault();
      if (!saving && !reloading && !reloadable) save();
    };
    pane.addEventListener('keydown', onkeydown);
    return () => pane.removeEventListener('keydown', onkeydown);
  }

  // A field the reader tabs to, or a fragment the page jumps to, scrolls clear above the
  // floating bar instead of behind it (WCAG 2.4.11), as AppShell keeps the page clear of its
  // bars: the scroller's end padding is the bar, its inset under it and as much again above it.
  function clearance(bar: HTMLElement) {
    let scroller = bar.parentElement;
    while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY))
      scroller = scroller.parentElement;
    const pane = scroller ?? document.documentElement;
    const before = pane.style.scrollPaddingBlockEnd;
    const observer = new ResizeObserver(([entry]) => {
      const tall = entry.borderBoxSize[0].blockSize;
      const inset = parseFloat(getComputedStyle(bar).insetBlockEnd);
      pane.style.scrollPaddingBlockEnd = tall > 0 ? `${tall + 2 * inset}px` : before;
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
      pane.style.scrollPaddingBlockEnd = before;
    };
  }

  // While a save runs, the pane's fields hold the values being saved, as a busy dialog's do:
  // focus moves to the busy Save, the fields are disabled, and the pane says it is busy.
  function holdPane(bar: HTMLElement) {
    const pane = bar.parentElement;
    if (!saving || !pane) return;
    const release = holdForWork(pane, () => bar.querySelector<HTMLElement>('[aria-busy="true"]'));
    const before = pane.getAttribute('aria-busy');
    pane.setAttribute('aria-busy', 'true');
    return () => {
      release();
      if (before === null) pane.removeAttribute('aria-busy');
      else pane.setAttribute('aria-busy', before);
    };
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

Place it last in the content that scrolls, the page's or a pane's, with the gap the content
keeps between its own parts before it. It sticks to the block end of that scroller, 16px in,
while there is content past it, and once the reader reaches the end it rests after the last
content at that same gap, with its 16px under it, so it never covers that content. The bar
brings its own room under it, so the scroller needs no end padding.

- Semantics: an `aside` named by its title, with a polite live copy and native buttons.
- Content: a title and a subtitle while there is work; `savedTitle` once a save lands; `discardedTitle` with Undo once Discard has run; `reloadedTitle` with Undo once a reload has replaced the draft.
- States: unsaved (Discard and Save), saving (both held, Save busy with `savingLabel`, the gold edge and the copy dimmed with them, the pane `aria-busy`, focus on Save and the pane's fields disabled until the save ends), failed (`failedTitle` over the reason, with Discard and Save to try again), conflict (`failedTitle` over the reason or `conflictReason`, with Reload alone as the decision, because saving again would be refused), reloading (Reload busy with `reloadingLabel`, dimmed like a save), saved (a quiet notice for 5 seconds, paused while hovered), and discarded or reloaded (Undo and Dismiss until the reader acts).
- Keyboard: Tab reaches Discard and Save, or Reload, at the pane's end; Ctrl+S or Cmd+S saves from anywhere in the bar's pane, and while the bar holds work it never opens the browser's own save, even when a save cannot run; Escape never discards.
- Pointer and touch: buttons are 34px tall, 44px on a phone.
- Focus: after Discard, or once a reload lands, focus moves to Undo, or to Dismiss without one, unless the reader moved it elsewhere while the reload ran; a busy Reload keeps focus; after a save lands, Undo or Dismiss, focus goes back to the control the reader came from, else the pane's first control, never to the page; a field focused under the floating bar scrolls clear above it, because the bar pads its scroller's end by its own height (WCAG 2.4.11).
- Responsive: the copy wraps and the actions wrap under it; on a screen under 30rem tall, as at 400% zoom, the bar stops sticking and only sits at the pane's end, so it never covers most of the view.
- Accessibility: the copy is a polite live region, so a failure, a conflict, a save, a discard and a reload are each said; a busy button is `aria-busy`; the bar's name is its title.
- Localization: every word is a prop with an English default; the actions end the line in the reading direction.
- Performance: one `ResizeObserver` keeps the scroller's end padding as tall as the bar, and nothing measures it per frame; a fade and 8px rise on entry, removed under reduced motion.
- Analytics: `onsave` hears each save, the shortcut included, `ondiscard` each discard, `onreload` each reload, and the functions they return each undo.
- Failure: a failed save keeps the bar up with the reason and the work is never dropped on its own; a conflict offers Reload, which drops the draft only with Undo beside it; a reload that fails is the caller's to say, by keeping `dirty` and setting `error`; without an undo from `ondiscard` the discard still says so before the bar leaves.
-->

<aside
  bind:this={element}
  {@attach settle}
  {@attach shortcut}
  {@attach clearance}
  {@attach holdPane}
  {...rest}
  class={['sui-save-bar', className, { notice: notice !== null, busy: saving || reloading }]}
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
        {told[notice.kind]}
      </p>
    {:else}
      <p id={titleId} class="title">{error || reloadable ? failedTitle : title}</p>
      <p class={['subtitle', { error: Boolean(error) || reloadable }]}>
        {error || (reloadable ? conflictReason : subtitle)}
      </p>
    {/if}
  </div>
  {#if notice && notice.kind !== 'saved'}
    <div class="actions">
      <Button bind:element={dismissButton} tone="ghost" onclick={dismiss}>{dismissLabel}</Button>
      {#if notice.undo}
        <Button bind:element={undoButton} onclick={bringBack}>{undoLabel}</Button>
      {/if}
    </div>
  {:else if !notice && reloadable}
    <div class="actions">
      <Button tone="decision" loading={reloading} onclick={reload}
        >{reloading ? reloadingLabel : reloadLabel}</Button
      >
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
  /* The bar keeps its inset under it as a margin too, so it rests where it floats: at the
     content's end a sticky box is held its inset off the scroller's end, and without the room
     it would ride up over the gap above it, flush with the last field. */
  .sui-save-bar {
    --sui-save-bar-inset: max(var(--sui-space-4), env(safe-area-inset-bottom));
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
    inset-block-end: var(--sui-save-bar-inset);
    justify-content: space-between;
    margin-block-end: var(--sui-save-bar-inset);
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

  /* While a save or a reload runs the edge waits with its buttons, muted the same way, so the
     bar reads as busy as a whole (L-40). The copy is the live status the reader still reads, so
     its title quiets to the muted ink and both lines keep 4.5:1 (WCAG 1.4.3). */
  .sui-save-bar.busy {
    border-color: color-mix(
      in srgb,
      var(--sui-decision-accent) calc(var(--sui-disabled-opacity) * 100%),
      transparent
    );
  }

  .busy .title {
    color: var(--sui-text-muted);
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
    align-content: center;
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
     start the line they wrap to (L-90). On a line narrower than both buttons they wrap too,
     rather than reach into the bar's inset. */
  .actions {
    display: flex;
    flex: 0 1 auto;
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
