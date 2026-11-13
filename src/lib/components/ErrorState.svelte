<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';
  import Icon from '../icons/Icon.svelte';
  import { evenHeight } from '../internal/even-height.js';

  let {
    title,
    description,
    onretry,
    action,
    step,
    busy = false,
    focusAfterRetry,
    overContent = false,
    retryLabel = word('ErrorState.retryLabel', 'Try Again'),
    retryingLabel = word('ErrorState.retryingLabel', 'Trying Again…'),
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** What could not be done, as a statement: "Repositories Could Not Load". */
    title: string;
    /** Why, and what the reader can do about it. */
    description: string;
    /** Draws the retry button, for a failure that repeating the request can fix. */
    onretry?: () => void;
    /** Another way out, beside the retry or in its place, such as a `Button` that opens settings. */
    action?: Snippet;
    /** The next step in words, when it happens elsewhere and no control here can take it, such as asking an owner for access. */
    step?: string;
    /** The retry is running, so the button keeps focus and ignores a second press. */
    busy?: boolean;
    /** What takes focus when a retry succeeds and this state leaves, such as the list it gave way to. */
    focusAfterRetry?: () => HTMLElement | null | undefined;
    /** Loaded content stands behind the failure, so it becomes a line above it. */
    overContent?: boolean;
    retryLabel?: string;
    /** The retry button's words while the retry runs. */
    retryingLabel?: string;
    element?: HTMLDivElement | null;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> = $props();

  const TABBABLE =
    ':is(a[href], button, input, select, textarea, summary, [tabindex]):not(:disabled, [tabindex^="-"])';

  let retried = false;
  // Where the panel stands, so focus can find what took its place once it has gone.
  let place: Element | null = null;

  $effect(() => {
    place = element?.parentElement ?? null;
  });

  function retry() {
    retried = true;
    onretry?.();
  }

  /* The teardown runs once the panel is out of the page, so focus has already fallen to
     <body>. The next microtask finds whatever took this panel's place: the caller's choice,
     else the first control left where the panel stood, else the place itself, which holds
     focus until the reader moves on, so the reader's place is never the top of the page. */
  $effect(() => () => {
    if (!retried) return;
    const region = place;
    queueMicrotask(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      const chosen = focusAfterRetry?.();
      const found = [...(region?.querySelectorAll<HTMLElement>(TABBABLE) ?? [])].find((node) =>
        node.checkVisibility()
      );
      const target = chosen ?? found ?? (region instanceof HTMLElement ? hold(region) : null);
      target?.focus({ preventScroll: true });
    });
  });

  function hold(region: HTMLElement): HTMLElement {
    if (region.hasAttribute('tabindex')) return region;
    region.tabIndex = -1;
    region.addEventListener('blur', () => region.removeAttribute('tabindex'), { once: true });
    return region;
  }
</script>

<!--
@component
A request that failed, announced as an alert, with a retry when repeating it can help. It is
the `EmptyState` panel in the danger tone, because it stands in the same place and answers
the same question: a thing that went wrong rather than a thing that is not there.

`overContent` keeps what is already loaded. A refresh that fails over a list has not made
the list wrong, so the failure becomes one line above the rows instead of a panel in place
of them.

- Semantics: an `alert` holding a title, a description and an optional retry `button`.
- Content: a statement of what failed, one sentence on why and what to do, and the retry; the words wrap.
- States: failed (a panel in the danger tone), retrying (the button busy with `retryingLabel`, at one width from rest to busy), and over loaded content (one line on the danger tint, its detail in the secondary ink as in the panel).
- Keyboard: the retry takes Tab, Enter and Space; it ignores presses while busy.
- Pointer and touch: the retry is 34px tall, 44px on a phone or touch screen.
- Focus: the retry keeps focus while it runs; when the retry succeeds and the panel leaves, focus moves to `focusAfterRetry`, else to the first control where the panel stood, else to the place itself, never to the page.
- Responsive: the panel fills its column and pads 20px on a phone; over content the line wraps its words, and its button under them.
- Accessibility: the alert announces the failure when it appears, the busy button is announced as busy, and a warning mark and the danger ink stand beside words that say what failed.
- Localization: `retryLabel` and `retryingLabel` carry the built-in words, and it starts at the inline start, mirrored in a right-to-left page.
- Performance: a static block, except where the browser cannot round a box's height in CSS: there one shared observer pads the copy to an even height; the retry's spinner is the button's own and stops under reduced motion.
- Analytics: `onretry` reports each attempt to recover.
- Failure: every failure offers a way out: `onretry` for one a retry can fix, `action` for another control, such as one that opens settings, and `step` in words for one that happens elsewhere, such as asking an owner for access; the law audit flags a failure with none.
-->

<div
  bind:this={element}
  {...rest}
  class={['sui-error-state', className, { over: overContent }]}
  role="alert"
>
  <div class="sui-error-state-copy" {@attach evenHeight}>
    <span class="sui-error-state-mark"><Icon name="alert" size="base" /></span>
    <p class="sui-error-state-title">{title}</p>
    <p class="sui-error-state-description">{description}</p>
    {#if step}<p class="sui-error-state-step">{step}</p>{/if}
  </div>
  {#if onretry || action}
    <div class="sui-error-state-retry">
      {#if onretry}
        <!-- The button holds the retrying words' room from the start, so it keeps one width
             as the retry runs and its focus ring never grows. -->
        <Button loading={busy} busyLabel={retryingLabel} onclick={retry}>{retryLabel}</Button>
      {/if}
      {@render action?.()}
    </div>
  {/if}
</div>

<style>
  /* A failure is a pale wash of the danger tint inside a light edge of the hue, so the edge
     carries the state and the words keep their contrast. The wash is mixed over the surface,
     so it reads as a clean tint on a page's warm canvas too, never a grey one. The retry is the neutral default
     button, the reader's next step, which is to repeat the request (L-92). Stretched beside a
     taller panel, its words keep to the top and its retry to the foot, as an empty panel's do. */
  .sui-error-state {
    --sui-local-error-ground: color-mix(
      in srgb,
      var(--sui-danger-tint) 65%,
      var(--sui-surface-base)
    );
    align-content: space-between;
    background: var(--sui-local-error-ground);
    border: var(--sui-stroke) solid var(--sui-danger-wash-edge);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-5);
    justify-items: start;
    min-inline-size: 0;
    padding: var(--sui-space-7) var(--sui-space-5);
  }

  /* A phone's short screen takes the room above and below the words down to the sides' 20px.
     The row over content keeps its row's inset, below. */
  @media (max-width: 47.9375rem) {
    .sui-error-state {
      gap: var(--sui-space-4);
      padding: var(--sui-space-5);
    }
  }

  /* Even, so a retry centred beside it in a row lands on the pixel grid (L-95). The warning
     mark hangs before the title, as a form error's does, and the explanation and step stand on
     the title's edge, so the words read down one rail. The spare pixel stays after the rows, or
     stretching them would put a half pixel in each. */
  .sui-error-state-copy {
    align-content: start;
    block-size: var(--sui-block-snap-even);
    display: grid;
    gap: var(--sui-title-copy-gap) var(--sui-space-2);
    grid-template-columns: auto minmax(0, 1fr);
    min-inline-size: 0;
  }

  .sui-error-state-copy > p {
    grid-column: 2;
  }

  /* A panel's retry stands on the words' rail too, as a form error's links leave the line its
     mark and gap take. Over a list it follows the words on their line instead. */
  .sui-error-state:not(.over) > .sui-error-state-retry {
    padding-inline-start: calc(var(--sui-icon-base) + var(--sui-space-2));
  }

  /* Centred on the title's first line, so it takes the title's face to measure that line's cap.
     The line is snapped up to a whole pixel with its cap in the middle, so the mark centres on
     the snapped box rather than on the bare cap. */
  .sui-error-state-mark {
    align-self: start;
    color: var(--sui-danger);
    display: flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin-block: round(calc((round(up, 1cap, 1px) - var(--sui-icon-base)) / 2), 1px);
  }

  p {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* The mark, the edge and the wash carry the failure, so the title reads in the primary ink and
     the panel never turns into a block of red. */
  .sui-error-state-title {
    text-wrap: balance;
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-error-state-step {
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-error-state-description {
    color: var(--sui-text-secondary);
    max-inline-size: var(--sui-measure);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  /* Over a list the failure is a line of its own inside the list's edges, its words and its
     retry a step inside its tint, so they never crowd the tint's edge. Its tint is a plate 2px
     inside that box on every side, as a row's state is (L-91), with a panel's edge. It stands 8px clear of the first
     row, so the failure never reads as that row's state. Its retry ends the line, where a
     reader looks for a line's action, and a line too narrow for both wraps it under its words
     (L-90), at any width. */
  .over {
    align-items: center;
    background: none;
    border: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    justify-content: space-between;
    /* A holder that asks for its lead gets the padding back, as a row list hands it back. */
    margin-block-start: var(--sui-local-row-lead, 0px);
    margin-block-end: var(--sui-space-2);
    padding: var(--sui-space-3) var(--sui-space-4);
    position: relative;
  }

  .over::before {
    background: var(--sui-local-error-ground);
    border: var(--sui-stroke) solid var(--sui-danger-wash-edge);
    border-radius: inherit;
    content: '';
    inset: calc(var(--sui-space-1) / 2);
    position: absolute;
  }

  .over > :is(.sui-error-state-copy, .sui-error-state-retry) {
    position: relative;
  }

  .over > .sui-error-state-retry {
    margin-inline-start: calc(var(--sui-icon-base) + var(--sui-space-2));
  }

  /* A line over a list heads only its own words, so its title keeps a panel's step quieter. */
  .over :is(.sui-error-state-title, .sui-error-state-mark) {
    font-size: var(--sui-font-size-title);
  }
</style>
