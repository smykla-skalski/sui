<script module lang="ts">
  import type { Snippet } from 'svelte';

  export type Fact = {
    label: string;
    /** Words, or a snippet for a value that is a component, such as a `RelativeTime` or a `Chip`. */
    value: string | Snippet;
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
    class: className = '',
    ...rest
  }: {
    facts: readonly Fact[];
    class?: HTMLAttributes<HTMLDListElement>['class'];
  } & Omit<HTMLAttributes<HTMLDListElement>, 'children'> = $props();
</script>

<!--
@component
Short facts about a thing, each a label and its value, such as the branch, the version and
when it last synced. Facts sit in a row and wrap one by one, separated by space alone, so no
generated comma or dot is left at the end of a line. A long value breaks inside its fact
rather than pushing the row wider. On a phone every fact takes its own line, 8px apart.

Every fact is at least 24px tall, and 44px on a phone, so a row does not change height when
one of its facts is a link, and a linked value is that tall a target. Technical values are
mono with tabular figures. A setting a reader changes is a form row, not a fact.
-->

<dl {...rest} class={['sui-fact-list', className]}>
  {#each facts as fact (fact.label)}
    <div class="sui-fact-list-fact">
      <dt class="sui-fact-list-label">{fact.label}</dt>
      <dd class="sui-fact-list-value" class:mono={fact.mono}>
        {#if typeof fact.value === 'function'}
          {@render fact.value()}
        {:else if fact.href !== undefined}
          <Link href={fact.href} class="fact-link">{fact.value}</Link>
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
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-fact-list-label {
    color: var(--sui-text-muted);
  }

  .sui-fact-list-value {
    color: var(--sui-text-primary);
    overflow-wrap: anywhere;
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  /* A linked value is the fact's own target, as tall as the fact. */
  .sui-fact-list-value > :global(.fact-link) {
    align-items: center;
    display: inline-flex;
    min-block-size: var(--sui-field-target-min);
  }

  @media (max-width: 47.9375rem) {
    .sui-fact-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    .sui-fact-list-fact,
    .sui-fact-list-value > :global(.fact-link) {
      min-block-size: var(--sui-touch-target);
    }
  }
</style>
