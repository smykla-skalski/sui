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
    /** What is inside, said quietly at the row's end so a reader can decide without opening. */
    hint?: string;
    /** The summary's accessible name from its words and the hint, in the language's order. */
    summaryName?: (summary: string, hint: string) => string;
    /** Inline help inside a settings column: smaller, quieter words on the same row. */
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
already looking. The content hangs under the summary's words, and a hairline guide drops from
the chevron beside it, so the summary and what it reveals read as one unit. Disclosures that
share a `name` open one at a time. What it reveals sits straight in it, never in a card.
Open, its last ink stands as far above its foot as the summary's words stand under its top,
and a disclosure that closes a card leaves that room to the card's inset.

- Semantics: a native `<details>` whose `<summary>` is the button, named by `summary` and `hint`, with its expanded state from the browser.
- Content: one line of summary words that wrap, an optional quiet hint, and any content inside, which starts at the summary's words.
- States: closed (the chevron points along the line), open (the chevron points down and the guide runs beside the content), hover (the row veil on the summary only), pressed (the pressed veil, inset and 1px sink) and focus (the 2px inset ring). There is no disabled state, because opening only shows words.
- Keyboard: Tab reaches the summary, and Enter or Space opens and closes it.
- Pointer and touch: the whole summary row is the target, one control tall, 34px and 44px on a phone or touch screen.
- Focus: focus stays on the summary when it opens or closes, and find-in-page opens a disclosure that holds the match.
- Responsive: the summary words wrap and the row grows, with the chevron and the hint on the first line.
- Accessibility: the browser announces expanded and collapsed, the chevron is hidden, and the open state also shows in the chevron's turn and the guide.
- Localization: every word is the caller's, and `summaryName` joins the summary and the hint; the chevron mirrors and still turns down in a right-to-left page, and the indent and the guide are logical.
- Performance: the content renders closed too, so keep it light; opening fades the content in with a short slide, and only the chevron's turn and the press move otherwise, all removed under reduced motion.
- Analytics: `open` is bindable and the native `toggle` event reports each opening.
- Failure: with an empty body it opens to nothing, so leave it out instead; long words in the summary wrap rather than clip.
-->
<details {...rest} bind:open class={['sui-disclosure', className, { inline }]}>
  <!-- The drawn words are read once, as one run of text, because Chrome reads a summary's
       words as its description too when an aria-label names it. -->
  <summary class="sui-disclosure-summary">
    <span class="sui-disclosure-chevron"><Icon name="chevron-right" size="xs" /></span>
    <span class="sui-disclosure-label" aria-hidden={hint === undefined ? undefined : 'true'}
      >{summary}</span
    >
    {#if hint !== undefined}
      <span class="sui-disclosure-hint" aria-hidden="true">{hint}</span>
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
    --sui-local-disclosure-indent: calc(var(--sui-icon-xs) + var(--sui-space-2));
    /* The chevron centres on the first line, so its foot stands this far below the top. */
    --sui-local-disclosure-foot: calc((var(--sui-control-height-compact) + var(--sui-icon-xs)) / 2);
    margin: 0;
    min-inline-size: 0;
    position: relative;
  }

  /* The guide drops from under the chevron to the content's last ink, beside a summary that
     wraps too: a hairline as quiet as a row's divider, never a coloured edge (L-17). It comes
     before the summary, so the summary's veil and focus ring paint over it. It reads the
     trailing room in the summary's face. */
  .sui-disclosure::before {
    border-inline-start: var(--sui-stroke) solid var(--sui-border-divider);
    content: '';
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    inset-block: calc(var(--sui-local-disclosure-foot) + var(--sui-space-1))
      var(--sui-local-disclosure-trail);
    inset-inline-start: round(calc((var(--sui-icon-xs) - var(--sui-stroke)) / 2), 1px);
    opacity: 0;
    position: absolute;
  }

  .sui-disclosure[open]::before {
    opacity: 1;
    transition: opacity var(--sui-duration-open) var(--sui-ease-standard);
  }

  /* The parts hang from the first line: the padding centres one line in the control height,
     and the chevron and the hint sit on that line, so a summary that wraps keeps them beside
     its first line (L-94). The row bleeds by its padding, so the chevron stands at the start
     edge of the text above and the veil reaches past it. */
  .sui-disclosure-summary {
    align-items: start;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
    list-style: none;
    margin-inline: calc(var(--sui-space-2) * -1);
    min-block-size: var(--sui-control-height-compact);
    padding: var(--sui-local-disclosure-inset) var(--sui-space-2);
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

  .sui-disclosure-chevron {
    color: var(--sui-text-muted);
    display: flex;
    flex: none;
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-xs)) / 2);
    transition: rotate var(--sui-duration-open) var(--sui-ease-standard);
  }

  [open] > .sui-disclosure-summary .sui-disclosure-chevron {
    rotate: 90deg;
  }

  /* The mirrored chevron points to the left, so a quarter turn the other way points it down. */
  [open] > .sui-disclosure-summary .sui-disclosure-chevron:dir(rtl) {
    rotate: -90deg;
  }

  .sui-disclosure-label {
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
    flex: none;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin-inline-start: auto;
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
  }

  /* Words that open or close the content start at their cap line and end at their baseline,
     as in a card (L-33), so the guide runs from the first ink to the last. A trimmed block
     rounds up to the pixel and keeps the spare fraction away from its trimmed edge (L-95). */
  :where(.sui-disclosure-body) > :global(:where(p, ul, ol, dl, blockquote):first-child) {
    align-content: start;
    block-size: var(--sui-block-snap);
    text-box: trim-start cap alphabetic;
  }

  :where(.sui-disclosure-body) > :global(:where(p, ul, ol, dl, blockquote):last-child) {
    align-content: end;
    block-size: var(--sui-block-snap);
    text-box: trim-end cap alphabetic;
  }

  /* An only block keeps its baseline on its box's end even when its ink overhangs, so its last
     ink lands on the pixel, and rounds to the nearest pixel, so its cap stands within half a
     pixel of the copy gap. */
  :where(.sui-disclosure-body) > :global(:where(p, ul, ol, dl, blockquote):only-child) {
    align-content: unsafe end;
    block-size: var(--sui-block-snap-near);
    text-box: trim-both cap alphabetic;
  }

  /* The trailing room, in the summary's face, so a group of disclosures keeps the rhythm of
     its closed rows: two rooms between one's last ink and the next one's words. */
  .sui-disclosure-body::after {
    block-size: var(--sui-local-disclosure-trail);
    content: '';
    display: block;
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }

  .inline > .sui-disclosure-summary {
    color: var(--sui-text-secondary);
  }

  .inline > .sui-disclosure-summary,
  .inline::before,
  .inline > .sui-disclosure-body::after {
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
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

    .sui-disclosure[open]::before {
      transition: none;
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
