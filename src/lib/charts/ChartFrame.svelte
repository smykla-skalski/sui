<script lang="ts">
  import { word } from '../words.js';
  import { onMount, type Snippet } from 'svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import ErrorState from '../components/ErrorState.svelte';
  import VisuallyHidden from '../components/VisuallyHidden.svelte';
  import { formatCount } from '../internal/locale.js';
  import '../internal/scroll-edge.css';
  import {
    css,
    faceInk,
    guessInk,
    inlined,
    type Ink,
    type Length,
    type Measure
  } from './geometry.js';
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
    emptyTitle = word('ChartFrame.emptyTitle', 'No chart data yet'),
    emptyDescription = word(
      'ChartFrame.emptyDescription',
      'Nothing has been recorded for this chart'
    ),
    emptyStep = word('ChartFrame.emptyStep', 'Values show here once they are recorded'),
    dataLabel = word('ChartFrame.dataLabel', 'View chart data'),
    loadingLabel = word('ChartFrame.loadingLabel', 'Loading chart data…'),
    refreshingLabel = word('ChartFrame.refreshingLabel', 'Updating…'),
    staleLabel = word('ChartFrame.staleLabel', 'These values may be out of date'),
    failedTitle = word('ChartFrame.failedTitle', 'Chart data could not load'),
    failedDescription = word('ChartFrame.failedDescription', 'Try again in a moment'),
    missingLabel = word('ChartFrame.missingLabel', (count: number) =>
      count === 1
        ? '1 missing value is left out'
        : `${formatCount(count)} missing values are left out`
    ),
    empty,
    missing = 0,
    plotSize,
    plot,
    children,
    table
  }: ChartFrameProps & {
    /** With no values to show, an empty state takes the place of the plot and its table. */
    empty: boolean;
    /** How many values the chart left out because they were missing or not numbers. */
    missing?: number;
    /** The plot's height for its measured text, which a placeholder keeps while the data
        loads. */
    plotSize: (measure: Measure) => Length;
    /** Draws the plot, laid out to its text as measured. */
    plot: Snippet<[measure: Measure]>;
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
  let band = $state<HTMLElement | null>(null);
  let mounted = $state(false);
  let faces = $state(0);
  let settled = $state(false);

  /* The table holds the face chart text is set in, so the server lays out its words exactly.
     Words in a face it does not hold, such as another script's, are guessed until the chart is
     on the page, then measured in the face they draw in, and again when a face loads. */
  const drawn = new Map<string, Ink>();
  const measure: Measure = (text, semibold = false) =>
    faceInk(text, semibold) ?? (mounted && band ? measured(band, text, semibold) : guessInk(text));

  function measured(band: HTMLElement, text: string, semibold: boolean): Ink {
    const look = getComputedStyle(band);
    const weight = semibold
      ? look.getPropertyValue('--sui-weight-semibold').trim()
      : look.fontWeight;
    const font = `${weight} 100px ${look.fontFamily}`;
    const key = `${faces} ${font} ${text}`;
    const known = drawn.get(key);
    if (known) return known;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return guessInk(text);
    context.font = font;
    const metrics = context.measureText(text);
    const ink = {
      advance: metrics.width / 100,
      left: metrics.actualBoundingBoxLeft / 100,
      right: metrics.actualBoundingBoxRight / 100,
      ascent: metrics.actualBoundingBoxAscent / 100,
      descent: metrics.actualBoundingBoxDescent / 100
    };
    drawn.set(key, ink);
    return ink;
  }

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
    mounted = true;
    const loaded = () => faces++;
    document.fonts.addEventListener('loadingdone', loaded);
    // A status region that enters the page with its words is often not read, so they wait.
    const timer = setTimeout(() => (settled = true), 100);
    return () => {
      clearTimeout(timer);
      document.fonts.removeEventListener('loadingdone', loaded);
    };
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
    <div
      bind:this={band}
      class="plot-band sui-chart-wait"
      style:--sui-local-plot={css(inlined(plotSize(measure)))}
      aria-hidden="true"
    ></div>
  {:else if empty}
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      {...emptyAction ? { action: emptyAction } : { step: emptyStep }}
    />
  {:else}
    <div bind:this={band} class="plot-band">
      <!-- A box that scrolls takes a stop so a keyboard can scroll it, as WCAG 2.1.1 asks. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        bind:this={scroller}
        class="plot-scroll sui-scroll-edge"
        dir="ltr"
        bind:contentRect={frame}
        tabindex={scrolls ? 0 : undefined}
        role={scrolls ? 'region' : undefined}
        aria-labelledby={scrolls ? headingId : undefined}
      >
        {@render plot(measure)}
      </div>
    </div>
    {@render children?.()}
    <details bind:open ontoggle={() => ontableopenchange?.(open)}>
      <summary><span>{dataLabel}</span></summary>
      <!-- A box that scrolls takes a stop so a keyboard can scroll it, as WCAG 2.1.1 asks. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        bind:this={tableBox}
        class="sui-chart-table sui-scroll-edge"
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
  /* A surface that holds the chart lends its inline inset to its direct children here, as a
     card does. It does not inherit, so a chart nested deeper in a grid never reaches past its
     own column. */
  @property --sui-local-bleed {
    syntax: '<length>';
    inherits: false;
    initial-value: 0px;
  }

  .sui-chart {
    --sui-local-chart-bleed: var(--sui-local-bleed);
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
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  figcaption p,
  .sui-chart-note {
    align-content: center;
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

  /* The plot stands on a band of the chart's own ground, so a reader sees where the chart
     starts and ends. The band reaches the edges of the surface that lends its inset, and the
     plot pads back by it, so the plot keeps the title's edges and its ink stands the same room
     from all four sides of the band. The plot scrolls inside the band, so an edge fade fades
     the plot and never the band. Chart text is set here, also for a placeholder, whose height
     is laid out in the same ems. Each character draws its own glyph, with no ligature or
     contextual form, so the face's table places every word as the browser draws it. */
  .plot-band {
    --sui-local-band-pad: max(var(--sui-local-chart-bleed), var(--sui-space-4));
    background: var(--sui-chart-ground);
    border-radius: var(--sui-radius-control);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
    font-variant-ligatures: none;
    margin-inline: calc(-1 * var(--sui-local-chart-bleed));
    min-inline-size: 0;
  }

  /* A band that reaches its holder's edges runs square into them. */
  @container not style(--sui-local-bleed: 0px) {
    .plot-band {
      border-radius: 0;
    }
  }

  /* Inline-size containment keeps the drawn width out of the frame's own sizing, so a measured
     plot never holds its container open. */
  .plot-scroll {
    border-radius: inherit;
    contain: inline-size;
    overflow-x: auto;
    padding: var(--sui-local-band-pad);
  }

  .plot-scroll:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* Forced colors drop the band's ground, so a line above and below it keeps the plot's row
     apart, inside the band's own height. */
  @media (forced-colors: active) {
    .plot-band {
      border-block: var(--sui-stroke) solid CanvasText;
    }

    .plot-scroll {
      padding-block: calc(var(--sui-local-band-pad) - var(--sui-stroke));
    }
  }

  /* While the data loads, the band itself is the placeholder: it keeps the band's place, size
     and shape, so nothing moves when the plot arrives, takes the placeholder veil, and the light
     that crosses every placeholder crosses it. Only the light moves, by transform, so the
     compositor runs it. */
  .sui-chart-wait {
    background: var(--sui-placeholder);
    block-size: calc(var(--sui-local-plot) + 2 * var(--sui-local-band-pad));
    box-sizing: border-box;
    overflow: clip;
    position: relative;
  }

  .sui-chart-wait::after {
    animation: sui-chart-sheen var(--sui-duration-shimmer) var(--sui-ease-linear) infinite;
    background: var(--sui-placeholder-sheen);
    content: '';
    inset-block: 0;
    inset-inline: calc(-1 * var(--sui-placeholder-reach));
    position: absolute;
  }

  .sui-chart-wait:dir(rtl)::after {
    scale: -1 1;
  }

  @keyframes sui-chart-sheen {
    from {
      transform: translateX(-50%);
    }

    to {
      transform: translateX(50%);
    }
  }

  /* Forced colors drop the veil, so the waiting band keeps its shape by an outline, as every
     placeholder does. A band that reaches its holder's edges keeps only the lines above and
     below it, since the holder's own keyline closes its sides. */
  @media (forced-colors: active) {
    .sui-chart-wait {
      border-block: 0;
      outline: var(--sui-stroke) solid GrayText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }

    @container not style(--sui-local-bleed: 0px) {
      .sui-chart-wait {
        border-block: var(--sui-stroke) solid GrayText;
        outline: none;
      }
    }
  }

  /* A block-level flex box, so no line box rounds the disclosure's height off the pixel. It has
     no frame or ground at rest, so it hands back the room above and below its words: they
     stand one gap under the legend and their baseline, to the nearest pixel, on a card's
     inset, and only its pressed or hovered ground reaches past them (L-33). */
  summary {
    align-items: center;
    border-radius: var(--sui-radius-control);
    color: var(--sui-brand-action-text);
    cursor: pointer;
    display: flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-compact)
      var(--sui-sans);
    inline-size: fit-content;
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-control-height-chip)) / 2)
      calc(
        (round(up, 1cap, 2px) - var(--sui-control-height-chip)) / 2 -
          round((round(up, 1cap, 2px) - 1cap) / 2, 1px)
      );
    margin-inline: calc(-1 * var(--sui-space-2));
    min-block-size: var(--sui-control-height-chip);
    padding-inline: var(--sui-space-2);
    position: relative;
    transition: box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  /* An even box in the even control, so the room above and under the words halves to whole
     pixels (L-95). */
  summary > span {
    align-content: center;
    block-size: var(--sui-block-snap-even);
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
    .sui-chart-wait::after {
      animation: none;
      content: none;
    }

    summary {
      transition: none;
    }
  }
</style>
