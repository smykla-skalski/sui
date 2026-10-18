<script lang="ts">
  import { word } from '../words.js';
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
    slowLabel = word('Skeleton.slowLabel', 'Still loading, this is taking longer than usual'),
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
    /** Announced once the rows arrive, so a reader knows the wait is over. */
    loadedLabel?: string;
    /** How long, in milliseconds, before the pulse stops and the wait says it is slow. */
    patience?: number;
    /** Drawn in the first row and announced once the wait outlasts `patience`. */
    slowLabel?: string;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    /** The loaded content, drawn in the same busy region once `loading` ends. */
    children?: Snippet;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  /* Many screen readers skip a live region that enters the page with its words, so the
     words wait until the region has been in the page a moment. 100ms is the delay React
     Aria's announcer uses for the same reason. */
  const SETTLE = 100;

  let settled = $state(false);
  let slow = $state(false);
  // Only a wait the reader saw ends with the loaded words.
  let waited = $state(false);

  $effect(() => {
    const timer = setTimeout(() => (settled = true), SETTLE);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    slow = false;
    if (!loading) return;
    waited = true;
    const timer = setTimeout(() => (slow = true), patience);
    return () => clearTimeout(timer);
  });

  const said = $derived(
    !settled ? '' : loading ? (slow ? slowLabel : label) : waited ? loadedLabel : ''
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
so the page does not move when the rows arrive; set `rowHeight` for any other row. Every
placeholder shares one pulse, which stops under reduced motion. Use it only where the shape
of what is coming is already known.

- Semantics: a `div` that is `aria-busy` while loading, beside a polite `status` that speaks for it.
- Content: `rows` placeholder rows of the loaded row's height, with two bars each or none, and the loaded `children` in their place.
- States: waiting (one shared pulse), slow (the pulse stops and the first row says `slowLabel`), and loaded (the children, with `loadedLabel` announced).
- Keyboard: none; placeholders take no focus.
- Pointer and touch: none; placeholders take no presses.
- Focus: it never takes focus, and the loaded rows arrive without moving it.
- Responsive: the bars are fractions of the row's width, capped at 13rem and 6rem, so they fit any column.
- Accessibility: the placeholders are hidden from assistive technology, and the status says what is awaited, when the wait is slow and when it ends.
- Localization: `label`, `loadedLabel` and `slowLabel` carry the built-in words, and the bars start at the inline start and end, mirrored in a right-to-left page.
- Performance: one opacity pulse on the row group, never per bar, for at most `patience` milliseconds, and none under reduced motion.
- Analytics: none; the list it holds reports its own outcomes.
- Failure: a wait past `patience` says it is slow in words instead of pulsing forever; a failed load is the caller's `ErrorState` in its place.
-->

<div {...rest} class={['sui-skeleton', className]} aria-busy={loading}>
  {#if loading}
    <div
      class={['sui-skeleton-rows', { bars, slow }]}
      style:--sui-skeleton-row={rowHeight}
      aria-hidden="true"
    >
      {#each { length: rows }, index (index)}
        <span data-slow={slow && index === 0 ? slowLabel : undefined}></span>
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
     in the face that row is set in. */
  .sui-skeleton-rows {
    --sui-skeleton-row: calc(
      2 * round(up, 1cap, 1px) + var(--sui-row-copy-gap) + 2 * var(--sui-row-pad-default) +
        var(--sui-row-hairline)
    );
    animation: sui-skeleton-pulse var(--sui-duration-shimmer) var(--sui-ease-inout) infinite
      alternate;
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    margin-block-end: calc(-1 * var(--sui-row-pad-default));
  }

  .sui-skeleton-rows > span {
    block-size: var(--sui-skeleton-row);
    border-block-end: var(--sui-row-hairline) solid var(--sui-border-divider);
    box-sizing: border-box;
    display: block;
    position: relative;
  }

  .sui-skeleton-rows > span:last-child {
    border-block-end: 0;
  }

  .bars > span::before,
  .bars > span::after {
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

  .bars > span::after {
    inline-size: min(6rem, 20%);
    inset-inline: auto 0;
  }

  /* A slow wait stops pulsing and says so where the first row's bars were. */
  .slow {
    animation: none;
    opacity: 1;
  }

  /* The words are drawn as the bars are, because the status beside the region speaks them. */
  .sui-skeleton-rows > span[data-slow]::before {
    background: none;
    block-size: fit-content;
    border: 0;
    border-radius: 0;
    color: var(--sui-text-secondary);
    content: attr(data-slow);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    inline-size: auto;
    inset-block: 0;
    inset-inline: 0;
    margin-block: auto;
    overflow-wrap: anywhere;
    position: absolute;
  }

  .sui-skeleton-rows > span[data-slow]::after {
    content: none;
  }

  /* High contrast drops the bars' ground, so they keep an outline of their shape there. */
  @media (forced-colors: active) {
    .bars > span::before,
    .bars > span::after {
      border: var(--sui-stroke) solid GrayText;
    }
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
