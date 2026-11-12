<script lang="ts">
  import { mark, word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLDetailsAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    summary,
    hint,
    summaryName = word(
      'Disclosure.summaryName',
      (summary: string, hint: string) => `${summary}${mark('comma')}${hint}`
    ),
    inline = false,
    open = $bindable(false),
    class: className = '',
    children,
    ...rest
  }: {
    /** The words on the row that opens it. */
    summary: string;
    /** What is inside, said quietly at the row's end, or under the words when both do not fit. */
    hint?: string;
    /** The summary's accessible name from its words and the hint, in the language's order. */
    summaryName?: (summary: string, hint: string) => string;
    /** Inline help inside a settings column: quieter words, as wide as they are, on the same row. */
    inline?: boolean;
    open?: boolean;
    /** Layout for the call site only, never the disclosure's own paint. */
    class?: HTMLDetailsAttributes['class'];
    children: Snippet;
  } & Omit<HTMLDetailsAttributes, 'open' | 'children'> = $props();
</script>

<!--
@component
A quiet native disclosure for an optional explanation or setting that opens in place. The
browser owns its state, its keyboard, its find-in-page and its accessibility.

The chevron leads the summary's words at the start edge of the text above, as Apple's
disclosure triangle and the APG pattern draw it, so the open state shows where the reader is
already looking. The content hangs under the summary's words, and a hairline guide runs under
the chevron beside it, from the summary's foot to its last ink, so the summary and what it
reveals read as one unit. Disclosures that share a `name` open one at a time. What it reveals sits straight in it, never in a card.
Open, its last ink stands as far above its foot as the summary's words stand under its top,
and a disclosure that closes a card leaves that room to the card's inset.

The hint stands at the row's end while the words and the hint fit on one line, and drops
under the words when they do not, so it never squeezes them onto more lines, as Apple's value
cells stack their secondary text.

- Semantics: a native `<details>` whose `<summary>` is the button, named by `summary` and `hint`, with its expanded state from the browser.
- Content: one line of summary words that wrap, an optional quiet hint, and any content inside, which starts at the summary's words.
- States: closed (the chevron points along the line), open (the chevron points down in the primary ink and the guide runs beside the content), hover (the row veil on the summary only, as wide as its words on inline help, whose words turn primary, and the chevron turns primary), pressed (the pressed veil, inset and 1px sink) and focus (the 2px inset ring). There is no disabled state, because opening only shows words.
- Keyboard: Tab reaches the summary, and Enter or Space opens and closes it.
- Pointer and touch: the whole summary row is the target, one control tall, 34px and 44px on a phone or touch screen.
- Focus: focus stays on the summary when it opens or closes, and find-in-page opens a disclosure that holds the match.
- Responsive: the hint drops under the words, at their start edge, when the row cannot hold both on one line; words longer than the row wrap and the row grows, with the chevron on the first line.
- Accessibility: the browser announces expanded and collapsed, the chevron is hidden, and the open state also shows in the chevron's turn and the guide.
- Localization: every word is the caller's, and `summaryName` joins the summary and the hint; the chevron mirrors and still turns down in a right-to-left page, the indent and the guide are logical, and the hint reads in its own direction.
- Performance: the content renders closed too, so keep it light; opening fades the content in with a short slide, and only the chevron's turn and the press move otherwise, all removed under reduced motion.
- Analytics: `open` is bindable and the native `toggle` event reports each opening.
- Failure: with an empty body it opens to nothing, so leave it out instead; long words in the summary wrap rather than clip.
-->
<details {...rest} bind:open class={['sui-disclosure', className, { inline }]}>
  <!-- The drawn words are read once, as one run of text, because Chrome reads a summary's
       words as its description too when an aria-label names it. -->
  <summary class="sui-disclosure-summary">
    <span class="sui-disclosure-chevron"><Icon name="chevron-right" size="base" /></span>
    <span class="sui-disclosure-label" aria-hidden={hint === undefined ? undefined : 'true'}
      >{summary}</span
    >
    {#if hint !== undefined}
      <span class="sui-disclosure-hint" dir="auto" aria-hidden="true">{hint}</span>
      <VisuallyHidden>{summaryName(summary, hint)}</VisuallyHidden>
    {/if}
  </summary>
  <div class="sui-disclosure-body">{@render children()}</div>
</details>

<style>
  /* Read in the face of whatever uses them: the summary row's padding, and the room under the
     open content's last ink, which is the room above the summary's words to the pixel, unless
     a card closes on the disclosure and its inset gives that room (`--sui-local-row-trail`). */
  .sui-disclosure {
    --sui-local-disclosure-inset: calc(
      (var(--sui-control-height-compact) - round(up, 1cap, 2px)) / 2
    );
    --sui-local-disclosure-trail: var(
      --sui-local-row-trail,
      round(calc((var(--sui-control-height-compact) - 1cap) / 2), 1px)
    );
    /* The chevron takes the tier of a glyph beside a control's words (L-68). */
    --sui-local-disclosure-indent: calc(var(--sui-icon-base) + var(--sui-space-2));
    margin: 0;
    min-inline-size: 0;
    position: relative;
  }

  /* The padding centres one line in the control height. The words and the hint share that
     line only when both fit, and the hint otherwise wraps to a line of its own under the
     words, a copy gap below them as a description stands under its title (L-24), so the
     words never wrap to make room for it. The row bleeds by its padding, so the chevron
     stands at the start edge of the text above and the veil reaches past it. */
  .sui-disclosure-summary {
    align-items: start;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    column-gap: var(--sui-space-4);
    cursor: pointer;
    display: flex;
    flex-wrap: wrap;
    /* A summary names what it reveals, as a label does, so it takes a label's 600 (L-25) and
       never reads quieter than the fields it opens. */
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    justify-content: space-between;
    list-style: none;
    margin-inline: calc(var(--sui-space-2) * -1);
    min-block-size: var(--sui-control-height-compact);
    padding: var(--sui-local-disclosure-inset) var(--sui-space-2);
    padding-inline-start: calc(var(--sui-space-2) + var(--sui-local-disclosure-indent));
    position: relative;
    row-gap: var(--sui-row-copy-gap);
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    transition:
      box-shadow var(--sui-duration-press) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-disclosure-summary::-webkit-details-marker {
    display: none;
  }

  @media (hover: hover) {
    .sui-disclosure-summary:hover:not(:active) {
      background: var(--sui-row-hover);
    }

    .sui-disclosure-summary:hover .sui-disclosure-chevron {
      color: var(--sui-text-primary);
    }

    @media (forced-colors: active) {
      .sui-disclosure-summary:hover {
        outline: var(--sui-stroke) solid CanvasText;
        outline-offset: calc(-1 * var(--sui-stroke));
      }
    }
  }

  .sui-disclosure-summary:active {
    background: var(--sui-row-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-disclosure-summary:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* The chevron hangs in the row's start padding, as GOV.UK's details marker does, so the
     words and the hint share one start edge whichever line each takes, and it centres on the
     first line, which the padding centres in the control height (L-94). */
  /* At rest the chevron stands halfway from the secondary ink to the primary, so a closed row
     still reads as a control; open, it takes the primary ink, so the state shows in ink as
     well as in its turn. */
  .sui-disclosure-chevron {
    color: color-mix(in srgb, var(--sui-text-secondary), var(--sui-text-primary));
    display: flex;
    inset-block-start: calc((var(--sui-control-height-compact) - var(--sui-icon-base)) / 2);
    inset-inline-start: var(--sui-space-2);
    position: absolute;
    transition: rotate var(--sui-duration-open) var(--sui-ease-standard);
  }

  [open] > .sui-disclosure-summary .sui-disclosure-chevron {
    color: var(--sui-text-primary);
    rotate: 90deg;
  }

  /* The mirrored chevron points to the left, so a quarter turn the other way points it down. */
  [open] > .sui-disclosure-summary .sui-disclosure-chevron:dir(rtl) {
    rotate: -90deg;
  }

  .sui-disclosure-label {
    padding-block: var(--sui-block-snap-room-even);
    text-wrap: balance;
    align-content: center;
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
  }

  .sui-disclosure-hint {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    font-variant-numeric: tabular-nums;
    min-inline-size: 0;
    overflow-wrap: break-word;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  /* The content starts at the summary's words, and its first ink stands a copy gap under the
     summary's box, so the ground a hover paints there never touches it. That keeps it closer
     to its summary than the next row is. */
  .sui-disclosure-body {
    /* Only the disclosure that closes the card hands its room back, never one nested in it. */
    --sui-local-row-trail: initial;
    min-inline-size: 0;
    padding-block-start: var(--sui-row-copy-gap);
    padding-inline-start: var(--sui-local-disclosure-indent);
    position: relative;
  }

  /* The guide runs under the chevron from the summary's foot to the content's last ink, so a
     summary that wraps, or a hint dropped under its words, stands above it and never reads as
     the content's first line, and a one-line body still gets a rule taller than its words. It
     is a hairline between a keyline and a field's edge, about 17% of the ink in light, a point
     under a field's 18%, and 19% in dark, where a dark stage swallows a fainter line, so it
     holds beside fields, never a coloured edge (L-17). It reads the trailing room in the
     summary's face. */
  .sui-disclosure-body::before {
    border-inline-start: var(--sui-stroke) solid
      light-dark(
        color-mix(in srgb, var(--sui-border-subtle) 20%, var(--sui-border-control)),
        color-mix(in srgb, var(--sui-border-subtle) 15%, var(--sui-border-control))
      );
    content: '';
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    inset-block: 0 var(--sui-local-disclosure-trail);
    inset-inline-start: round(calc((var(--sui-icon-base) - var(--sui-stroke)) / 2), 1px);
    position: absolute;
  }

  /* Words that open or close the content start at their cap line and end at their baseline,
     as in a card (L-33), so the guide runs from the first ink to the last. A trimmed block
     rounds up to the pixel and keeps the spare fraction away from its trimmed edge (L-95). */
  :where(.sui-disclosure-body) > :global(:where(p, ul, ol, dl, blockquote):first-child) {
    align-content: start;
    block-size: var(--sui-block-snap);
    padding-block: var(--sui-block-snap-room-start);
    text-box: var(--sui-block-snap-trim, trim-start cap alphabetic);
  }

  :where(.sui-disclosure-body) > :global(:where(p, ul, ol, dl, blockquote):last-child) {
    align-content: end;
    block-size: var(--sui-block-snap);
    padding-block: var(--sui-block-snap-room-end);
    text-box: var(--sui-block-snap-trim, trim-end cap alphabetic);
  }

  /* An only block keeps its baseline on its box's end even when its ink overhangs, so its last
     ink lands on the pixel, and rounds to the nearest pixel, so its cap stands within half a
     pixel of the copy gap. */
  :where(.sui-disclosure-body) > :global(:where(p, ul, ol, dl, blockquote):only-child) {
    align-content: unsafe end;
    block-size: var(--sui-block-snap-near);
    padding-block: var(--sui-block-snap-spare) 0;
    text-box: trim-both cap alphabetic;
  }

  /* Without calc-size() the only block rounds up instead, and the body's top room gives the
     pixel back when the nearest pixel is the lower one, so its ink stands where it would. The
     room measures the cap in the disclosure's face, which the content's words take unless they
     set their own size. */
  @supports not (block-size: calc-size(auto, size)) {
    .sui-disclosure-body:has(> :global(:where(p, ul, ol, dl, blockquote):only-child)) {
      padding-block-start: calc(var(--sui-row-copy-gap) + round(1cap, 1px) - round(up, 1cap, 1px));
    }
  }

  /* The trailing room, in the summary's face, so a group of disclosures keeps the rhythm of
     its closed rows: two rooms between one's last ink and the next one's words. */
  .sui-disclosure-body::after {
    block-size: var(--sui-local-disclosure-trail);
    content: '';
    display: block;
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }

  /* Inline help is as wide as its words, as a link is, so its veil never reads as a block
     row's, and its words stand halfway from the secondary ink to the primary, so at rest they
     read as a control and not as the copy beside them. */
  .inline > .sui-disclosure-summary {
    color: color-mix(in srgb, var(--sui-text-secondary), var(--sui-text-primary));
    inline-size: var(--sui-inline-snap);
    max-inline-size: calc(100% + 2 * var(--sui-space-2));
    font-weight: var(--sui-weight-regular);
  }

  /* Open, its words take the primary ink with its chevron, so they never read quieter than
     the glyph that leads them. */
  .inline[open] > .sui-disclosure-summary {
    color: var(--sui-text-primary);
  }

  @media (hover: hover) {
    .inline > .sui-disclosure-summary:hover {
      color: var(--sui-text-primary);
    }
  }

  /* The size changes in one step, and only the content's opacity and a short slide move, so
     the compositor runs the reveal and nothing below it lays out each frame. Closing is
     immediate, faster than opening. */
  @supports selector(::details-content) {
    .sui-disclosure::details-content {
      opacity: 0;
      translate: 0 calc(-1 * var(--sui-space-1));
    }

    .sui-disclosure[open]::details-content {
      opacity: 1;
      translate: none;
      transition:
        opacity var(--sui-duration-open) var(--sui-ease-standard),
        translate var(--sui-duration-open) var(--sui-ease-standard);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-disclosure-summary,
    .sui-disclosure-chevron {
      transition: none;
    }

    .sui-disclosure-summary:active {
      translate: none;
    }

    @supports selector(::details-content) {
      .sui-disclosure::details-content,
      .sui-disclosure[open]::details-content {
        opacity: 1;
        transition: none;
        translate: none;
      }
    }
  }

  /* The hover and press veils are lost in high contrast, so the row draws its edge there. */
  @media (forced-colors: active) {
    .sui-disclosure-summary:active {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
