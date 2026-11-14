<script lang="ts">
  import { getContext, untrack, type Snippet } from 'svelte';
  import { CodeBlock, Disclosure } from '#lib';
  import { addressed } from './address.svelte.js';
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
     * `row` wraps specimens side by side, `stack` puts each on its own line, `grid` lays
     * them in equal columns that fold on a narrow stage, and `pairs` sets wide specimens, such
     * as charts, two to a line on a wide stage and stacks them on a narrow one.
     */
    layout?: 'row' | 'stack' | 'grid' | 'pairs';
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

  // An open code panel is kept in the address, so a shared link opens it again.
  const shown = addressed(`code-${untrack(() => id)}`, '');
  const open = {
    get value() {
      return shown.value === 'open';
    },
    set value(next: boolean) {
      shown.value = next ? 'open' : '';
    }
  };
</script>

<!--
The kitchen sink's one way to show something: a titled example whose specimens stand on a
framed stage, with the markup that draws them a press away. The frame is a viewport around
live specimens, not a surface of the design, so it may hold cards and dialogs (L-55).
-->

<div class="example">
  <div class="head">
    <h3 {id} class="title">{title}</h3>
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
        <Disclosure
          inline
          summary="Code"
          bind:open={() => open.value, (next) => (open.value = next)}
        >
          {#if open.value}<div class="markup">
              <CodeBlock code={markup} lang="html" bare />
            </div>{/if}
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

  /* A head that a row of examples stretches keeps its title and note at its top. */
  .head {
    align-content: start;
    display: grid;
    gap: var(--sui-title-copy-gap);
  }

  /* An example's title stands a clear step over its note and its specimens' words, so a long
     page reads as titled examples rather than one run of text. */
  .title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-dialog-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .note {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    max-inline-size: var(--sui-measure);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  /* Its own stacking context, so a specimen's sticky bar or shell bar stacks inside the frame
     and never over the page's own bar. */
  /* A page whose specimens keep a measure, such as one form, sets `--example-max`, so the
     frame fits them and no wide empty stage leaves them stranded at its start. */
  .frame {
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    container: sink-stage / inline-size;
    display: grid;
    isolation: isolate;
    max-inline-size: var(--example-max, none);
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

  /* Lines of words side by side on one baseline, such as two fact lines, set a wider
     `--specimen-column-gap`, so they never read as one line. */
  .specimens {
    align-items: stretch;
    column-gap: var(--specimen-column-gap, var(--sui-space-6));
    display: flex;
    flex-wrap: wrap;
    min-inline-size: 0;
    row-gap: var(--sui-space-6);
  }

  /* A row specimen is as wide as its words, a fraction of a pixel past a whole one, so each is
     rounded up to whole pixels and the next one, with the mark it shows, starts on the pixel
     grid, where an edge draws the same however the layers above it change. */
  @supports (inline-size: calc-size(fit-content, size)) {
    .specimens[data-layout='row'] > :global(.specimen) {
      inline-size: calc-size(fit-content, round(up, size, 1px));
    }
  }

  /* A wrapping column sizes each line to its widest item, so a stack must not wrap. A stacked
     specimen spans the stage, so it lends the stage's inset to what it shows, such as a
     chart's band, which reaches the frame's edges with it. */
  .specimens:is([data-layout='stack'], [data-layout='pairs']) {
    --sui-local-stage-pad: var(--sui-space-6);
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;
    row-gap: var(--sui-local-stage-pad);
  }

  /* Stacked specimens, such as charts, are parted by a divider across the whole stage, so one
     specimen's caption never reads as the head of the next. */
  .specimens:is([data-layout='stack'], [data-layout='pairs']) > :global(.specimen + .specimen) {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    margin-inline: calc(-1 * var(--sui-local-stage-pad));
    padding: var(--sui-local-stage-pad) var(--sui-local-stage-pad) 0;
  }

  /* A caller whose specimens need more room per column, such as tables, sets
     `--specimen-min` on the example, and one whose specimens should keep a measure, such as
     fields, sets `--specimen-max`. */
  /* Rows of a grid stand further apart than a name stands over its specimen, so each name
     reads as the head of the specimen under it. A grid of short specimens, such as fields,
     may set a closer `--specimen-row-gap` that still keeps that order. A grid of fixed columns
     narrower than its frame, kept wide to end on one line with its neighbours, sets
     `--specimen-justify` to `space-between`, so its outer columns stand one inset from each
     edge. A grid of specimens whose hover or rules reach past their column, such as disclosures
     or tables, sets a wider `--specimen-column-gap`, so two lit rows or two tables' rules never
     meet. */
  .specimens[data-layout='grid'] {
    align-items: stretch;
    column-gap: var(--specimen-column-gap, var(--sui-space-6));
    display: grid;
    justify-content: var(--specimen-justify, normal);
    row-gap: var(--specimen-row-gap, var(--sui-space-8));
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(100%, var(--specimen-min, 16rem)), var(--specimen-max, 1fr))
    );
  }

  /* The Code row holds its disclosure's own target a step inside the band, so the hover veil
     never meets the frame's edge, and the frame's chrome stays lighter than the specimens it
     closes. Its chevron stands on the stage's inset, under the specimens' chevrons, and it is
     inline help, quieter than the specimens it shows. */
  .tools {
    background: var(--sui-surface-base);
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    min-inline-size: 0;
    padding: var(--sui-space-1) var(--sui-space-6);
  }

  /* Past a phone the Code row's target takes the quiet tier, so the band stays as tall as a
     compact target alone would be. The markup's own controls keep the frame's compact height. */
  @media (min-width: 48rem) {
    .frame {
      --frame-compact: var(--sui-control-height-compact);
    }

    .tools {
      --sui-control-height-compact: var(--sui-tier-quiet);
    }

    .markup {
      --sui-control-height-compact: var(--frame-compact);
    }
  }

  /* A phone pads its stages 16px; every frame on a wider page keeps 24px, however narrow its
     measure, so frames side by side or sized to one field inset alike (L-99). A stage that
     draws a dialog in place sets a smaller `--example-phone-pad`, since a dialog brings its
     own edge and inset and a live one fills the phone less 16px. */
  @media (max-width: 47.9375rem) {
    .stage {
      --stage-pad: var(--example-phone-pad, var(--sui-space-4));
    }

    .specimens:is([data-layout='stack'], [data-layout='pairs']) {
      --sui-local-stage-pad: var(--example-phone-pad, var(--sui-space-4));
    }

    .tools {
      padding-inline: var(--sui-space-4);
    }

    /* A stage padded less for a drawn dialog still stands its captions 16px in, on the line
       every other frame's captions start. */
    .stage :global(.specimen > figcaption) {
      padding-inline: calc(var(--sui-space-4) - var(--stage-pad));
    }

    /* Rows close to 24px on a phone, still 8px past the name gap, which a page whose tips need
       room widens. */
    .specimens[data-layout='grid'] {
      row-gap: calc(var(--specimen-caption-gap, var(--sui-space-4)) + var(--sui-space-2));
    }
  }

  /* A pair stands side by side once each half holds a range chart's least plot with its
     insets, 22rem, beside the gap and the stage's inset, and then lends no inset, since a band
     that reached past its half would cross its neighbour. */
  @container sink-stage (min-width: 48.25rem) {
    .specimens[data-layout='pairs'] {
      --sui-local-stage-pad: 0px;
      display: grid;
      gap: var(--sui-space-6);
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .specimens[data-layout='pairs'] > :global(.specimen + .specimen) {
      border-block-start: none;
      margin-inline: 0;
      padding: 0;
    }
  }
</style>
