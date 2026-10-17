<script module lang="ts">
  /** What a kitchen sink section file exports as `section`. */
  export type SectionMeta = {
    title: string;
    order: number;
    /** One or two sentences: what the component is for, and when to reach for another. */
    lead: string;
    /** The library components the section shows, linked to their source. */
    components: string[];
  };

  export type SectionContext = { readonly id: string; readonly source: string };
</script>

<script lang="ts">
  import { setContext, type Component } from 'svelte';
  import { Link } from '#lib';

  let {
    id,
    family,
    meta,
    source,
    sources,
    body: Body
  }: {
    id: string;
    family: string;
    meta: SectionMeta;
    /** The section file's own text, which its examples cut their code from. */
    source: string;
    /** Each listed component's path in the repository. */
    sources: Record<string, string>;
    body: Component;
  } = $props();

  setContext<SectionContext>('sink-section', {
    get id() {
      return id;
    },
    get source() {
      return source;
    }
  });

  const REPOSITORY = 'https://github.com/smykla-skalski/sui/blob/main/';
</script>

<section {id} class="section" aria-labelledby="{id}-title">
  <header class="head">
    <p class="family">{family}</p>
    <h2 id="{id}-title">{meta.title}</h2>
    <p class="lead">{meta.lead}</p>
    {#if meta.components.length > 0}
      <p class="sources">
        <span class="sources-label">Source</span>
        {#each meta.components as name (name)}
          {#if sources[name]}
            <Link href={REPOSITORY + sources[name]}>{name}</Link>
          {:else}
            <span class="name">{name}</span>
          {/if}
        {/each}
      </p>
    {/if}
  </header>
  <Body />
</section>

<style>
  .section {
    border-block-start: 1px solid var(--sui-border-divider);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
    padding-block: var(--sui-space-8) var(--sui-space-4);
  }

  .head {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  .family {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-sans);
    letter-spacing: 0.06em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  h2 {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: 700 var(--sui-font-size-dialog-title) / var(--sui-leading-title) var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  /* The page index moves focus here after a jump, so the heading wears the shared ring. */
  h2:focus-visible {
    border-radius: var(--sui-radius-control);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .lead {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-body) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sources {
    align-items: baseline;
    color: var(--sui-text-muted);
    display: flex;
    flex-wrap: wrap;
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-1) var(--sui-space-3);
    margin: 0;
  }

  .sources-label {
    font-weight: 600;
  }

  .name {
    color: var(--sui-text-secondary);
  }
</style>
