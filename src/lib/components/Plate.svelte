<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cubicOut } from 'svelte/easing';
  import Icon, { type IconName } from '../icons/Icon.svelte';

  let {
    title,
    level = 2,
    state,
    icon,
    tone = 'neutral',
    class: className = '',
    children,
    ...rest
  }: {
    title: string;
    /** The title's heading level, so the plate fits the outline of the page it is on. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** The plate's current state in words, said at the end of the title line and announced when it changes. */
    state?: string;
    /** A glyph before the state's words. */
    icon?: IconName;
    /** The state's tone: its glyph wears every tone, and its words wear a warning or a danger. */
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    /** Layout for the call site only, never the plate's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
    children?: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();

  // A new state fades in where the old one stood, so a change reads as a change. Svelte plays it
  // only when `state` changes, never on the first paint.
  function arrive(_node: Element) {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The built stylesheet may write the token in seconds (`.16s`).
    const time = getComputedStyle(document.documentElement)
      .getPropertyValue('--sui-duration-fast')
      .trim();
    const duration = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
    return {
      duration: still || !duration ? 0 : duration,
      easing: cubicOut,
      css: (t: number) => `opacity: ${t}`
    };
  }
</script>

<!--
@component
A titled ground for one subject, with its state said on the same line as its name. The
head is always drawn and the body is optional: a plate with nothing in it is a subject with
nothing to report yet, which is a state worth showing rather than a hole to hide.

A plate is a place, not a message: it never stands for a loading, empty or error message,
which take a `Skeleton`, an `EmptyState` or an `ErrorState` in the place of what they replace,
and it never sits inside a detail pane, whose parts are `Section`s. It holds no other framed
surface (L-55). Something the reader must act on now is a `Callout` beside it. It carries the one-pixel plate lift, which a `Card` does not, and like a card it
takes its outer spacing from its container. Its content stands one 16px inset from all four
edges, to the ink. The state centres on the title's first line at every width and, while its
lines fit beside the title's, lends the head no height, so the title and the body stand where
they stand with no state (L-34). Short of
room, the title keeps one line while it fits in 60% of the head and the state while it fits
in 40%, so a short name stays whole, and past that each wraps within its share, the name in
the larger one. The state sits in a polite status region, so a change of state
is announced without moving focus; pass `state` from the first render, because a region that
arrives with its words is often not read.

- Semantics: a `section` titled by a heading at `level`, with the state in a `role="status"` region.
- Content: a title that wraps, a `state` in words with an optional `icon` that wears its `tone`, and an optional body.
- States: head only, with no rule, or head and body, under one title size; the state's own words say what it is.
- Keyboard: none of its own; Tab reaches the controls inside in reading order.
- Pointer and touch: none of its own; the controls inside keep their own targets.
- Focus: nothing here moves focus, and an announced change of state leaves focus where it is.
- Responsive: the state stays on the title's first line until the plate is under 12rem wide, as with text at twice its size, where it stands under the title; beside it, the title keeps one line while it fits in 60% of the head and the state while it fits in 40%, and past that each wraps within its share, the state's words in balanced lines.
- Accessibility: a change of `state` is announced politely, and the title and state hold 4.5:1.
- Localization: it draws no words of its own; the state sits at the inline end, which mirrors in a right-to-left page.
- Performance: static layout; a change of state fades its words in on opacity alone, and not at all under reduced motion.
- Analytics: none of its own, because it holds no control.
- Failure: without a body the plate still names its subject and state, which is how it shows nothing to report; content inside it that failed to load says so in one quiet sentence or an `ErrorState overContent`, never in another frame.
-->

<section {...rest} class={['sui-plate', className, { 'head-only': !children }]}>
  <header class="sui-plate-head">
    <svelte:element this={`h${level}`} class="sui-plate-title"
      ><span class="sui-plate-name">{title}</span></svelte:element
    >
    {#if state}
      <div class="sui-plate-status" role="status">
        {#key state}
          <div class="sui-plate-said" data-tone={tone} in:arrive>
            {#if icon}<Icon name={icon} size="sm" />{/if}<span class="sui-plate-words">{state}</span
            >
          </div>
        {/key}
      </div>
    {/if}
  </header>
  {#if children}
    <div class="sui-plate-body">{@render children()}</div>
  {/if}
</section>

<style>
  /* The plate owns its 16px inset, as a card owns its own, so whatever it holds stands that far
     from all four edges, to the ink. */
  .sui-plate {
    background: var(--sui-surface-base);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-plate);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    container-type: inline-size;
    margin: 0;
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }

  /* The state follows the title on its first line at every width. Short of room, the title
     keeps 60% of the head and the state 40%, each less half the gap, or less where its one
     line needs less. The rule under the head runs the plate's full width. */
  .sui-plate-head {
    align-items: start;
    border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
    box-sizing: border-box;
    column-gap: var(--sui-space-3);
    display: flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-card-title)
      var(--sui-sans);
    justify-content: space-between;
    margin-inline: calc(-1 * var(--sui-space-4));
    padding: 0 var(--sui-space-4) var(--sui-space-4);
  }

  /* With nothing under it the head draws no rule, and its title keeps its size, so a body that
     arrives later never resizes the plate's name. */
  .head-only .sui-plate-head {
    border-block-end: 0;
    padding-block-end: 0;
  }

  /* Its cap stands within half a pixel of its box's top, so a title that opens the plate keeps
     the inset to its ink. */
  .sui-plate-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    flex: 1 1000 auto;
    font: inherit;
    margin: 0;
    min-inline-size: auto;
    overflow-wrap: break-word;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* The floor sits on the name's own box, so the title's floor stays at least its longest
     word, which `calc-size()` alone cannot keep. */
  .sui-plate-name {
    display: block;
    min-inline-size: calc-size(max-content, min(size, 60cqi - var(--sui-space-3) / 2));
  }

  /* The state's box starts on the middle of the title's first cap band, in the title's face so
     `1cap` is its cap height, and its words reach back up by half their own first line: one
     line of state stands inside the title's line and lends the head no height, so the title
     and the body stand where they stand with no state, and only words that wrap past the
     title's own lines take room below them, inside the plate. */
  .sui-plate-status {
    align-items: start;
    display: flex;
    flex: 0 1 auto;
    min-inline-size: 0;
    min-inline-size: calc-size(max-content, min(size, 40% - var(--sui-space-3) / 2));
    padding-block-start: calc(round(up, 1cap, 2px) / 2);
  }

  /* In the state's own face, so `1cap` is its words' cap: the first line of its words centres
     on the seat, and words that wrap hang under it (L-94). A glyph beside them centres on
     their first line, so its box overflows that line evenly while its drawn ink stays inside. */
  .sui-plate-said {
    align-items: start;
    color: var(--sui-text-secondary);
    display: flex;
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    gap: var(--sui-space-2);
    margin-block-start: calc(round(up, 1cap, 2px) / -2);
    min-inline-size: 0;
  }

  .sui-plate-said > :global(svg) {
    flex: none;
    margin-block: calc((round(up, 1cap, 1px) - var(--sui-icon-sm)) / 2);
  }

  /* The glyph wears the tone so a plate that needs the reader is found at a glance. A state
     that needs the reader wears its tone's ink in its words too, as a setting row's problem
     does, while a quiet or a good state keeps the secondary ink (L-14). */
  [data-tone='success'] > :global(svg) {
    color: var(--sui-success);
  }

  [data-tone='warning'] {
    color: var(--sui-warning);
  }

  [data-tone='danger'] {
    color: var(--sui-danger);
  }

  /* The words' box rounds up to the pixel, so a state that ends the plate keeps the inset to
     its baseline. */
  .sui-plate-words {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* With too little room for both, as with text at twice its size, the state stands under the
     title from its start edge, at its own height (--sui-breakpoint-head). */
  @container (max-width: 12rem) {
    .sui-plate-head {
      flex-wrap: wrap;
      row-gap: var(--sui-row-copy-gap);
    }

    .sui-plate-title {
      flex-basis: 100%;
      min-inline-size: 0;
    }

    .sui-plate-status {
      flex: 1 1 100%;
      min-inline-size: 0;
      padding-block-start: 0;
    }

    .sui-plate-said {
      margin-block-start: 0;
    }
  }

  .sui-plate-body {
    min-inline-size: 0;
    padding-block-start: var(--sui-space-4);
  }

  /* Words that open or close the body start at their cap line and end at their baseline, so
     the ink stands the inset from the rule and from the bottom alike, as in a card. Without
     weight, so a component that trims its own words keeps both edges. A trimmed edge cuts a
     fraction of a pixel, so the box rounds up to the pixel and keeps the spare away from its
     trimmed edge, and an only paragraph splits that spare above its cap and under its baseline. */
  :where(.sui-plate-body) :global(:where(p, ul, ol, dl, blockquote):first-child) {
    block-size: var(--sui-block-snap);
    padding-block: var(--sui-block-snap-room-start);
    text-box: var(--sui-block-snap-trim, trim-start cap alphabetic);
  }

  :where(.sui-plate-body) :global(:where(p, ul, ol, dl, blockquote):last-child) {
    align-content: end;
    block-size: var(--sui-block-snap);
    padding-block: var(--sui-block-snap-room-end);
    text-box: var(--sui-block-snap-trim, trim-end cap alphabetic);
  }

  :where(.sui-plate-body) :global(:where(p, ul, ol, dl, blockquote):only-child) {
    align-content: center;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
