<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  import { Button, CodeBlock, Icon } from '#lib';
  import type { SectionContext } from './Section.svelte';
  import { exampleSource, slug } from './source';

  let {
    title,
    note,
    layout = 'row',
    ground = 'surface',
    code = true,
    children
  }: {
    title: string;
    /** One period-free sentence saying what this example proves. */
    note?: string;
    /**
     * `row` wraps specimens side by side, `stack` puts each on its own line, and `grid` lays
     * them in equal columns that fold on a narrow stage.
     */
    layout?: 'row' | 'stack' | 'grid';
    /**
     * The ground the specimens stand on: `surface` for what lives inside a card or panel,
     * `canvas` for surfaces themselves (cards, dialogs, shells), so they read as they will.
     */
    ground?: 'surface' | 'canvas';
    /** Offers the markup that draws the example, cut from the section's own source. */
    code?: boolean;
    children: Snippet;
  } = $props();

  const section = getContext<SectionContext | undefined>('sink-section');
  const id = $derived(section ? `${section.id}-${slug(title)}` : slug(title));
  const markup = $derived(code && section ? exampleSource(section.source, title) : null);

  let open = $state(false);
</script>

<!--
The kitchen sink's one way to show something: a titled example whose specimens stand on a
framed stage, with the markup that draws them a press away. The frame is a viewport around
live specimens, not a surface of the design, so it may hold cards and dialogs (L-55).
-->

<div class="example">
  <div class="head">
    <h3 {id}>{title}</h3>
    {#if note}<p class="note">{note}</p>{/if}
  </div>
  <div class="frame">
    <div class="stage" data-ground={ground}>
      <div class="specimens" data-layout={layout}>{@render children()}</div>
    </div>
    <div class="tools">
      {#if markup}
        <Button
          tone="ghost"
          aria-expanded={open}
          aria-controls={open ? `${id}-code` : undefined}
          onclick={() => (open = !open)}
        >
          Show code
          {#snippet trailing()}<span class="chevron" class:open
              ><Icon name="chevron-down" size="sm" /></span
            >{/snippet}
        </Button>
      {/if}
      <!-- A review comment can point at one example. -->
      <span class="end">
        <Button tone="ghost" href="#{id}" aria-label="Link to {title}">
          {#snippet icon()}<Icon name="link" size="sm" />{/snippet}
          Link
        </Button>
      </span>
    </div>
    {#if open && markup}
      <div id="{id}-code" class="code">
        <CodeBlock code={markup} lang="html" bare />
      </div>
    {/if}
  </div>
</div>

<style>
  .example {
    display: grid;
    gap: var(--sui-space-4);
    min-inline-size: 0;
  }

  .head {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  h3 {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-title) / var(--sui-leading-title) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .note {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .frame {
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    container: sink-stage / inline-size;
    display: grid;
    min-inline-size: 0;
  }

  .frame > :first-child {
    border-start-end-radius: inherit;
    border-start-start-radius: inherit;
  }

  .frame > :last-child {
    border-end-end-radius: inherit;
    border-end-start-radius: inherit;
  }

  .stage {
    box-sizing: border-box;
    min-inline-size: 0;
    padding: var(--sui-space-6);
  }

  .stage[data-ground='surface'] {
    background: var(--sui-surface-base);
  }

  .stage[data-ground='canvas'] {
    background: var(--sui-canvas);
  }

  .specimens {
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-6) var(--sui-space-5);
    min-inline-size: 0;
  }

  /* A wrapping column sizes each line to its widest item, so a stack must not wrap. */
  .specimens[data-layout='stack'] {
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .specimens[data-layout='grid'] {
    align-items: start;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  }

  .tools {
    background: var(--sui-surface-base);
    border-block-start: 1px solid var(--sui-border-subtle);
    display: flex;
    gap: var(--sui-space-2);
    padding: var(--sui-space-2);
  }

  .end {
    display: flex;
    margin-inline-start: auto;
  }

  .chevron {
    display: inline-flex;
    transition: rotate var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .chevron.open {
    rotate: 180deg;
  }

  .code {
    border-block-start: 1px solid var(--sui-border-subtle);
    min-inline-size: 0;
  }

  @container sink-stage (max-width: 30rem) {
    .stage {
      padding: var(--sui-space-4);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
</style>
