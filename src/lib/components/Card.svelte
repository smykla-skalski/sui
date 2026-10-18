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
</script>

<!--
@component
The surface for a group of related things: the base ground, a subtle keyline and a 10px
corner. The card owns its 20px inset, 16px once the card itself is 36rem wide or narrower,
and never its outer spacing, so a stack of cards takes its 16px from the container's gap. It
fills the width its container gives it and never decides that width.

Whatever the card holds stands the same inset from all four keylines (L-33): the first ink
sits the inset below the top, the last the inset above the bottom, and anything that reaches
a side stops the inset short of it. The title is a heading at `level`, balanced and trimmed to
its cap height. A `description` is the title's second line, 8px of ink below it, not the first
line of the body. Controls in `actions` set the head's height and the title centres on them,
so a control keeps the inset from the top and the end; under a title that wraps past them
they stay on the first line. A `footer` row is as tall as its actions, so they keep the inset
from the bottom. A row list that opens the card hands back its first row's padding, as it
hands back its last.

Do not nest cards for decoration. Reach for `Plate` when the subject has a state to say
on its title line.

- Semantics: a plain grouping box; the title is a heading at `level` and nothing else carries a role.
- Content: an optional title, description, head actions, body and footer actions; the title and the description wrap.
- States: rest, and unsaved, which draws `unsavedLabel` after the title in the unsaved ink and gives the keyline the unsaved tint.
- Keyboard: none of its own; Tab reaches the controls inside in reading order.
- Pointer and touch: none of its own; the controls inside keep their own targets and press feedback.
- Focus: nothing here moves focus.
- Responsive: a container query on the card's own width steps the inset from 20px to 16px at 36rem, the head's actions stay on the title's first line, and the footer's actions pack to the end.
- Accessibility: the unsaved state is a drawn word, never the keyline's colour alone, and the copy and the word hold 4.5:1.
- Localization: `unsavedLabel` is a prop with an English default, and `titleName` joins it to the title; the actions sit at the inline end, which mirrors in a right-to-left page.
- Performance: static layout with no script; each card is its own size container.
- Analytics: none of its own, because it holds no control; its actions report their own outcomes.
- Failure: a card with no title, body or footer draws an empty surface, and an unsaved card without a title has nowhere to put its word, so give it one.
-->

<div {...rest} class={['sui-card-box', className]}>
  <div class={['sui-card', { unsaved }]}>
    {#if title !== undefined || actions}
      <div class="sui-card-head">
        {#if title !== undefined}
          <svelte:element
            this={`h${level}`}
            class="sui-card-title"
            aria-label={unsaved ? titleName(title, unsavedLabel) : undefined}
            >{title}{#if unsaved}<span class="sui-card-unsaved">{unsavedLabel}</span
              >{/if}</svelte:element
          >
        {/if}
        {#if actions}
          <div class="sui-card-actions">{@render actions()}</div>
        {/if}
      </div>
      {#if description !== undefined}
        <p class="sui-card-note">{description}</p>
      {/if}
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

  .unsaved {
    border-color: var(--sui-unsaved-border);
  }

  /* The word, not a mark: a reader sees "Unsaved" whatever the keyline's tint, as on a setting
     row. */
  .sui-card-unsaved {
    block-size: var(--sui-block-snap);
    color: var(--sui-unsaved-ink);
    display: inline-block;
    font-weight: var(--sui-weight-regular);
    margin-inline-start: var(--sui-space-2);
    text-box: trim-both cap alphabetic;
  }

  /* The actions end the title's line, and drop under the title when they do not fit, as at a
     large text size; spread rather than pushed by an auto margin (L-90). */
  .sui-card-head {
    align-items: flex-start;
    column-gap: var(--sui-space-3);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    min-block-size: var(--sui-card-head-line);
    row-gap: var(--sui-space-2);
  }

  .sui-card-title {
    align-self: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    flex: 1 1 auto;
    font: var(--sui-weight-semibold) var(--sui-font-size-card-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    min-block-size: var(--sui-card-head-line);
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  .sui-card-actions {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-card-footer {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
  }

  .sui-card-note {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: var(--sui-row-copy-gap) 0 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-card-body {
    min-inline-size: 0;
  }

  /* Words that open or close the card start at their cap line and end at their baseline, so
     the ink stands the inset from the top and the bottom alike (L-33). */
  .sui-card > :first-child :global(:is(p, ul, ol, dl, blockquote):first-child) {
    text-box: trim-start cap alphabetic;
  }

  .sui-card > :last-child :global(:is(p, ul, ol, dl, blockquote):last-child) {
    text-box: trim-end cap alphabetic;
  }

  :is(.sui-card-head, .sui-card-note) + .sui-card-body {
    margin-block-start: var(--sui-rhythm-card-head-body);
  }

  .sui-card-footer {
    justify-content: flex-end;
  }

  * + .sui-card-footer {
    margin-block-start: var(--sui-rhythm-card-head-body);
  }

  /* A row list that opens the card reads this and hands back its first row's padding. */
  .sui-card-body:first-child > :global(:first-child) {
    --sui-local-row-lead: calc(-1 * var(--sui-row-pad-default));
  }

  @container (max-width: 36rem) {
    .sui-card {
      padding: var(--sui-rhythm-surface-pad-compact);
    }
  }
</style>
