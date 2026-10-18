<script lang="ts">
  import { mark, word } from '../words.js';
  import { formatCount } from '../internal/locale.js';
  import Count from '../internal/Count.svelte';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    level = 2,
    description,
    count,
    actions,
    id,
    countedName = word(
      'Section.countedName',
      (title: string, count: string) => `${title}${mark('space')}${count}`
    ),
    class: className = '',
    children,
    ...rest
  }: {
    /** The heading, in sentence case. */
    title: string;
    /** The heading level, so the section fits the outline of the page; it never changes the title's size. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** The title's second line: one quiet sentence about what the section holds. */
    description?: string;
    /** How many things the section holds, drawn beside the title in the page's number format. */
    count?: number;
    /** Controls at the head's end. They centre on the title's cap band and never raise the head. */
    actions?: Snippet;
    /** The heading's id, so a list inside can take it as its name or a contents link can point at it. */
    id?: string;
    /** A counted title's heading name from the title and the count, in the language's order. */
    countedName?: (title: string, count: string) => string;
    /** Layout for the call site only, never the section's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
    children: Snippet;
  } & Omit<
    HTMLAttributes<HTMLElement>,
    'title' | 'children' | 'role' | 'aria-label' | 'aria-labelledby'
  > = $props();
</script>

<!--
@component
The default container on a pane: a heading, an optional one-line description and the content,
with no frame, ground or line. A card is earned by one of its few uses; everything else,
lists, settings, facts, charts and mixed content, stands in a section, and hierarchy comes
from type and space alone.

The title is 17px 600 in the caller's sentence case, and 15px 600 in a sub-section, a
section inside another one's content; the content stands 16px under the title's ink. The
size follows the nesting a reader sees and `level` the page's outline, so a pane whose
sections start at h3 still draws them at the section tier. A `description` is the title's
second line, as far below it as the title's own lines stand apart plus 8px. A `count` stands
beside the title as a tab's does. `actions` stand at the head's end, centred on the title's
cap band, and reach above and below it rather than raise the head, so keep them to a link or
a quiet button.

A section stands `--sui-rhythm-section-gap` above the section that follows it, so a page
needs no wrapper and a page header before the first keeps its own gap. A sub-section stands
`--sui-rhythm-subsection-gap` under whatever comes before it. A grid or flex parent's own gap
adds to this space, so stack sections in plain flow. A list inside hangs from the section,
its words on the title's edge.

- Semantics: a `section` with no accessible name, so it is never a landmark region; the title is a heading at `level`, named with its count when it has one.
- Content: a title, an optional description, count and head actions, and the content; the title and the description wrap.
- States: none of its own; it draws no hover, selection or frame.
- Keyboard: none of its own; Tab reaches the actions, then the content, in reading order.
- Pointer and touch: none of its own; the actions keep their own targets, which grow on a phone without moving the head.
- Focus: nothing here moves focus.
- Responsive: a container query on the section's own width keeps the actions beside the copy and moves them under it, from the start edge, below 18rem; the gaps between sections step down on a phone.
- Accessibility: the heading keeps the page's outline; the count is part of the heading's name; the title and the description hold 4.5:1.
- Localization: `countedName` joins the title and the count, which follows the page's number format; the actions sit at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script; each section is its own size container.
- Analytics: none of its own; its actions and content report their own outcomes.
- Failure: a section with nothing to show draws one quiet sentence, an `EmptyState` or an `ErrorState` in its content's place, never an empty body.
-->

<section {...rest} class={['sui-section', className]}>
  <div class="sui-section-head">
    <div class="sui-section-copy">
      <svelte:element
        this={`h${level}`}
        {id}
        class="sui-section-title"
        aria-label={count === undefined ? undefined : countedName(title, formatCount(count))}
        ><span class="sui-section-words">{title}</span>{#if count !== undefined}<span
            class="sui-section-count"><Count value={count} /></span
          >{/if}</svelte:element
      >
      {#if description !== undefined}
        <p class="sui-section-note">{description}</p>
      {/if}
    </div>
    {#if actions}
      <div class="sui-section-seat">
        <div class="sui-section-actions">{@render actions()}</div>
      </div>
    {/if}
  </div>
  <div class="sui-section-body">{@render children()}</div>
</section>

<style>
  .sui-section {
    container-type: inline-size;
    min-inline-size: 0;
  }

  /* A section spaces itself from the next one, so a page needs no wrapper, and a page header
     before the first keeps its own gap. A section inside another stands the sub-section gap
     under whatever comes before it, the outer section's copy too. */
  .sui-section:has(+ :global(.sui-section)) {
    margin-block-end: var(--sui-local-section-gap, var(--sui-rhythm-section-gap));
  }

  :where(.sui-section:not(:first-child)) {
    margin-block-start: var(--sui-local-section-gap, 0px);
  }

  /* What a section inside this one reads: the sub-section gap and the sub-section title. */
  .sui-section-body {
    --sui-local-section-gap: var(--sui-rhythm-subsection-gap);
    --sui-local-section-size: var(--sui-font-size-body);
    --sui-local-section-leading: var(--sui-leading-meta);
    min-inline-size: 0;
  }

  /* The copy keeps one column and the actions another, so the note never runs under an
     action; the copy keeps 10rem beside them. */
  .sui-section-head {
    align-items: start;
    column-gap: var(--sui-space-6);
    display: grid;
    grid-template-columns: minmax(min(10rem, 100%), 1fr) auto;
    margin-block-end: var(--sui-space-4);
  }

  .sui-section-copy {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-section-title {
    align-items: start;
    color: var(--sui-text-primary);
    column-gap: var(--sui-space-2);
    display: flex;
    font: var(--sui-weight-semibold)
      var(--sui-local-section-size, var(--sui-font-size-card-title)) /
      var(--sui-local-section-leading, var(--sui-leading-card-title)) var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
  }

  /* Its cap stands within half a pixel of its box's top, so the head's first ink is the
     section's first ink. */
  .sui-section-words {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* Beside a seat on its cap band, the words take the seat's even parity, so whatever sits
     there centres on them to the pixel. */
  .sui-section-title:has(> .sui-section-count) > .sui-section-words {
    block-size: var(--sui-block-snap-even);
  }

  /* Proximity: a wrapped title's lines stand 1lh - 1cap apart in ink, so the note stands that
     far plus the copy gap and the title reads as one block (L-24). Taken from the title's own
     line height, it holds when a reader raises line spacing (WCAG 1.4.12). */
  .sui-section-title:has(+ .sui-section-note) {
    margin-block-end: round(calc(1lh - 1cap), 1px);
  }

  /* A zero-height seat on the middle of the first line's cap band, in the title's face so
     `1cap` is its cap height: the count centres on it and stays by the first line when the
     title wraps. */
  .sui-section-count,
  .sui-section-seat {
    align-items: center;
    block-size: 0;
    display: flex;
    flex: none;
    margin-block-start: calc(round(up, 1cap, 2px) / 2);
  }

  .sui-section-seat {
    font: var(--sui-weight-semibold)
      var(--sui-local-section-size, var(--sui-font-size-card-title)) / var(--sui-leading-flat)
      var(--sui-sans);
    grid-column: 2;
  }

  /* The seat's face only measures the cap; the actions take the control tier, so a link here
     reads as a control and not as a second title. */
  .sui-section-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-compact)
      var(--sui-sans);
    gap: var(--sui-space-2);
    justify-content: flex-end;
  }

  /* A lone ghost button draws nothing at rest, so it stays drawn at the pointer's tier on a
     phone and grows only its hit area (WCAG 2.5.8): it reaches no further above and below the
     title than on a desktop, clear of the content under it. */
  .sui-section-actions:has(> :global(.sui-button[data-tone='ghost']):only-child) {
    --sui-local-button-seat: var(--sui-control-height-drawn);
  }

  @container not (max-width: 18rem) {
    .sui-section-head:has(> .sui-section-seat) .sui-section-words {
      block-size: var(--sui-block-snap-even);
    }
  }

  /* Too narrow for both, the actions take a line of their own under the copy, from its start
     edge (L-90), and keep their own box. */
  @container (max-width: 18rem) {
    .sui-section-head {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--sui-rhythm-head-actions-stacked);
    }

    .sui-section-seat {
      block-size: auto;
      grid-column: 1;
      margin-block-start: 0;
    }

    .sui-section-actions {
      justify-content: flex-start;
    }
  }

  .sui-section-note {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  /* Words that open the content start at their cap line, so the content's first ink stands
     16px under the title's baseline, and words that close it, or stand before a sub-section,
     end at their baseline, so the gap after them runs ink to ink. Without weight, so a
     component that trims its own words keeps them; the box rounds up to the pixel (L-95). */
  :where(.sui-section-body)
    > :global(
      :where(p, ul, ol, dl, blockquote):where(:first-child, :last-child, :has(+ .sui-section))
    ) {
    block-size: var(--sui-block-snap);
  }

  :where(.sui-section-body) > :global(:where(p, ul, ol, dl, blockquote):first-child) {
    text-box: trim-start cap alphabetic;
  }

  :where(.sui-section-body)
    > :global(:where(p, ul, ol, dl, blockquote):where(:last-child, :has(+ .sui-section))) {
    text-box: trim-end cap alphabetic;
  }

  :where(.sui-section-body)
    > :global(
      :where(p, ul, ol, dl, blockquote):first-child:where(:last-child, :has(+ .sui-section))
    ) {
    text-box: trim-both cap alphabetic;
  }
</style>
