<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    code,
    children
  }: {
    /** The state or variant in words, such as "Disabled". */
    label?: string;
    /** The props that draw it, such as `tone="signal"`. */
    code?: string;
    children: Snippet;
  } = $props();

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

  let body = $state<HTMLElement | null>(null);
  let caption = $state<HTMLElement | null>(null);
  /* How wide the shown component and its caption's words run, so the rule under them spans
     what is shown and not a stretched specimen. Layers and anything taken out of the flow do
     not count. The rule is drawn out of the flow, so this width never sizes the specimen. */
  let reach = $state<number | null>(null);

  $effect(() => {
    const box = body;
    const band = caption;
    if (!box || !band) return;
    const parts = () => [...box.children, ...band.children];
    const measure = () => {
      const edges = parts()
        .filter((part) => !/^(absolute|fixed)$/.test(getComputedStyle(part).position))
        .map((part) => part.getBoundingClientRect())
        .filter((rect) => rect.width > 0);
      reach = edges.length
        ? Math.min(
            band.clientWidth,
            Math.max(...edges.map((rect) => rect.right)) -
              Math.min(...edges.map((rect) => rect.left))
          )
        : null;
    };
    const watch = new ResizeObserver(measure);
    watch.observe(box);
    watch.observe(band);
    for (const part of parts()) watch.observe(part);
    measure();
    return () => watch.disconnect();
  });
</script>

<figure class="specimen">
  <div bind:this={body} class="body">{@render children()}</div>
  {#if label || code}
    <!-- Both lines always take their room, so captions side by side start on one line. -->
    <figcaption
      bind:this={caption}
      style:--rule={reach === null ? undefined : `${Math.ceil(reach)}px`}
    >
      {#if label}<span class="label">{label}</span>{:else}<span class="label" aria-hidden="true"
          >&nbsp;</span
        >{/if}
      {#if code}{@const props = propsOf(code)}<code
          >{#each props as prop, index (index)}<span
              >{index < props.length - 1 ? `${prop} ` : prop}</span
            >{/each}</code
        >{:else}<code aria-hidden="true"><span>&nbsp;</span></code>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  /* The body is a grid as wide as the specimen: a block surface or a field fills it, while
     a mark keeps its own fit-content width (L-43). In a grid of specimens it takes two of the
     grid's rows, so every body on a line shares the tallest body's track and every caption the
     tallest caption's: their rules and labels start on one line even when a caption wraps. In
     a row or a stack there is no parent grid, the subgrid falls back to two rows of its own,
     and specimens on one line share the tallest one's height with the caption at the bottom. */
  .specimen {
    align-content: space-between;
    display: grid;
    gap: var(--sui-space-3);
    grid-row: span 2;
    grid-template-rows: subgrid;
    margin: 0;
    min-inline-size: 0;
  }

  /* In a grid, each specimen past the first line draws the dashed rule centred in the gap above
     it, so the reader sees where the next line starts. Every specimen reaches half the gap up,
     so the lines stay level whether or not they draw it. */
  @supports (inline-size: calc(1px * sibling-index())) and (inline-size: calc(1px * (1px / 1px))) {
    .specimen {
      --past-first-line: clamp(0, sibling-index() - var(--sui-local-grid-columns, infinity), 1);
      border-block-start: calc(var(--sui-stroke) * var(--past-first-line)) dashed
        var(--sui-border-control);
      margin-block-start: calc(var(--sui-local-grid-gap, 0px) / -2);
      padding-block-start: calc(
        var(--sui-local-grid-gap, 0px) / 2 - var(--sui-stroke) * var(--past-first-line)
      );
    }
  }

  /* One shrinkable column: a surface capped at 100% stays inside a narrow stage. */
  .body {
    align-content: start;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
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
    padding-block-start: var(--sui-space-3);
    position: relative;
  }

  /* A dashed rule parts what is shown from what names it, as wide as the component or the
     caption's own words, whichever is wider. */
  figcaption::before {
    border-block-start: var(--sui-stroke) dashed var(--sui-border-control);
    content: '';
    inline-size: var(--rule, 100%);
    inset-block-start: 0;
    inset-inline-start: 0;
    position: absolute;
  }

  .label {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-medium) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  /* Each prop is a word of the caption: a line breaks between props, and only a prop longer
     than the whole line breaks inside, under its own first line. A prop keeps its trailing
     space in its text, so the caption copies and reads with its spaces. */
  code {
    color: var(--sui-text-muted);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    row-gap: var(--sui-row-copy-gap);
  }

  code > span {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
    white-space: pre-wrap;
  }
</style>
