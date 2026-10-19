<script lang="ts">
  import { mark, word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    loading = true,
    rows = 6,
    rowHeight,
    bars = true,
    label = word('Skeleton.label', 'Loading…'),
    loadedLabel = word('Skeleton.loadedLabel', 'Loaded'),
    patience = 10_000,
    slowLabel = word('Skeleton.slowLabel', 'Still loading'),
    slowDescription = word('Skeleton.slowDescription', 'This is taking longer than usual'),
    class: className = '',
    children,
    ...rest
  }: {
    /** The first answer has not come yet. Off draws `children` in the placeholders' place. */
    loading?: boolean;
    rows?: number;
    /** The height a loaded row will have. The default is an `ObjectRow` with a name and a line under it. */
    rowHeight?: string;
    /** Bars where a two-line row's name, its line under it and its side will be. Off draws one bar per row, for a list of one-line rows. */
    bars?: boolean;
    /** What is being waited for, announced rather than drawn. */
    label?: string;
    /** Announced once the rows arrive, so a reader knows the wait is over. */
    loadedLabel?: string;
    /** How long, in milliseconds, before the light stops and the wait says it is slow. `Infinity` never turns slow. */
    patience?: number;
    /** The slow wait's title, drawn in the first row where a name stands once the wait outlasts `patience`. */
    slowLabel?: string;
    /** Why the wait is slow, drawn under `slowLabel` where a two-line row's second line stands, and announced after it. */
    slowDescription?: string;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    /** The loaded content, drawn in the same busy region once `loading` ends. */
    children?: Snippet;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  /* Many screen readers skip a live region that enters the page with its words, so the
     words wait until the region has been in the page a moment. 100ms is the delay React
     Aria's announcer uses for the same reason. */
  const SETTLE = 100;

  let settled = $state(false);
  let late = $state(false);
  // Only a wait the reader saw ends with the loaded words.
  let waited = $state(false);

  $effect(() => {
    const timer = setTimeout(() => (settled = true), SETTLE);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    late = false;
    if (!loading) return;
    waited = true;
    // A timer clamps a delay past 2^31 - 1 ms to none, so a wait with no end sets none.
    if (patience <= 0 || !Number.isFinite(patience)) return;
    const timer = setTimeout(() => (late = true), patience);
    return () => clearTimeout(timer);
  });

  // A wait with no patience is slow from its first paint, which the server renders too.
  const slow = $derived(loading && (patience <= 0 || late));

  const said = $derived(
    !settled
      ? ''
      : loading
        ? slow
          ? `${slowLabel}${mark('stop')}${slowDescription}`
          : label
        : waited
          ? loadedLabel
          : ''
  );
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
own announcements, and `loadedLabel` follows once the rows arrive.

Its rows measure what an `ObjectList` of two-line rows will measure, last-row pull included,
so the page does not move when the rows arrive; set `rowHeight` for any other row. Each bar
stands where a row's words will stand, one cap tall. One soft diagonal light crosses every
placeholder in the reading direction, as one light over all of its bars, and holds still
under reduced motion. Use it only where the shape of what is coming is already known.

- Semantics: a `div` that is `aria-busy` while loading, beside a polite `status` that speaks for it.
- Content: `rows` placeholder rows of the loaded row's height, with bars for a two-line row's name, its line under it and its side, or one bar for a one-line row, and the loaded `children` in their place.
- States: waiting (the light crosses the bars), slow (the light stops and the first row says `slowLabel` where a name stands and `slowDescription` where the line under it stands, or the title alone in a one-line row), and loaded (the children, with `loadedLabel` announced).
- Keyboard: none; placeholders take no focus.
- Pointer and touch: none; placeholders take no presses.
- Focus: it never takes focus, and the loaded rows arrive without moving it.
- Responsive: the bars are fractions of the row's width, capped in rem, so they fit any column.
- Accessibility: the placeholders are hidden from assistive technology, and the status says what is awaited, when the wait is slow and when it ends; under forced colors each bar keeps an outline.
- Localization: `label`, `loadedLabel`, `slowLabel` and `slowDescription` carry the built-in words, and the slow words are announced joined by `marks.stop`; the bars start at the inline start, the side bar sits at the inline end and the light crosses in the reading direction, all mirrored in a right-to-left page.
- Performance: each bar shows its part of one light that only `transform` moves, so the compositor runs it, for at most `patience` milliseconds, and none under reduced motion.
- Analytics: none; the list it holds reports its own outcomes.
- Failure: a wait past `patience` says it is slow in words instead of sweeping forever; a failed load is the caller's `ErrorState` in its place.
-->

<div {...rest} class={['sui-skeleton', className]} aria-busy={loading}>
  {#if loading}
    <div
      class={['sui-skeleton-rows', { bars, slow }]}
      style:--sui-skeleton-row={rowHeight}
      aria-hidden="true"
    >
      {#each { length: rows }, index (index)}
        <span class="row">
          {#if slow && index === 0}
            <!-- Drawn here as the bars are, because the status beside the region speaks it. -->
            <span class="words"
              ><span class="title">{slowLabel}</span>{#if bars}<span>{slowDescription}</span
                >{/if}</span
            >
          {:else}
            <span class="main"
              ><span class="bar"></span>{#if bars}<span class="bar"></span>{/if}</span
            >
            {#if bars}<span class="bar side"></span>{/if}
          {/if}
        </span>
      {/each}
    </div>
  {:else}
    {@render children?.()}
  {/if}
</div>
<VisuallyHidden role="status">{said}</VisuallyHidden>

<style>
  .sui-skeleton {
    min-inline-size: 0;
  }

  /* Two trimmed lines of meta copy, each snapped up to the pixel as the row snaps them, the
     copy gap between them, the row padding and the hairline: exactly an `ObjectRow`, measured
     in the face that row is set in.

     The rows are the frame the light crosses: every bar shows the part of it that falls on
     the bar, so it reads as one light over the whole placeholder, and the rows clip it so it
     never widens the page. */
  .sui-skeleton-rows {
    --sui-skeleton-row: calc(
      2 * round(up, 1cap, 1px) + var(--sui-row-copy-gap) + 2 * var(--sui-row-pad-default) +
        var(--sui-row-hairline)
    );
    /* A row's bars: two lines of words one copy gap apart, or one line for plain rows. */
    --sui-skeleton-lines: calc(2 * round(up, 1cap, 1px) + var(--sui-row-copy-gap));
    /* What a row leaves above its first bar, on the pixel: the row padding for the default row,
       and the rest of the row under the bars, hairline band included. */
    --sui-skeleton-lead: round(
      down,
      calc((var(--sui-skeleton-row) - var(--sui-row-hairline) - var(--sui-skeleton-lines)) / 2),
      1px
    );
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    /* As a row list does, the rows always hand back what stands under their last bar, and
       hand back what stands above their first when their holder asks for its lead
       (`--sui-local-row-lead`), so the bars stand where the loaded words will. */
    margin-block: calc(sign(var(--sui-local-row-lead, 0px)) * var(--sui-skeleton-lead))
      calc(var(--sui-skeleton-lead) + var(--sui-skeleton-lines) - var(--sui-skeleton-row));
    overflow: clip;
    position: relative;
  }

  .sui-skeleton-rows:not(.bars) {
    --sui-skeleton-lines: round(up, 1cap, 1px);
  }

  /* The bars hang from the lead rather than centring in the row, so they land on whole pixels
     in a row of any height, and the slow words take the first line, where the name stands. */
  .row {
    align-items: start;
    border-block-end: var(--sui-row-hairline) solid var(--sui-border-divider);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-4);
    grid-template-columns: minmax(0, 1fr) min(5rem, 20%);
    min-block-size: var(--sui-skeleton-row);
    padding-block: var(--sui-skeleton-lead);
  }

  /* The last row draws no hairline but keeps its height, as a loaded last row does. A
     transparent line would not do, because forced colors paint it. */
  .row:last-child {
    border-block-end: 0;
  }

  .main {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  /* The bar's clip, not its overflow, holds the light: the light is laid out on the rows, so
     only a clip path reaches it. */
  .bar {
    background: var(--sui-placeholder);
    block-size: round(up, 1cap, 1px);
    border-radius: var(--sui-radius-pill);
    clip-path: inset(0 round var(--sui-radius-pill));
    display: block;
    inline-size: min(12rem, 50%);
  }

  .bar + .bar {
    inline-size: min(18rem, 80%);
  }

  /* Every other row is shorter, so the bars read as words rather than as a grid. */
  .row:nth-child(even) .bar:first-child {
    inline-size: min(9rem, 38%);
  }

  .row:nth-child(even) .bar + .bar {
    inline-size: min(14rem, 64%);
  }

  /* The side centres on the two lines, as a loaded row's side does. */
  .bar.side {
    inline-size: auto;
    margin-block-start: round(calc((var(--sui-skeleton-lines) - round(up, 1cap, 1px)) / 2), 1px);
  }

  .bar::after {
    animation: sui-skeleton-sheen var(--sui-duration-shimmer) var(--sui-ease-linear) infinite;
    background: var(--sui-placeholder-sheen);
    content: '';
    inset-block: 0;
    inset-inline: calc(-1 * var(--sui-placeholder-reach));
    position: absolute;
  }

  .bar:dir(rtl)::after {
    scale: -1 1;
  }

  .slow .bar::after {
    animation: none;
    content: none;
  }

  /* The slow words take a row's shape: a title where the name stands, in a name's ink, and a
     quieter line where the line under it stands, each cap to baseline on its bar's place. A
     one-line row keeps one line, the title, so it stays as tall as its neighbours; the status
     says the rest. */
  .words {
    color: var(--sui-text-muted);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    gap: var(--sui-row-copy-gap);
    grid-column: 1 / -1;
    overflow-wrap: anywhere;
  }

  .words > span {
    align-content: center;
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  .title {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
  }

  @keyframes sui-skeleton-sheen {
    from {
      transform: translateX(-50%);
    }

    to {
      transform: translateX(50%);
    }
  }

  /* High contrast drops the bars' ground, so they keep an outline of their shape there. */
  @media (forced-colors: active) {
    .bar {
      outline: var(--sui-stroke) solid GrayText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar::after {
      animation: none;
      content: none;
    }
  }
</style>
