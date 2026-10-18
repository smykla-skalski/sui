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
      {#if code}<code>{code}</code>{:else}<code aria-hidden="true">&nbsp;</code>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  /* The body is a grid as wide as the specimen: a block surface or a field fills it, while
     a mark keeps its own fit-content width (L-43). Specimens on one line share the tallest
     one's height, and the body takes the spare room, so their captions line up at the bottom. */
  .specimen {
    display: grid;
    gap: var(--sui-space-3);
    grid-template-rows: 1fr auto;
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

  figcaption {
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

  code {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
