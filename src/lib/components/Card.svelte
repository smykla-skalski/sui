<script lang="ts">
  import { mark, word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    description,
    level = 2,
    actions,
    footer,
    href,
    tone,
    unsaved = false,
    unsavedLabel = word('Card.unsavedLabel', 'Unsaved'),
    titleName = word(
      'Card.titleName',
      (title: string, unsaved: string) => `${title}${mark('comma')}${unsaved}`
    ),
    class: className = '',
    children,
    ...rest
  }: {
    title?: string;
    /** The title's second line: one quiet sentence about what the card holds. */
    description?: string;
    /** The title's heading level, so the card fits the outline of the page it is on. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** Controls beside the title. They centre on its cap line and never raise the head. */
    actions?: Snippet;
    /** A closing row of actions, held to the same cap-line track as the head. */
    footer?: Snippet;
    /** Makes the whole card a link to this address, named by its title, while controls inside stay pressable. */
    href?: string;
    /** `danger` marks the page's danger zone: a danger keyline and title, never a filled ground. */
    tone?: 'danger';
    /** Marks a card that holds changes not saved yet: `unsavedLabel` after its title and the unsaved keyline. */
    unsaved?: boolean;
    /** The word drawn after the title of an unsaved card, as `SettingRow` draws it. */
    unsavedLabel?: string;
    /** An unsaved card's heading name from its title and `unsavedLabel`, in the language's order. */
    titleName?: (title: string, unsaved: string) => string;
    /** Layout for the call site only, never the card's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
    children?: Snippet;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'title'> = $props();

  const id = $props.id();
</script>

<!--
@component
A framed box that a page earns, for one of five things only: a peer summary that links to its
page (`href`), a choice to pick, the one box on a bare page, an authored feed entry, and the
page's danger zone (`tone="danger"`). A list, a settings group, facts, a chart, an editor, a
disclosure, a message or an empty, loading or failed state never takes a card: reach for a
`Section` under a heading for those, and put a state in the place of what it replaces. A card
never holds another framed surface (L-55). Reach for `Plate` when one subject on an overview
has a state to say on its title line.

The box is the base ground, a subtle keyline and a 10px corner. The card owns its 20px inset,
16px once the card itself is 36rem wide or narrower, and never its outer spacing, so peers
take their 16px from the container's gap. It fills the width its container gives it and never
decides that width. It lends that inline inset to its body's direct children through
`--sui-local-bleed`, so a chart's band can reach the card's edges and pad back by it.

Whatever the card holds stands the same inset from all four keylines, to the ink a reader
sees (L-33): the first ink sits the inset below the top, the last the inset above the bottom,
and anything that reaches a side stops the inset short of it. The title is a heading at
`level`, balanced and trimmed to its cap height. A `description` is the title's second line,
as far below it as the title's own lines stand apart plus 8px, not the first line of the
body. The title's cap stands the inset below the top whatever stands beside it, as on the other
three sides, and a framed control or a switch in `actions` starts on that same line with its
end on the inset, so the head's first ink is level; a control taller than the title's line sets
the head's height, and the note stays under the title, never under the control's foot. A lone
ghost button or quiet icon button
draws nothing at rest, so its words or glyph keep the inset instead: it centres on the title's
cap band, its box stands as far past the end as above the title, and a ghost button stays
34px on a phone with a 44px hit area. Under a title that wraps past them the actions stay on
the first line. A `footer` row is as tall as its actions, so they keep the inset from the
bottom. A row list or a `Skeleton` that opens the card hands back what stands above its first
row's ink, as it hands back what stands below its last: the card lends the body's first child
`--sui-local-row-lead` and its last child `--sui-local-row-trail`, so a row that opens or
closes the card leaves only the inset beside its ink.

With `href` the whole card is one link through a layer under its content, as an `ObjectRow`
is: the title names it, the card takes the row's hover ground and the press, and the focus
ring draws on the card's own keyline. A control inside it, such as an `ActionMenu`, stays
pressable above the layer and never follows the link. A danger zone says what it is in its
title, such as "Danger zone", and holds the acts that cannot be undone, each a `stop` button.

- Semantics: a plain grouping box; the title is a heading at `level`; with `href`, an `a` under the content, named by the title through `aria-labelledby`.
- Content: an optional title, description, head actions, body and footer actions; the title and the description wrap; a linked card needs a title to name its link.
- States: rest; unsaved, which draws `unsavedLabel` after the title in the unsaved ink and gives the keyline the unsaved tint; danger, a danger keyline and title ink; with `href`, hover (the row's hover veil, where the pointer can hover), pressed (a deeper veil, the pressed inset and a 1px sink) and focus.
- Keyboard: without `href`, none of its own; with it, the card is one tab stop and Enter follows the link; then Tab reaches the controls inside in reading order.
- Pointer and touch: with `href`, the whole card is the link's target; the controls inside keep their own targets and press feedback.
- Focus: nothing here moves focus; a focused card link draws the 2px ring flush on the card's keyline, which takes the focus colour, as a bordered control does (L-41).
- Responsive: a container query on the card's own width steps the inset from 20px to 16px at 36rem, the head's actions centre on the title beside the copy and move under it below 18rem, and the footer's actions pack to the end.
- Accessibility: the unsaved and danger states are said in words, never by the keyline's colour alone, and the copy, the word and the danger title hold 4.5:1; a card link is heard once, by its title, with the rest of the card outside its name.
- Localization: `unsavedLabel` is a prop with an English default, and `titleName` joins it to the title; the actions sit at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script; each card is its own size container, and hover and press change only the veil, the inset shadow and a 1px sink.
- Analytics: none of its own; a card link is a plain `a`, so the page's navigation tracking hears it, and its actions report their own outcomes.
- Failure: a card with no title, body or footer draws an empty surface, an unsaved card without a title has nowhere to put its word, and a linked card without a title has no name, so give each one a title.
-->

<div {...rest} class={['sui-card-box', className]}>
  <div class={['sui-card', { unsaved, danger: tone === 'danger', linked: href !== undefined }]}>
    {#if href !== undefined}
      <a class="sui-card-hit" {href} aria-labelledby="{id}-title"></a>
    {/if}
    {#if title !== undefined || actions}
      <div class="sui-card-head">
        {#if title !== undefined || description !== undefined}
          <div class="sui-card-copy">
            {#if title !== undefined}
              <svelte:element
                this={`h${level}`}
                id="{id}-title"
                class="sui-card-title"
                aria-label={unsaved ? titleName(title, unsavedLabel) : undefined}
                ><span class="sui-card-words"
                  ><span>{title}</span>{#if unsaved}<span class="sui-card-unsaved"
                      >{unsavedLabel}</span
                    >{/if}</span
                ></svelte:element
              >
            {/if}
            {#if description !== undefined}
              <p class="sui-card-note">{description}</p>
            {/if}
          </div>
        {/if}
        {#if actions}
          <div class="sui-card-actions">{@render actions()}</div>
        {/if}
      </div>
    {/if}
    {#if children}
      <div class="sui-card-body">{@render children()}</div>
    {/if}
    {#if footer}
      <div class="sui-card-footer">{@render footer()}</div>
    {/if}
  </div>
</div>

<style>
  .sui-card-box {
    container-type: inline-size;
    min-inline-size: 0;
  }

  .sui-card {
    background: var(--sui-surface-base);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: flow-root;
    margin: 0;
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
  }

  /* The danger zone says so with its keyline and its title's ink and never with a ground, so
     its stop buttons keep their own fill (Primer's danger zone). */
  .danger {
    border-color: var(--sui-danger);
  }

  .danger .sui-card-title {
    color: var(--sui-danger);
  }

  .unsaved {
    border-color: var(--sui-unsaved-border);
  }

  /* The link comes first, so the content painted after it stacks above it without a z-index;
     the content lets the pointer through and its controls take it back, as in `ObjectRow`. */
  .linked {
    position: relative;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-card-hit {
    border-radius: inherit;
    color: inherit;
    inset: 0;
    position: absolute;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
  }

  .sui-card-hit:focus-visible {
    outline: none;
  }

  .linked > div {
    pointer-events: none;
    position: relative;
  }

  .linked
    :global(
      :is(a[href], button, input, select, textarea, label, summary, [role='button'], [tabindex])
    ) {
    pointer-events: auto;
  }

  /* A veil over the card's own ground, a row's step, because the card is a large target. */
  @media (hover: hover) {
    .sui-card:has(> .sui-card-hit:hover) {
      background-image: linear-gradient(var(--sui-row-hover), var(--sui-row-hover));
    }
  }

  .sui-card:has(> .sui-card-hit:active) {
    background-image: linear-gradient(var(--sui-row-pressed), var(--sui-row-pressed));
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-card:has(> .sui-card-hit:focus-visible) {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  @media (prefers-reduced-motion: reduce) {
    .linked {
      transition: none;
    }

    .sui-card:has(> .sui-card-hit:active) {
      translate: none;
    }
  }

  /* The title and the word "Unsaved" are one wrapping row: the column gap parts them, and a
     narrow card moves the word to the next line, flush with the title and one line's leading
     under it. Trim does not reach into a flex row, so each part trims its own words. */
  .sui-card-words {
    align-items: baseline;
    column-gap: var(--sui-space-2);
    display: flex;
    flex-wrap: wrap;
    row-gap: round(calc(1lh - 1cap), 1px);
  }

  .sui-card-words > span {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  /* The word, not a mark: a reader sees "Unsaved" whatever the keyline's tint, as on a setting
     row. */
  .sui-card-unsaved {
    color: var(--sui-unsaved-ink);
    font-weight: var(--sui-weight-regular);
  }

  /* The copy, the title and the note under it, keeps one column and the actions another, so
     the note never runs under an action. The title's cap opens the card at its inset, as every
     side's ink does, and a framed control's seat starts on that line too, so the head's first
     ink is level and nothing stands above the inset (L-33). The copy keeps 10rem beside the
     actions, so keep them to a short button or two. Only a card too narrow for both puts them
     on a line of their own under the copy, from its start edge (L-90). */
  .sui-card-head {
    --sui-local-card-seat: var(--sui-control-height-compact);
    align-items: start;
    column-gap: var(--sui-space-6);
    display: grid;
    grid-template-columns: minmax(min(10rem, 100%), 1fr) auto;
  }

  .sui-card-copy {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  /* A bare switch is shorter than the control tier, so the seat takes its height and the
     switch starts on the title's cap line as a framed control does. */
  .sui-card-head:has(> .sui-card-actions > :global(.sui-switch.bare):only-child) {
    --sui-local-card-seat: 20px;
  }

  /* A ghost button or a quiet icon button draws no frame or ground at rest, so a reader sees
     only its words or glyph, and those keep the inset instead of its box: the seat is the
     title's own cap band and the control (`--sui-local-card-control` tall) centres on it.
     Its box reaches into the inset, as a hover ground may, and as far past the end as above
     the seat, so a hover or press ground sits square in the card's corner. A ghost button
     stays drawn at the pointer's tier on a phone too and grows only its hit area, so it
     reaches no further than its own padding and its words never pass the inset. Material
     aligns an icon button's glyph to a card's keyline, lets its state layer reach past it,
     and draws a 40dp button inside a 48dp target. */
  .sui-card-head:has(> .sui-card-actions > :global(.sui-button[data-tone='ghost']):only-of-type) {
    --sui-local-button-seat: var(--sui-control-height-drawn);
    --sui-local-card-control: var(--sui-control-height-drawn);
    --sui-local-card-seat: round(up, 1cap, 2px);
  }

  .sui-card-head:has(> .sui-card-actions > :global(.sui-icon-button):only-of-type) {
    --sui-local-card-seat: round(up, 1cap, 2px);
    --sui-local-card-control: var(--sui-tier-quiet);
  }

  .sui-card-head:has(> .sui-card-actions > :global(.sui-icon-button.toolbar):only-of-type) {
    --sui-local-card-control: var(--sui-control-height-compact);
  }

  /* Beside the copy only: stacked under it, the control keeps its own box. The actions take
     the title's face, so `1cap` makes the seat the title's cap band, and the title is the
     first ink. */
  @container not (max-width: 18rem) {
    .sui-card-head:has(
        > .sui-card-actions
          > :global(:is(.sui-button[data-tone='ghost'], .sui-icon-button)):only-of-type
      )
      > .sui-card-actions {
      block-size: var(--sui-local-card-seat);
      flex-wrap: nowrap;
      font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-flat)
        var(--sui-sans);
      margin-inline-end: calc((var(--sui-local-card-seat) - var(--sui-local-card-control)) / 2);
    }
  }

  /* Its cap stands within half a pixel of its box's top, so the title keeps the inset to its
     ink beside any control. */
  .sui-card-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-card-title)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* Proximity: a wrapped title's lines stand 1lh - 1cap apart in ink, so the note stands that
     far plus the copy gap and the title reads as one block, as on the page header. Taken from
     the title's own line height, it holds when a reader raises line spacing (WCAG 1.4.12). */
  .sui-card-title:has(+ .sui-card-note) {
    margin-block-end: round(calc(1lh - 1cap), 1px);
  }

  .sui-card-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    grid-column: 2;
    justify-content: flex-end;
    min-block-size: var(--sui-local-card-seat);
    min-inline-size: 0;
  }

  @container (max-width: 18rem) {
    .sui-card-head {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--sui-rhythm-head-actions-stacked);
    }

    .sui-card-actions {
      grid-column: 1;
      justify-content: flex-start;
    }
  }

  .sui-card-footer {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
  }

  .sui-card-note {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-card-body {
    min-inline-size: 0;
  }

  /* Words that open or close the card start at their cap line and end at their baseline, so
     the ink stands the inset from the top and the bottom alike (L-33). Without weight, so a
     component that trims its own words keeps both edges, and an only paragraph trims both.
     A trimmed edge cuts a fraction of a pixel, so the box rounds up to the pixel and an only
     paragraph splits that spare above its cap and under its baseline. */
  :where(.sui-card > div:first-of-type) :global(:where(p, ul, ol, dl, blockquote):first-child) {
    block-size: var(--sui-block-snap);
    text-box: trim-start cap alphabetic;
  }

  :where(.sui-card > :last-child) :global(:where(p, ul, ol, dl, blockquote):last-child) {
    text-box: trim-end cap alphabetic;
  }

  :where(.sui-card > div:only-of-type) :global(:where(p, ul, ol, dl, blockquote):only-child) {
    align-content: center;
    text-box: trim-both cap alphabetic;
  }

  .sui-card-head + .sui-card-body {
    margin-block-start: var(--sui-rhythm-card-head-body);
  }

  .sui-card-footer {
    justify-content: flex-end;
  }

  div + .sui-card-footer {
    margin-block-start: var(--sui-rhythm-card-head-body);
  }

  /* A row list that opens the card reads this and hands back its first row's padding. */
  .sui-card-body:first-of-type > :global(:first-child) {
    --sui-local-row-lead: calc(-1 * var(--sui-row-pad-default));
  }

  /* A row that closes the card leaves no room of its own under its last ink, because the
     card's inset gives that room (L-33). */
  .sui-card-body:last-child > :global(:last-child) {
    --sui-local-row-trail: 0px;
  }

  /* A chart's band reads this and reaches the card's edges, padding back by the inset. */
  .sui-card-body > :global(*) {
    --sui-local-bleed: var(--sui-rhythm-surface-pad);
  }

  @container (max-width: 36rem) {
    .sui-card {
      padding: var(--sui-rhythm-surface-pad-compact);
    }

    .sui-card-body > :global(*) {
      --sui-local-bleed: var(--sui-rhythm-surface-pad-compact);
    }
  }
</style>
