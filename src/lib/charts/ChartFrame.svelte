<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import ErrorState from '../components/ErrorState.svelte';
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import { formatCount } from '../internal/locale.js';
  import type { ChartFrameProps } from './types.js';

  let {
    title,
    description,
    level = 3,
    status,
    error,
    onretry,
    emptyAction,
    ontableopenchange,
    emptyTitle = 'No chart data yet',
    emptyDescription = 'Nothing has been recorded for this chart',
    emptyStep = 'Values show here once they are recorded',
    dataLabel = 'View chart data',
    loadingLabel = 'Loading chart data…',
    refreshingLabel = 'Updating…',
    staleLabel = 'These values may be out of date',
    failedTitle = 'Chart data could not load',
    failedDescription = 'Try again in a moment',
    missingLabel = (count: number) =>
      count === 1
        ? '1 missing value is left out'
        : `${formatCount(count)} missing values are left out`,
    empty,
    missing = 0,
    plotHeight,
    plot,
    children,
    table
  }: ChartFrameProps & {
    /** With no values to show, an empty state takes the place of the plot and its table. */
    empty: boolean;
    /** How many values the chart left out because they were missing or not numbers. */
    missing?: number;
    /** The plot's height at a 16px root, which a placeholder keeps while the data loads. */
    plotHeight: number;
    /** Draws the plot for the frame's width in CSS pixels and the reader's text scale. */
    plot: Snippet<[width: number, scale: number]>;
    /** Notes under the plot, such as a legend. */
    children?: Snippet;
    table: Snippet;
  } = $props();

  const headingId = $props.id();
  let frame = $state<DOMRectReadOnly | null>(null);
  let scroller = $state<HTMLElement | null>(null);
  let tableBox = $state<HTMLElement | null>(null);
  let scrolls = $state(false);
  let tableScrolls = $state(false);
  let open = $state(false);
  let scale = $state(1);
  let settled = $state(false);
  // A server render has nothing to measure, so it lays the plot out at a desktop width.
  let width = $derived(Math.floor(frame?.width ?? 640));

  const note = $derived(
    status === 'loading'
      ? loadingLabel
      : status === 'refreshing'
        ? refreshingLabel
        : status === 'stale'
          ? staleLabel
          : status !== 'failed' && !empty && missing > 0
            ? missingLabel(missing)
            : undefined
  );

  onMount(() => {
    // Chart text is set in rem, so a reader's larger text widens the margins that hold it.
    scale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    // A status region that enters the page with its words is often not read, so they wait.
    const timer = setTimeout(() => (settled = true), 100);
    return () => clearTimeout(timer);
  });

  /* A box that scrolls is a stop on the keyboard path, named after the chart, so a keyboard
     reader can scroll it; one that fits takes no stop. */
  $effect(() => {
    void frame;
    void open;
    scrolls = scroller !== null && scroller.scrollWidth > scroller.clientWidth + 1;
    tableScrolls = tableBox !== null && tableBox.scrollWidth > tableBox.clientWidth + 1;
  });
</script>

<figure
  class="sui-chart"
  aria-labelledby={headingId}
  aria-busy={status === 'loading' || status === 'refreshing' ? 'true' : undefined}
>
  <figcaption>
    <svelte:element this={`h${level}`} id={headingId} class="sui-chart-title"
      >{title}</svelte:element
    >
    <p>{description}</p>
  </figcaption>
  {#if note}
    <p class="sui-chart-note" aria-hidden="true">{note}</p>
  {/if}
  <VisuallyHidden role="status">{settled ? (note ?? '') : ''}</VisuallyHidden>
  {#if status === 'failed'}
    <ErrorState title={failedTitle} description={error ?? failedDescription} {onretry} />
  {:else if status === 'loading'}
    <div class="sui-chart-wait" style:--sui-local-plot={plotHeight} aria-hidden="true"></div>
  {:else if empty}
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      {...emptyAction ? { action: emptyAction } : { step: emptyStep }}
    />
  {:else}
    <!-- A box that scrolls takes a stop so a keyboard can scroll it, as WCAG 2.1.1 asks. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      bind:this={scroller}
      class="plot-scroll"
      dir="ltr"
      bind:contentRect={frame}
      tabindex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-labelledby={scrolls ? headingId : undefined}
    >
      {@render plot(width, scale)}
    </div>
    {@render children?.()}
    <details bind:open ontoggle={() => ontableopenchange?.(open)}>
      <summary><span>{dataLabel}</span></summary>
      <!-- A box that scrolls takes a stop so a keyboard can scroll it, as WCAG 2.1.1 asks. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        bind:this={tableBox}
        class="sui-chart-table"
        tabindex={tableScrolls ? 0 : undefined}
        role={tableScrolls ? 'region' : undefined}
        aria-label={tableScrolls ? dataLabel : undefined}
      >
        {#if open}{@render table()}{/if}
      </div>
    </details>
  {/if}
</figure>

<style>
  .sui-chart {
    color: var(--sui-text-primary);
    display: grid;
    gap: var(--sui-space-4);
    margin: 0;
    min-inline-size: 0;
  }

  figcaption {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  .sui-chart-title {
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  figcaption p,
  .sui-chart-note {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-chart-note {
    color: var(--sui-text-muted);
  }

  /* Inline-size containment keeps the drawn width out of the frame's own sizing, so a measured
     plot never holds its container open. */
  .plot-scroll {
    border-radius: var(--sui-radius-control);
    contain: inline-size;
    overflow-x: auto;
  }

  .plot-scroll:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* The placeholder keeps the plot's place, and pulses as every placeholder does. */
  .sui-chart-wait {
    animation: sui-chart-pulse var(--sui-duration-shimmer) var(--sui-ease-inout) infinite alternate;
    background: var(--sui-surface-inset);
    block-size: calc(var(--sui-local-plot) * 1rem / 16);
    border-radius: var(--sui-radius-control);
  }

  @keyframes sui-chart-pulse {
    from {
      opacity: 0.48;
    }

    to {
      opacity: 0.88;
    }
  }

  /* A block-level flex box, so no line box rounds the disclosure's height off the pixel. */
  summary {
    align-items: center;
    border-radius: var(--sui-radius-control);
    color: var(--sui-brand-action-text);
    cursor: pointer;
    display: flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-compact)
      var(--sui-sans);
    inline-size: fit-content;
    margin-inline: calc(-1 * var(--sui-space-2));
    min-block-size: var(--sui-control-height-chip);
    padding-inline: var(--sui-space-2);
    position: relative;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  summary > span {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  @media (hover: hover) {
    summary:hover:not(:active) {
      background: var(--sui-interactive-hover-layer);
    }
  }

  summary:active {
    background: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  summary:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-chart-table {
    margin-block-start: var(--sui-space-3);
    max-inline-size: 100%;
    overflow-x: auto;
  }

  .sui-chart-table:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* A collapsed border is split between its two cells, which puts every row half a pixel off
     the grid (L-95). */
  .sui-chart-table :global(table) {
    border-collapse: separate;
    border-spacing: 0;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    inline-size: 100%;
    text-align: start;
  }

  /* The table repeats the chart's title as its caption for a reader who reaches it alone. */
  .sui-chart-table :global(caption) {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
  }

  .sui-chart-table :global(:is(th, td)) {
    border-block-end: var(--sui-stroke) solid var(--sui-chart-grid);
    padding: var(--sui-space-2);
  }

  /* Numbers line up at their end, and so do their headings. */
  .sui-chart-table :global(:is(td, thead th:not(:first-child))) {
    font-variant-numeric: tabular-nums;
    text-align: end;
  }

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    summary::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2) 0;
      position: absolute;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-chart-wait {
      animation: none;
      opacity: 0.68;
    }

    summary {
      transition: none;
    }
  }
</style>
