<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    loading = true,
    rows = 6,
    rowHeight,
    bars = true,
    label,
    class: className = '',
    children,
    ...rest
  }: {
    /** The first answer has not come yet. Off draws `children` in the placeholders' place. */
    loading?: boolean;
    rows?: number;
    /** The height a loaded row will have. The default is an `ObjectRow` with a name and a line under it. */
    rowHeight?: string;
    /** Two bars per row, hinting at the main content and the side. Off for plain rows. */
    bars?: boolean;
    /** What is being waited for, announced rather than drawn. */
    label?: string;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    /** The loaded content, drawn in the same busy region once `loading` ends. */
    children?: Snippet;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  /* Many screen readers skip a live region that enters the page with its words, so the
     words wait until the region has been in the page a moment. 100ms is the delay React
     Aria's announcer uses for the same reason. */
  const SETTLE = 100;

  let settled = $state(false);

  $effect(() => {
    const timer = setTimeout(() => (settled = true), SETTLE);
    return () => clearTimeout(timer);
  });
</script>

<!--
@component
The rows a list draws while it waits for its first answer, and only its first. A refresh
keeps the loaded rows and reports itself in place; a placeholder never stands in front of
content a reader was reading, which is the caller's decision and the one rule here a prop
cannot enforce.

Wrap the list in it and pass `loading`: the region is `aria-busy` while the placeholders
show, and the list takes their place in the same region. `label` is announced through a
polite status beside the region, never inside it, because a busy region may hold back its
own announcements.

Its rows measure what an `ObjectList` of two-line rows will measure, last-row pull included,
so the page does not move when the rows arrive; set `rowHeight` for any other row. Every
placeholder shares one pulse, which stops under reduced motion. Use it only where the shape
of what is coming is already known.
-->

<div {...rest} class={['sui-skeleton', className]} aria-busy={loading}>
  {#if loading}
    <div
      class={['sui-skeleton-rows', { bars }]}
      style:--sui-skeleton-row={rowHeight}
      aria-hidden="true"
    >
      {#each { length: rows }, index (index)}
        <span></span>
      {/each}
    </div>
  {:else}
    {@render children?.()}
  {/if}
</div>
{#if label}
  <VisuallyHidden role="status">{settled && loading ? label : ''}</VisuallyHidden>
{/if}

<style>
  .sui-skeleton {
    min-inline-size: 0;
  }

  /* Two trimmed lines of meta copy, the copy gap between them, the row padding and the
     hairline: exactly an `ObjectRow`, measured in the face that row is set in. */
  .sui-skeleton-rows {
    --sui-skeleton-row: calc(
      2cap + var(--sui-row-copy-gap) + 2 * var(--sui-row-pad-default) + var(--sui-row-hairline)
    );
    animation: sui-skeleton-pulse var(--sui-rhythm-shimmer) var(--sui-ease-inout) infinite alternate;
    display: grid;
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-flat) var(--sui-sans);
    margin-block-end: calc(-1 * var(--sui-row-pad-default));
  }

  span {
    block-size: var(--sui-skeleton-row);
    border-block-end: var(--sui-row-hairline) solid var(--sui-border-divider);
    box-sizing: border-box;
    display: block;
    position: relative;
  }

  span:last-child {
    border-block-end: 0;
  }

  .bars span::before,
  .bars span::after {
    background: var(--sui-surface-inset);
    block-size: var(--sui-space-3);
    border-radius: var(--sui-radius-control);
    content: '';
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: min(13rem, 45%);
    margin-block: auto;
    position: absolute;
  }

  .bars span::after {
    inline-size: min(6rem, 20%);
    inset-inline: auto 0;
  }

  @keyframes sui-skeleton-pulse {
    from {
      opacity: 0.48;
    }

    to {
      opacity: 0.88;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-skeleton-rows {
      animation: none;
      opacity: 0.68;
    }
  }
</style>
