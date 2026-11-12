<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
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
    /** The state's tone, worn by its glyph only, so the words keep the secondary ink. */
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    /** Layout for the call site only, never the plate's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
    children?: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
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
edges, to the ink. The state centres on the title's first line at every width and lends the
head no height, so the title and the body stand where they stand with no state. Short of
room, the title and the state each keep one line while that line fits in half the head, so a
short name stays whole and a long one wraps first. The state sits in a polite status region, so a change of state
is announced without moving focus; pass `state` from the first render, because a region that
arrives with its words is often not read.

- Semantics: a `section` titled by a heading at `level`, with the state in a `role="status"` region.
- Content: a title that wraps, a `state` in words with an optional `icon` that wears its `tone`, and an optional body.
- States: head only, with no rule, or head and body, under one title size; the state's own words say what it is.
- Keyboard: none of its own; Tab reaches the controls inside in reading order.
- Pointer and touch: none of its own; the controls inside keep their own targets.
- Focus: nothing here moves focus, and an announced change of state leaves focus where it is.
- Responsive: the state stays on the title's first line until the plate is under 12rem wide, as with text at twice its size, where it stands under the title; beside it, the title and the state each keep one line while it fits in half the head, the title wraps first past that, and the state's words wrap in balanced lines.
- Accessibility: a change of `status` is announced politely, and the title and state hold 4.5:1.
- Localization: it draws no words of its own; the state sits at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script.
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
        <div class="sui-plate-said" data-tone={tone}>
          {#if icon}<Icon name={icon} size="sm" />{/if}<span class="sui-plate-words">{state}</span>
        </div>
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

  /* The state follows the title on its first line at every width. Short of room, the title and
     the state each keep one line while it fits in half the head; past that the title gives up
     width first. The rule under the head runs the plate's full width. */
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

  /* A name that fits in half the head never wraps (`sign()` is 1 when it fits, else 0); one
     that does not falls back to its longest word, as the title's own floor. */
  .sui-plate-name {
    display: block;
    min-inline-size: calc-size(
      max-content,
      size * max(0, sign(50cqi - var(--sui-space-3) / 2 - size + 0.5px))
    );
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
    min-inline-size: calc-size(max-content, min(size, 50% - var(--sui-space-3) / 2));
    padding-block-start: calc(round(up, 1cap, 2px) / 2);
  }

  /* In the state's own face, so `1cap` is its words' cap: the first line of its words centres
     on the seat, and words that wrap hang under it (L-94). A glyph beside them centres on
     their first line, so its box overflows that line evenly while its drawn ink stays inside. */
  .sui-plate-said {
    align-items: start;
    color: var(--sui-text-secondary);
    display: flex;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    gap: var(--sui-space-2);
    margin-block-start: calc(round(up, 1cap, 2px) / -2);
    min-inline-size: 0;
  }

  .sui-plate-said > :global(svg) {
    flex: none;
    margin-block: calc((round(up, 1cap, 1px) - var(--sui-icon-sm)) / 2);
  }

  /* The glyph wears the tone so a plate that needs the reader is found at a glance, and the
     words keep the secondary ink and still say the state (L-14). */
  [data-tone='success'] > :global(svg) {
    color: var(--sui-success);
  }

  [data-tone='warning'] > :global(svg) {
    color: var(--sui-warning);
  }

  [data-tone='danger'] > :global(svg) {
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
