<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    code,
    children
  }: {
    /** The state or variant in words, such as "Disabled". */
    label?: string | Snippet;
    /** The props that draw it, such as `tone="signal"`. */
    code?: string;
    children: Snippet;
  } = $props();

  /* Props that only repeat the state's name, as `disabled` under "Disabled", say nothing new, so
     the caption leaves them to the example's code. */
  const repeats = (name: string, props: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '') === props.toLowerCase().replace(/[^a-z0-9]/g, '');
  const shown = $derived(typeof label === 'string' && code && repeats(label, code) ? '' : code);

  /* The caption's props, split at the spaces between them and never inside a quoted or braced
     value, so a line breaks between props and `patience={0}` never loses its `{0}`. */
  const propsOf = (source: string) => {
    const parts: string[] = [];
    let part = '';
    let depth = 0;
    let quote = '';
    for (const char of source) {
      if (quote) quote = char === quote ? '' : quote;
      else if (`"'\``.includes(char)) quote = char;
      else if ('{[('.includes(char)) depth++;
      else if ('}])'.includes(char)) depth--;
      else if (/\s/.test(char) && depth === 0) {
        if (part) parts.push(part);
        part = '';
        continue;
      }
      part += char;
    }
    if (part) parts.push(part);
    return parts;
  };
</script>

<figure class="specimen">
  <div class="body">{@render children()}</div>
  {#if label || code}
    <!-- Both lines take their room in a row or a stack, so captions side by side start on one
         line; a grid's shared rows line them up without it. -->
    <figcaption>
      {#if typeof label === 'function'}<span class="label">{@render label()}</span
        >{:else if label}<span class="label">{label}</span>{:else}<span
          class="label"
          aria-hidden="true">&nbsp;</span
        >{/if}
      {#if shown}{@const props = propsOf(shown)}<code translate="no"
          >{#each props as prop, index (index)}<span
              >{index < props.length - 1 ? `${prop} ` : prop}</span
            >{/each}</code
        >{:else}<code class="blank" aria-hidden="true"><span>&nbsp;</span></code>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  /* The body is a grid as wide as the specimen: a block surface or a field fills it, while
     a mark keeps its own fit-content width (L-43). In a grid of specimens it takes two of the
     grid's rows, so every body on a line shares the tallest body's track and every caption the
     tallest caption's: their labels start on one line even when a caption wraps. In
     a row or a stack there is no parent grid, the subgrid falls back to two rows of its own,
     and specimens on one line share the tallest one's height with the caption at the bottom. */
  .specimen {
    align-content: space-between;
    display: grid;
    gap: var(--sui-space-4);
    grid-row: span 2;
    grid-template-rows: subgrid;
    margin: 0;
    min-inline-size: 0;
  }

  /* One shrinkable column: a surface capped at 100% stays inside a narrow stage. */
  .body {
    align-content: start;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  /* A chart, a state panel or a section fills its body, so those on one line share their foot as
     well as their top. */
  .body:has(> :global(:is(.sui-chart, .sui-section, .sui-empty-state, .sui-error-state))) {
    align-content: stretch;
  }

  /* What the specimen shows takes the inset a stacked stage lends, as a card lends its own. */
  .body > :global(*) {
    --sui-local-bleed: var(--sui-local-stage-pad, 0px);
  }

  figcaption {
    align-content: start;
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .label {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-sans);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* Each prop is a word of the caption: a line breaks between props, and only a prop longer
     than the whole line breaks inside, under its own first line. A prop keeps its trailing
     space in its text, so the caption copies and reads with its spaces. */
  code {
    color: var(--sui-text-muted);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-caption) / var(--sui-leading-compact)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    row-gap: var(--sui-row-copy-gap);
  }

  code > span {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    white-space: pre-wrap;
  }

  /* A one-column stage on a phone keeps each caption close under its own specimen. */
  @container sink-stage (max-width: 30rem) {
    .specimen {
      gap: var(--sui-space-3);
    }
  }

  :global(.specimens[data-layout='grid']) > .specimen .blank {
    display: none;
  }
</style>
