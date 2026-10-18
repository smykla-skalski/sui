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
    /** Closing actions: beside the copy at its foot while the card holds both, else under it. */
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
body. The title's cap stands the inset below the top. Whatever stands beside the title in
`actions`, a button, a switch, a segmented control, a pill or a menu, centres on the title's
cap band and lends the head no height, so the title, its note and the content stand exactly
where they stand in the same card with no action; a control taller than the title's line
reaches above and below it into the inset. A framed control ends on the inset, and a ghost
button or a quiet icon button keeps its words or glyph there instead, with its box as far past
the end as above the band. A button there stays drawn at 34px on a phone with a 44px hit area.
The actions never take a line of their own: at every width they stay on the title's first
line, and short of room the title and its note wrap in what is left beside them, a segmented
control turns into its select, and the other controls keep their width. A `footer`'s actions stand beside the copy at its
foot while the card holds both next to an 11rem measure of copy, as a callout's do, and on a
line of their own under it otherwise, so they keep the inset from the bottom and the end in
either place. A row list or a `Skeleton` that opens the card hands back what stands above its
first row's ink, as it hands back what stands below its last: the card lends the body's first
child `--sui-local-row-lead` and its last child `--sui-local-row-trail`, so a row that opens or
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
- Responsive: a container query on the card's own width steps the inset from 20px to 16px at 36rem, the head's actions stay beside the copy, centred on the title's cap band, while the copy wraps beside them, until the card is under 12rem wide, as with text at twice its size, where they stand under the copy, and the footer's actions stand beside the copy while they fit next to 11rem of it and wrap under it, from its start edge, otherwise.
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
    {#if title !== undefined || actions || children}
      <div class="sui-card-main">
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
      </div>
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

  /* The copy, its head and body, and the footer's actions share one line while the card holds
     both, and the actions wrap under the copy only when they do not fit beside an 11rem
     measure of it, as a callout's do: wrapping decides that from the actions' own width, which
     a container query cannot know. On a shared line the actions close the copy at its foot, so
     their frame lands on whole pixels whatever the copy's height and keeps the bottom inset,
     and a line the actions take alone starts at the start edge (L-90). */
  .sui-card {
    align-items: start;
    background: var(--sui-surface-base);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    column-gap: var(--sui-space-6);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    margin: 0;
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
    row-gap: var(--sui-rhythm-card-head-body);
  }

  .sui-card-main {
    flex: 1 1 11rem;
    min-inline-size: 0;
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

  /* The copy and the actions share the head's one line at every width: short of room, each
     gives up width in proportion to its own, so a long title wraps while the controls keep
     theirs and a segmented control turns into its select, and the title and its note wrap in
     what is left. */
  .sui-card-head {
    align-items: start;
    column-gap: var(--sui-space-6);
    display: flex;
    justify-content: flex-end;
  }

  .sui-card-copy {
    display: grid;
    flex: 1 1 auto;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  /* Whatever the actions hold, a button, a switch, a segmented control, a pill or a menu,
     centres on the title's cap band and lends the head no height: the seat is that band, in
     the title's face so `1cap` is the title's, and it gives back all of its height, so the
     copy alone sets the head's and the title, its note and the content stand where they stand
     in a card with no action (L-34). A control taller than the band reaches above and below
     the title's line into the card's inset; a button there stays drawn at its pointer tier on
     a phone and grows only its hit area, so it never reaches the keyline. A framed control
     ends on the inset. A ghost button or a quiet icon button draws nothing at rest, so its
     words or glyph keep the inset instead, and its box reaches as far past the end as above
     the band, so a hover or press ground sits square in the card's corner. Material aligns an
     icon button's glyph to a card's keyline, lets its state layer reach past it, and draws a
     40dp button inside a 48dp target. */
  .sui-card-actions {
    --sui-local-button-seat: var(--sui-control-height-drawn);
    align-items: center;
    block-size: round(up, 1cap, 2px);
    display: flex;
    flex: 0 1 auto;
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-2);
    justify-content: flex-end;
    margin-block-end: calc(-1 * round(up, 1cap, 2px));
  }

  /* A control keeps its whole width, so a label never wraps into a taller box on the title's
     line. A segmented control chooses its form against the room the copy leaves it, about 9rem
     of copy and the gap from the card's content box, and turns into its select short of it. */
  .sui-card-actions {
    --sui-local-segmented-room: calc(
      100cqi - 2 * (var(--sui-rhythm-surface-pad) + var(--sui-stroke)) - 9rem - var(--sui-space-6)
    );
  }

  .sui-card-actions > :global(*) {
    flex: none;
    min-inline-size: max-content;
  }

  .sui-card-head:has(> .sui-card-actions > :global(.sui-button[data-tone='ghost']):only-of-type)
    > .sui-card-actions {
    margin-inline-end: calc((round(up, 1cap, 2px) - var(--sui-control-height-drawn)) / 2);
  }

  .sui-card-head:has(> .sui-card-actions > :global(.sui-icon-button):only-of-type)
    > .sui-card-actions {
    margin-inline-end: calc((round(up, 1cap, 2px) - var(--sui-tier-quiet)) / 2);
  }

  .sui-card-head:has(> .sui-card-actions > :global(.sui-icon-button.toolbar):only-of-type)
    > .sui-card-actions {
    margin-inline-end: calc((round(up, 1cap, 2px) - var(--sui-control-height-compact)) / 2);
  }

  /* With too little room for both, as with text at twice its size, the actions stand under
     the copy from its start edge, at their own height (--sui-breakpoint-head). */
  @container (max-width: 12rem) {
    .sui-card-head {
      flex-wrap: wrap;
      row-gap: var(--sui-row-copy-gap);
    }

    .sui-card-head > .sui-card-actions {
      block-size: auto;
      flex: 1 1 100%;
      flex-wrap: wrap;
      justify-content: flex-start;
      margin-block-end: 0;
      margin-inline-end: 0;
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

  .sui-card-footer {
    align-items: center;
    align-self: end;
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    max-inline-size: 100%;
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
  :where(.sui-card-main > :first-child) :global(:where(p, ul, ol, dl, blockquote):first-child) {
    block-size: var(--sui-block-snap);
    text-box: trim-start cap alphabetic;
  }

  :where(.sui-card-main > :last-child) :global(:where(p, ul, ol, dl, blockquote):last-child) {
    text-box: trim-end cap alphabetic;
  }

  :where(.sui-card-main > :only-child) :global(:where(p, ul, ol, dl, blockquote):only-child) {
    align-content: center;
    text-box: trim-both cap alphabetic;
  }

  .sui-card-head + .sui-card-body {
    margin-block-start: var(--sui-rhythm-card-head-body);
  }

  /* A row list that opens the card reads this and hands back its first row's padding. */
  .sui-card-body:first-child > :global(:first-child) {
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

    .sui-card-actions {
      --sui-local-segmented-room: calc(
        100cqi - 2 * (var(--sui-rhythm-surface-pad-compact) + var(--sui-stroke)) - 9rem -
          var(--sui-space-6)
      );
    }

    .sui-card-body > :global(*) {
      --sui-local-bleed: var(--sui-rhythm-surface-pad-compact);
    }
  }
</style>
