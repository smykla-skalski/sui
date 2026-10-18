<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    level = 2,
    status,
    class: className = '',
    children,
    ...rest
  }: {
    title: string;
    /** The title's heading level, so the plate fits the outline of the page it is on. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** The plate's current state, said at the end of the title line and announced when it changes. */
    status?: Snippet;
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

A plate is a place, not a message. Something the reader must act on now is a `Callout`
inside it. It carries the one-pixel plate lift, which a `Card` does not, and like a card it
takes its outer spacing from its container. Its content stands one 16px inset from all four
edges, to the ink. The state centres on the title's first line without raising the head, and
one that does not fit beside a long title moves under it, as far below as the title's lines
stand apart plus the 8px copy gap, so the title reads as one block. The state sits in a polite
status region, so a change of state is announced without moving focus; pass `status` from the
first render, because a region that arrives with its words is often not read.

- Semantics: a `section` titled by a heading at `level`, with the state in a `role="status"` region.
- Content: a title that wraps, a `status` with words and an optional glyph, and an optional body.
- States: head only, a step smaller and with no rule, or head and body; the state's own words say what it is.
- Keyboard: none of its own; Tab reaches the controls inside in reading order.
- Pointer and touch: none of its own; the controls inside keep their own targets.
- Focus: nothing here moves focus, and an announced change of state leaves focus where it is.
- Responsive: the state follows the title on its line, and moves under a title that leaves it no room.
- Accessibility: a change of `status` is announced politely, and the title and state hold 4.5:1.
- Localization: it draws no words of its own; the state sits at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script.
- Analytics: none of its own, because it holds no control.
- Failure: without a body the plate still names its subject and state, which is how it shows nothing to report.
-->

<section {...rest} class={['sui-plate', className, { 'head-only': !children }]}>
  <header class="sui-plate-head">
    <svelte:element this={`h${level}`} class="sui-plate-title">{title}</svelte:element>
    {#if status}
      <div class="sui-plate-status" role="status">{@render status()}</div>
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
    margin: 0;
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }

  /* The state follows the title on its line, or moves under it, as far below a wrapped title
     as the title's lines stand apart plus the copy gap, so the title reads as one block. The
     rule under the head runs the plate's full width. */
  .sui-plate-head {
    align-items: center;
    border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-card-title)
      var(--sui-sans);
    gap: calc(round(calc(1lh - 1cap), 1px) + var(--sui-row-copy-gap)) var(--sui-space-3);
    justify-content: space-between;
    margin-inline: calc(-1 * var(--sui-space-4));
    padding: 0 var(--sui-space-4) var(--sui-space-4);
  }

  /* With nothing under it the title is a label, a step below a card title. */
  .head-only .sui-plate-head {
    border-block-end: 0;
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    padding-block-end: 0;
  }

  /* Its cap stands within half a pixel of its box's top, so a title that opens the plate keeps
     the inset to its ink. */
  .sui-plate-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: inherit;
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* As tall as its words, so on the title's line it centres on the title without raising the
     head, and under a long title its last baseline keeps the inset. A glyph beside the words
     centres on their first line (L-94), so its box overflows that line evenly while its drawn
     ink stays inside. */
  .sui-plate-status {
    align-items: center;
    block-size: var(--sui-block-snap);
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  .sui-plate-body {
    min-inline-size: 0;
    padding-block-start: var(--sui-space-4);
  }

  /* Words that open or close the body start at their cap line and end at their baseline, so
     the ink stands the inset from the rule and from the bottom alike, as in a card. Without
     weight, so a component that trims its own words keeps both edges. A trimmed edge cuts a
     fraction of a pixel, so the box rounds up to the pixel and an only paragraph splits that
     spare above its cap and under its baseline. */
  :where(.sui-plate-body) :global(:where(p, ul, ol, dl, blockquote):first-child) {
    block-size: var(--sui-block-snap);
    text-box: trim-start cap alphabetic;
  }

  :where(.sui-plate-body) :global(:where(p, ul, ol, dl, blockquote):last-child) {
    text-box: trim-end cap alphabetic;
  }

  :where(.sui-plate-body) :global(:where(p, ul, ol, dl, blockquote):only-child) {
    align-content: center;
    text-box: trim-both cap alphabetic;
  }
</style>
