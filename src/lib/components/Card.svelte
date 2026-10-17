<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    heading,
    note,
    description,
    level = 2,
    actions,
    footer,
    unsaved = false,
    class: className = '',
    children,
    ...rest
  }: {
    title?: string;
    /** The older name for `title`, kept so existing callers do not break. */
    heading?: string;
    /** The title's second line: one quiet sentence about what the card holds. */
    note?: string;
    /** The older name for `note`, kept so existing callers do not break. */
    description?: string;
    /** The title's heading level, so the card fits the outline of the page it is on. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** Controls beside the title. They centre on its cap line and never raise the head. */
    actions?: Snippet;
    /** A closing row of actions, held to the same cap-line track as the head. */
    footer?: Snippet;
    /** Marks a card that holds changes not saved yet; its keyline takes the decision tint. */
    unsaved?: boolean;
    /** Layout for the call site only, never the card's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
    children?: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();

  const name = $derived(title ?? heading);
  const second = $derived(note ?? description);
</script>

<!--
@component
The surface for a group of related things: the base ground, a subtle keyline and a 10px
corner. The card owns its 20px inset (16px on a phone) and never its outer spacing, so a
stack of cards takes its 16px from the container's gap. It never decides its column's width.

Whatever the card holds stands the same inset from all four keylines (L-33): the first ink
sits 20px below the top, the last 20px above the bottom, and anything that reaches a side
stops 20px short of it. The title is a heading at `level`, balanced and trimmed to its cap
height. A `note` is the title's second line, 8px of ink below it, not the first line of the
body. Controls in `actions` set the head's height and the title centres on them, so a control
keeps the inset from the top and the end; under a title that wraps past them they stay on
the first line. A `footer` row is as tall as its actions, so they keep the inset from the
bottom. A row list that opens the card hands back its first row's padding, as it hands back
its last.

Do not nest cards for decoration. Reach for `Plate` when the subject has a state to say
on its title line.
-->

<div {...rest} class={['sui-card', className, { unsaved }]}>
  {#if name !== undefined || actions}
    <div class="sui-card-head">
      {#if name !== undefined}
        <svelte:element this={`h${level}`} class="sui-card-title">{name}</svelte:element>
      {/if}
      {#if actions}
        <div class="sui-card-actions">{@render actions()}</div>
      {/if}
    </div>
    {#if second !== undefined}
      <p class="sui-card-note">{second}</p>
    {/if}
  {/if}
  {#if children}
    <div class="sui-card-body">{@render children()}</div>
  {/if}
  {#if footer}
    <div class="sui-card-footer">{@render footer()}</div>
  {/if}
</div>

<style>
  .sui-card {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-border-subtle);
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

  .sui-card-head {
    align-items: flex-start;
    column-gap: var(--sui-space-3);
    display: flex;
    min-block-size: var(--sui-card-head-line);
  }

  .sui-card-title {
    align-self: center;
    color: var(--sui-text-primary);
    flex: 1 1 auto;
    font: 600 var(--sui-font-size-card-title) / var(--sui-leading-title) var(--sui-sans);
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
    flex: none;
    gap: var(--sui-space-2);
    margin-inline-start: auto;
  }

  .sui-card-footer {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
  }

  .sui-card-note {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: var(--sui-row-copy-gap) 0 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-card-body {
    min-inline-size: 0;
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

  @media (max-width: 36rem) {
    .sui-card {
      padding: var(--sui-rhythm-surface-pad-compact);
    }
  }
</style>
