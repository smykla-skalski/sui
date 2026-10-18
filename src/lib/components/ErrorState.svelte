<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';

  let {
    title,
    description,
    onretry,
    busy = false,
    focusAfterRetry,
    overContent = false,
    retryLabel = word('ErrorState.retryLabel', 'Try again'),
    retryingLabel = word('ErrorState.retryingLabel', 'Trying again…'),
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** What could not be done, as a statement: "Repositories could not be loaded". */
    title: string;
    /** Why, and what the reader can do about it. */
    description: string;
    /** Draws the retry button, for a failure that repeating the request can fix. */
    onretry?: () => void;
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
- States: failed (a panel in the danger tone), retrying (the button busy with `retryingLabel`), and over loaded content (one line on the danger tint).
- Keyboard: the retry takes Tab, Enter and Space; it ignores presses while busy.
- Pointer and touch: the retry is 34px tall, 44px on a phone or touch screen.
- Focus: the retry keeps focus while it runs; when the retry succeeds and the panel leaves, focus moves to `focusAfterRetry`, else to the first control where the panel stood, else to the place itself, never to the page.
- Responsive: the panel fills its column; over content the line wraps its words and its button.
- Accessibility: the alert announces the failure when it appears, the busy button is announced as busy, and the title wears the danger ink with words that say what failed.
- Localization: `retryLabel` and `retryingLabel` carry the built-in words, and it starts at the inline start, mirrored in a right-to-left page.
- Performance: a static block; the retry's spinner is the button's own and stops under reduced motion.
- Analytics: `onretry` reports each attempt to recover.
- Failure: with no `onretry` it explains and offers no button, for a failure a retry cannot fix, such as missing access.
-->

<div
  bind:this={element}
  {...rest}
  class={['sui-error-state', className, { over: overContent }]}
  role="alert"
>
  <div class="sui-error-state-copy">
    <p class="sui-error-state-title">{title}</p>
    <p class="sui-error-state-description">{description}</p>
  </div>
  {#if onretry}
    <div class="sui-error-state-retry">
      <Button loading={busy} onclick={retry}>
        {busy ? retryingLabel : retryLabel}
      </Button>
    </div>
  {/if}
</div>

<style>
  /* The retry takes the danger tone: an edge of the hue on the raised frame, and on the tint
     no ground of its own, so no neutral block sits on a failure (L-92). */
  .sui-error-state {
    --sui-control-border: color-mix(in srgb, var(--sui-danger) 40%, var(--sui-surface-raised));
    --sui-control-border-hover: color-mix(
      in srgb,
      var(--sui-danger) 65%,
      var(--sui-surface-raised)
    );
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-danger) 10%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-danger) 16%, transparent);
    background: var(--sui-surface-raised);
    border: var(--sui-stroke) solid color-mix(in srgb, var(--sui-danger) 35%, transparent);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-3);
    justify-items: start;
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }

  .sui-error-state-copy {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  p {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-error-state-title {
    color: var(--sui-danger);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-error-state-description {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  /* Over a list the failure is a row of its own: it bleeds past the list's edge as a row does
     and pads back by the row's inset, so its words start where the rows' words start and the
     retry ends where their actions end. Its tint is a plate 2px inside that box on every side,
     as a row's state is (L-91), so it keeps the same room at its top as at its sides, and the
     retry stays quiet on it (L-92). */
  .over {
    --sui-surface-raised: transparent;
    --sui-control-border: color-mix(in srgb, var(--sui-danger) 40%, var(--sui-danger-tint));
    --sui-control-border-hover: color-mix(in srgb, var(--sui-danger) 65%, var(--sui-danger-tint));
    align-items: center;
    background: none;
    border: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: space-between;
    /* A holder that asks for its lead gets the padding back, as a row list hands it back. */
    margin-block-start: var(--sui-local-row-lead, 0px);
    margin-inline: calc(-1 * var(--sui-row-pad-default));
    padding: var(--sui-row-pad-default);
    position: relative;
  }

  .over::before {
    background: var(--sui-danger-tint);
    border-radius: inherit;
    content: '';
    inset: calc(var(--sui-space-1) / 2);
    position: absolute;
  }

  .over > :is(.sui-error-state-copy, .sui-error-state-retry) {
    position: relative;
  }

  /* High contrast drops the tint, so the plate keeps its shape by an outline. */
  @media (forced-colors: active) {
    .over::before {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }

  .over .sui-error-state-description {
    color: var(--sui-danger);
  }
</style>
