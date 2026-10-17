<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';

  const titleId = $props.id();

  let {
    dirty,
    saving = false,
    error = null,
    title = 'You have unsaved changes',
    subtitle = 'Save to keep them, or discard to go back',
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
    /** Why the last save failed. It replaces the subtitle, under a title that says nothing was saved. */
    error?: string | null;
    title?: string;
    subtitle?: string;
    onsave: () => void;
    ondiscard: () => void;
    element?: HTMLElement | null;
    /** Layout for the call site only, never the bar's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'hidden'> = $props();

  /** Clear air between the last line of content and the bar, once it has scrolled to the end. */
  const CLEARANCE_GAP = 8;

  function scrollerOf(node: Element): HTMLElement {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const { overflowY } = getComputedStyle(parent);
      if (overflowY === 'auto' || overflowY === 'scroll') return parent;
    }
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  }

  // Resolving the style before the flag lands means a bar that is up at first paint already
  // has one, so only a later reveal slides in.
  function settle(bar: HTMLElement) {
    void getComputedStyle(bar).opacity;
    bar.dataset.settled = '';
  }

  function reserveClearance(bar: HTMLElement) {
    const scroller = scrollerOf(bar);
    const { style } = scroller;
    const before = {
      padding: style.paddingBlockEnd,
      scrollPadding: style.scrollPaddingBlockEnd
    };
    const resting = getComputedStyle(scroller).paddingBlockEnd;
    style.paddingBlockEnd = `max(${resting}, var(--sui-save-bar-clearance))`;
    style.scrollPaddingBlockEnd = 'var(--sui-save-bar-clearance)';
    const measure = () => {
      const inset = parseFloat(getComputedStyle(bar).bottom) || 0;
      style.setProperty(
        '--sui-save-bar-clearance',
        `${bar.offsetHeight + inset + CLEARANCE_GAP}px`
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      style.removeProperty('--sui-save-bar-clearance');
      style.paddingBlockEnd = before.padding;
      style.scrollPaddingBlockEnd = before.scrollPadding;
    };
  }
</script>

<!--
@component
The bar that floats over a pane while it holds unsaved work, and the one place that work is
saved or thrown away. Every edit on the pane stages a draft; this bar sends it. It is the gold
exception: its border and its Save button wear the decision accent, which belongs only to
unsaved state and the action that resolves it.

It is fixed to the block end of the viewport, 16px in, unless an ancestor is a containing
block for fixed boxes (`contain: layout` or a transform), which is how a pane with its own
scroller holds it. Place it inside the scroller whose end it covers. While it shows, it
writes its measured height to `--sui-save-bar-clearance` on that scroller and pads the
scroller's end by it, so the last content always scrolls clear of the bar.

Escape does not discard: throwing work away takes the Discard button. A failed save keeps
the bar up with the reason, and the work is never dropped on its own.
-->

<aside
  bind:this={element}
  {@attach settle}
  {@attach dirty && reserveClearance}
  {...rest}
  class={['sui-save-bar', className]}
  aria-labelledby={titleId}
  hidden={!dirty}
>
  <div class="copy" aria-live="polite">
    <p id={titleId} class="title">{error ? 'Your changes were not saved' : title}</p>
    <p class={['subtitle', { error: Boolean(error) }]}>{error || subtitle}</p>
  </div>
  <div class="actions">
    <Button disabled={saving} onclick={ondiscard}>Discard</Button>
    <Button tone="decision" loading={saving} onclick={onsave}>{saving ? 'Saving…' : 'Save'}</Button>
  </div>
</aside>

<style>
  /* Discard sits beside the decision, so it is quiet in the unsaved hue: no ground of its own,
     a gold edge and the unsaved ink (L-92). */
  .sui-save-bar {
    --sui-surface-raised: transparent;
    --sui-control-border: var(--sui-unsaved-control-border);
    --sui-control-border-hover: var(--sui-unsaved-border);
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-unsaved-ink) 10%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-unsaved-ink) 16%, transparent);
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
    inset-block-end: max(var(--sui-space-4), env(safe-area-inset-bottom));
    inset-inline: var(--sui-space-4);
    justify-content: space-between;
    margin-inline: auto;
    max-inline-size: 50rem;
    opacity: 1;
    padding: var(--sui-space-3) var(--sui-space-4);
    position: fixed;
    transition:
      opacity var(--sui-duration-normal) var(--sui-ease-standard),
      translate var(--sui-duration-normal) var(--sui-ease-standard),
      display var(--sui-duration-normal) allow-discrete;
    translate: 0 0;
    z-index: var(--sui-layer-sticky);
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
    font: 600 var(--sui-font-size-body) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .subtitle {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .subtitle.error {
    color: var(--sui-danger);
  }

  /* The bar spreads its two parts, so the actions end the line they share with the copy and
     start the line they wrap to (L-90). */
  .actions {
    --sui-text-primary: var(--sui-unsaved-ink);
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-save-bar {
      transition: none;
    }
  }
</style>
