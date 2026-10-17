<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    rows = 6,
    rowHeight,
    bars = true,
    label,
    class: className = '',
    ...rest
  }: {
    rows?: number;
    /** The height a loaded row will have. The default is an `ObjectRow` with a name and a line under it. */
    rowHeight?: string;
    /** Two bars per row, hinting at the main content and the side. Off for plain rows. */
    bars?: boolean;
    /** What is being waited for, announced rather than drawn. */
    label?: string;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();
</script>

<!--
@component
The rows a list draws while it waits for its first answer, and only its first. A refresh
keeps the loaded rows and reports itself in place; a placeholder never stands in front of
content a reader was reading, which is the caller's decision and the one rule here a prop
cannot enforce.

Its rows measure what an `ObjectList` of two-line rows will measure, last-row pull included,
so the page does not move when the rows arrive; set `rowHeight` for any other row. Every
placeholder shares one pulse, which stops under reduced motion. Use it only where the shape
of what is coming is already known.
-->

<div
  {...rest}
  class={['sui-skeleton', className, { bars }]}
  style:--sui-skeleton-row={rowHeight}
  aria-hidden="true"
>
  {#each { length: rows }, index (index)}
    <span></span>
  {/each}
</div>
{#if label}
  <p class="sui-skeleton-status" role="status">{label}</p>
{/if}

<style>
  /* Two trimmed lines of meta copy, the copy gap between them, the row padding and the
     hairline: exactly an `ObjectRow`, measured in the face that row is set in. */
  .sui-skeleton {
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
    border-block-end: var(--sui-row-hairline) solid var(--sui-border-subtle);
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

  .sui-skeleton-status {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    margin: 0;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-skeleton {
      animation: none;
      opacity: 0.68;
    }
  }
</style>
