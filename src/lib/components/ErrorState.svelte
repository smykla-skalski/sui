<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';

  let {
    title,
    description,
    onretry,
    busy = false,
    focusAfterRetry,
    overContent = false,
    class: className = '',
    ...rest
  }: {
    /** What could not be done, as a statement: "Repositories could not be loaded". */
    title: string;
    /** Why, and what the reader can do about it. */
    description: string;
    /** Draws "Try again", for a failure that repeating the request can fix. */
    onretry?: () => void;
    /** The retry is running, so the button keeps focus and ignores a second press. */
    busy?: boolean;
    /** What takes focus when a retry succeeds and this state leaves, such as the list it gave way to. */
    focusAfterRetry?: () => HTMLElement | null | undefined;
    /** Loaded content stands behind the failure, so it becomes a line above it. */
    overContent?: boolean;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> = $props();

  let retried = false;

  function retry() {
    retried = true;
    onretry?.();
  }

  /* The teardown runs once the panel is out of the page, so focus has already fallen to
     <body>. The next microtask finds whatever took this panel's place. */
  $effect(() => () => {
    if (!retried || !focusAfterRetry) return;
    queueMicrotask(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      focusAfterRetry()?.focus();
    });
  });
</script>

<!--
@component
A request that failed, announced as an alert, with a retry when repeating it can help. It is
the `EmptyState` panel in the danger tone, because it stands in the same place and answers
the same question: a thing that went wrong rather than a thing that is not there.

`overContent` keeps what is already loaded. A refresh that fails over a list has not made
the list wrong, so the failure becomes one line above the rows instead of a panel in place
of them.

While `busy`, the retry reads "Trying again…", keeps focus and ignores presses. When the
retry succeeds and this state leaves the page, focus moves to `focusAfterRetry` instead of
falling to the page. Give that element `tabindex="-1"` when it is not a control.
-->

<div {...rest} class={['sui-error-state', className, { over: overContent }]} role="alert">
  <div class="sui-error-state-copy">
    <p class="sui-error-state-title">{title}</p>
    <p class="sui-error-state-description">{description}</p>
  </div>
  {#if onretry}
    <Button loading={busy} onclick={retry}>
      {busy ? 'Trying again…' : 'Try again'}
    </Button>
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
    border: 1px solid color-mix(in srgb, var(--sui-danger) 35%, transparent);
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
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-error-state-title {
    color: var(--sui-danger);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-error-state-description {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  /* One line sized to itself, so the rows under it keep their place. */
  .over {
    --sui-surface-raised: transparent;
    --sui-control-border: color-mix(in srgb, var(--sui-danger) 40%, var(--sui-danger-tint));
    --sui-control-border-hover: color-mix(in srgb, var(--sui-danger) 65%, var(--sui-danger-tint));
    align-items: center;
    background: var(--sui-danger-tint);
    border-color: transparent;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: space-between;
    padding: var(--sui-space-2) var(--sui-space-3);
  }

  .over .sui-error-state-description {
    color: var(--sui-danger);
  }
</style>
