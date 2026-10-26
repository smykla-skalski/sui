<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  import { CodeBlock, Disclosure } from '#lib';
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
  const level = $derived(section?.level ?? 3);

  let open = $state(false);
</script>

<!--
The kitchen sink's one way to show something: a titled example whose specimens stand on a
framed stage, with the markup that draws them a press away. The frame is a viewport around
live specimens, not a surface of the design, so it may hold cards and dialogs (L-55).
-->

<div class="example">
  <div class="head">
    <svelte:element this={`h${level}`} {id} class="title">{title}</svelte:element>
    {#if note}<p class="note">{note}</p>{/if}
  </div>
  <div class="frame">
    <div class="stage" data-ground={ground}>
      <div class="specimens" data-layout={layout}>{@render children()}</div>
    </div>
    {#if markup}
      <!-- The markup is drawn only once asked for, so the page never highlights code that no one
           reads. -->
      <div class="tools">
        <Disclosure summary="Code" bind:open>
          {#if open}<CodeBlock code={markup} lang="html" bare />{/if}
        </Disclosure>
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

  .title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .note {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  /* Its own stacking context, so a specimen's sticky bar or shell bar stacks inside the frame
     and never over the page's own bar. */
  .frame {
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    container: sink-stage / inline-size;
    display: grid;
    isolation: isolate;
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
    --stage-pad: var(--sui-space-6);
    box-sizing: border-box;
    min-inline-size: 0;
    padding: var(--stage-pad);
  }

  /* The ground is lent to the specimens too, for a part held over content that scrolls under
     it. */
  .stage[data-ground='surface'] {
    --sui-local-stage-ground: var(--sui-surface-base);
    background: var(--sui-surface-base);
  }

  .stage[data-ground='canvas'] {
    --sui-local-stage-ground: var(--sui-canvas);
    background: var(--sui-canvas);
  }

  .specimens {
    align-items: stretch;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-6) var(--sui-space-5);
    min-inline-size: 0;
  }

  /* A wrapping column sizes each line to its widest item, so a stack must not wrap. A stacked
     specimen spans the stage, so it lends the stage's inset to what it shows, such as a
     chart's band, which reaches the frame's edges with it. */
  .specimens[data-layout='stack'] {
    --sui-local-stage-pad: var(--sui-space-6);
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .specimens[data-layout='grid'] {
    align-items: stretch;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  }

  .tools {
    background: var(--sui-surface-base);
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    min-inline-size: 0;
    padding: var(--sui-space-2) var(--sui-space-4);
  }

  @container sink-stage (max-width: 30rem) {
    .stage {
      --stage-pad: var(--sui-space-4);
    }

    .specimens[data-layout='stack'] {
      --sui-local-stage-pad: var(--sui-space-4);
    }
  }
</style>
