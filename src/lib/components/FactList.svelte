<script module lang="ts">
  import type { Snippet } from 'svelte';

  export type Fact = {
    label: string;
    /**
     * Words, or a snippet for a value that is a component, such as a `RelativeTime` or a `Chip`.
     * Null or empty says `missingLabel` instead.
     */
    value: string | Snippet | null | undefined;
    /** Makes the value a link to this address. */
    href?: string;
    /** For a technical value: an ID, a path, a version or a count. */
    mono?: boolean;
  };
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Link from './Link.svelte';

  let {
    facts,
    missingLabel = 'Not set',
    class: className = '',
    ...rest
  }: {
    facts: readonly Fact[];
    /** Said in place of a value that is absent, so a fact never stands empty. */
    missingLabel?: string;
    class?: HTMLAttributes<HTMLDListElement>['class'];
  } & Omit<HTMLAttributes<HTMLDListElement>, 'children'> = $props();
</script>

<!--
@component
Short facts about a thing, each a label and its value, such as the branch, the version and
when it last synced. Facts sit in a row and wrap one by one, separated by space alone, so no
generated comma or dot is left at the end of a line. A setting a reader changes is a form row,
not a fact.

- Semantics: a `dl` with one `dt` and one `dd` per fact, each pair in its own `div`.
- Content: short labels and values; a value is words, a link through `href`, or a snippet such as a `RelativeTime` or a `Chip`.
- States: plain, linked and mono values, and the missing value, which says `missingLabel` in muted words.
- Keyboard: a linked value is a tab stop; nothing else is.
- Pointer and touch: every fact is at least 24px tall, and 44px on a phone or a coarse pointer, so a row keeps one height; a linked value is a standalone `Link`, whose hit area grows to that target size without moving its words.
- Focus: none moves; a linked value takes focus in reading order.
- Responsive: facts wrap one by one, a long value breaks inside its fact, and on a phone every fact takes its own line, 8px apart.
- Accessibility: the label is muted and regular and the value medium, so they differ by weight as well as ink; both hold 4.5:1.
- Localization: `missingLabel` is a prop with an English default; values come formatted by the caller in the page's language, and the row follows the reading direction.
- Performance: one element per fact, with no script; keep it to a handful of facts.
- Analytics: none of its own; a linked value is a `Link`, which reports like any link.
- Failure: an absent value says `missingLabel` instead of standing empty, and two facts may share a label without breaking the list.
-->

<dl {...rest} class={['sui-fact-list', className]}>
  {#each facts as fact, index (index)}
    <div class="sui-fact-list-fact">
      <dt class="sui-fact-list-label">{fact.label}</dt>
      <dd
        class="sui-fact-list-value"
        class:mono={fact.mono}
        class:missing={fact.value === null || fact.value === undefined || fact.value === ''}
      >
        {#if fact.value === null || fact.value === undefined || fact.value === ''}
          {missingLabel}
        {:else if typeof fact.value === 'function'}
          {@render fact.value()}
        {:else if fact.href !== undefined}
          <Link href={fact.href} standalone>{fact.value}</Link>
        {:else}
          {fact.value}
        {/if}
      </dd>
    </div>
  {/each}
</dl>

<style>
  .sui-fact-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-5);
    margin: 0;
    min-inline-size: 0;
  }

  .sui-fact-list-fact {
    align-content: center;
    align-items: baseline;
    column-gap: var(--sui-space-2);
    display: flex;
    flex-wrap: wrap;
    min-block-size: var(--sui-field-target-min);
    min-inline-size: 0;
    row-gap: var(--sui-row-copy-gap);
  }

  .sui-fact-list-label,
  .sui-fact-list-value {
    block-size: var(--sui-block-snap-even);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-fact-list-label {
    color: var(--sui-text-muted);
  }

  /* The value outweighs its label, so the pair reads apart without ink alone. */
  .sui-fact-list-value {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-medium);
    overflow-wrap: anywhere;
  }

  .missing {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 47.9375rem) {
    .sui-fact-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-fact-list-fact {
      min-block-size: var(--sui-touch-target);
    }
  }
</style>
