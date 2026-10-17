<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLDetailsAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';

  let {
    summary,
    hint,
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
own padding, so its words share the left edge of the heading above it, and the chevron at
its end sits inside the hit area and turns a quarter when open.

The open content sits on the same surface with no frame and no colored edge. A disclosure
that reveals controls puts them in their own `Card` inside it. `inline` is the smaller help
row for a settings column.
-->

<details {...rest} bind:open class={['sui-disclosure', className, { inline }]}>
  <summary class="sui-disclosure-summary">
    <span class="sui-disclosure-label">{summary}</span>
    {#if hint !== undefined}
      <span class="sui-disclosure-hint">{hint}</span>
    {/if}
    <span class="sui-disclosure-chevron"><Icon name="chevron-right" size="xs" /></span>
  </summary>
  <div class="sui-disclosure-body">{@render children()}</div>
</details>

<style>
  .sui-disclosure {
    margin: 0;
    min-inline-size: 0;
  }

  .sui-disclosure-summary {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    font: 500 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-2);
    list-style: none;
    margin-inline: calc(var(--sui-space-3) * -1);
    min-block-size: 36px;
    padding: 0 var(--sui-space-3);
    touch-action: manipulation;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-disclosure-summary::-webkit-details-marker {
    display: none;
  }

  .sui-disclosure-summary:hover:not(:active) {
    background: var(--sui-row-hover);
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
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
  }

  .sui-disclosure-hint {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin-inline-start: auto;
    text-box: trim-both cap alphabetic;
  }

  .sui-disclosure-chevron {
    color: var(--sui-text-muted);
    display: flex;
    flex: none;
    margin-inline-start: auto;
    transition: rotate var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-disclosure-hint + .sui-disclosure-chevron {
    margin-inline-start: 0;
  }

  [open] > .sui-disclosure-summary .sui-disclosure-chevron {
    rotate: 90deg;
  }

  .sui-disclosure-body {
    margin-block-start: var(--sui-space-2);
    min-inline-size: 0;
  }

  .inline > .sui-disclosure-summary {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
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

  /* A finger needs a 44px target (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-disclosure-summary {
      min-block-size: var(--sui-touch-target);
    }
  }
</style>
