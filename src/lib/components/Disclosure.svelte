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
    /** What is inside, said quietly before the chevron so a reader can decide without opening. */
    hint?: string;
    /** The summary's accessible name from its words and the hint, in the language's order. */
    summaryName?: (summary: string, hint: string) => string;
    /** Inline help inside a settings column: smaller, 34px, with an 8px bleed. */
    inline?: boolean;
    open?: boolean;
    /** Layout for the call site only, never the disclosure's own paint. */
    class?: HTMLDetailsAttributes['class'];
    children: Snippet;
  } & Omit<HTMLDetailsAttributes, 'open' | 'children'> = $props();
</script>

<!--
@component
A quiet native disclosure for an optional explanation that opens in place. The browser owns
its state, its keyboard and its accessibility. The summary row bleeds into the margin by its
own padding, so its words share the start edge of the heading above it, and the chevron at
its end sits inside the hit area and turns a quarter when open.

The open content sits on the same surface with no frame and no colored edge. A disclosure
that reveals controls puts them in their own `Card` inside it. `inline` is the smaller help
row for a settings column.

- Semantics: a native `<details>` whose `<summary>` is the button, named by `summary` and `hint`, with its expanded state from the browser.
- Content: one line of summary words that wrap, an optional quiet hint, and any content inside.
- States: closed, open (the chevron turned a quarter towards the content), hover (the row veil), pressed (the pressed veil, inset and 1px sink) and focus (the 2px inset ring).
- Keyboard: Tab reaches the summary, and Enter or Space opens and closes it.
- Pointer and touch: the whole summary row is the target, one control tall, 34px and 44px on a phone or touch screen.
- Focus: focus stays on the summary when it opens or closes.
- Responsive: the summary words wrap and the row grows; the hint and chevron stay at the inline end.
- Accessibility: the browser announces expanded and collapsed, the chevron is hidden, and the open state also shows in the chevron's turn.
- Localization: every word is the caller's, and `summaryName` joins the summary and the hint; the chevron mirrors and turns towards the content in a right-to-left page, and the bleed is logical.
- Performance: the content renders closed too, so keep it light; the chevron's turn and the press are the only motion, removed under reduced motion.
- Analytics: `open` is bindable and the native `toggle` event reports each opening.
- Failure: with an empty body it opens to nothing, so leave it out instead; long words in the summary wrap rather than clip.
-->
<details {...rest} bind:open class={['sui-disclosure', className, { inline }]}>
  <!-- The drawn words are read once, as one run of text, because Chrome reads a summary's
       words as its description too when an aria-label names it. -->
  <summary class="sui-disclosure-summary">
    <span class="sui-disclosure-label" aria-hidden={hint === undefined ? undefined : 'true'}
      >{summary}</span
    >
    {#if hint !== undefined}
      <span class="sui-disclosure-hint" aria-hidden="true">{hint}</span>
    {/if}
    <span class="sui-disclosure-chevron"><Icon name="chevron-right" size="xs" /></span>
    {#if hint !== undefined}<VisuallyHidden>{summaryName(summary, hint)}</VisuallyHidden>{/if}
  </summary>
  <div class="sui-disclosure-body">{@render children()}</div>
</details>

<style>
  .sui-disclosure {
    margin: 0;
    min-inline-size: 0;
  }

  /* The parts hang from the first line: the padding centres one line in the control height,
     and the chevron and the hint sit on that line, so a summary that wraps keeps its chevron
     beside its first line (L-94). */
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
    margin-inline: calc(var(--sui-space-3) * -1);
    min-block-size: var(--sui-control-height-compact);
    padding: calc((var(--sui-control-height-compact) - round(up, 1cap, 2px)) / 2)
      var(--sui-space-3);
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
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin-inline-start: auto;
    text-box: trim-both cap alphabetic;
  }

  .sui-disclosure-chevron {
    color: var(--sui-text-muted);
    display: flex;
    flex: none;
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-xs)) / 2);
    margin-inline-start: auto;
    transition: rotate var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-disclosure-hint + .sui-disclosure-chevron {
    margin-inline-start: 0;
  }

  [open] > .sui-disclosure-summary .sui-disclosure-chevron {
    rotate: 90deg;
  }

  /* The mirrored chevron points to the left, so a quarter turn the other way points it down. */
  [open] > .sui-disclosure-summary .sui-disclosure-chevron:dir(rtl) {
    rotate: -90deg;
  }

  .sui-disclosure-body {
    margin-block-start: var(--sui-space-2);
    min-inline-size: 0;
  }

  .inline > .sui-disclosure-summary {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    margin-inline: calc(var(--sui-space-2) * -1);
    min-block-size: var(--sui-control-height-compact);
    padding-inline: var(--sui-space-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-disclosure-summary,
    .sui-disclosure-chevron {
      transition: none;
    }

    .sui-disclosure-summary:active {
      translate: none;
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
