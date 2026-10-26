<script module lang="ts">
  /** What a kitchen sink section file exports as `section`. Its place comes from the family list
   * in `sections.ts`. */
  export type SectionMeta = {
    title: string;
    /** One or two sentences: what the component is for, and when to reach for another. */
    lead: string;
    /** The library components the section shows, linked to their source. */
    components: string[];
  };

  export type SectionContext = {
    readonly id: string;
    readonly source: string;
    /** The level of the examples' headings, one under the section's title. */
    readonly level: 2 | 3;
  };
</script>

<script lang="ts">
  import { setContext } from 'svelte';
  import { Link } from '#lib';
  import { sources, type SinkSection } from './sections';

  let {
    section,
    head = true
  }: {
    section: SinkSection;
    /** Draws the title and the lead. A component's own page says both in its page header. */
    head?: boolean;
  } = $props();

  const { id, meta, source, Body } = $derived(section);

  setContext<SectionContext>('sink-section', {
    get id() {
      return id;
    },
    get source() {
      return source;
    },
    get level() {
      return head ? 3 : 2;
    }
  });

  const REPOSITORY = 'https://github.com/smykla-skalski/sui/blob/main/';

  /* Chrome restyles every running animation on every frame it draws, seen or not, and the sink
     holds about a hundred endless ones, spinners and loading sheens, which would cost a scroll
     or a keystroke its frame. A section more than a screen away holds its own still, and they
     run on before it comes into view; a held loop is never seen, so nothing looks different. */
  function stillWhenAway(section: HTMLElement) {
    // The section's endless animations, read once when it first leaves and then as each starts,
    // so a section passing the edge of the margin only pauses or plays what it holds.
    const loops = new Set<Animation>();
    const held = new Set<Animation>();
    let read = false;
    let away = false;
    const gather = (from: Element) => {
      for (const animation of from.getAnimations({ subtree: true }))
        if (animation.effect?.getTiming().iterations === Infinity) loops.add(animation);
    };
    const hold = () => {
      if (!read) gather(section);
      read = true;
      for (const animation of loops) {
        if (animation.playState === 'idle') loops.delete(animation);
        else if (animation.playState === 'running') {
          animation.pause();
          held.add(animation);
        }
      }
    };
    const release = () => {
      for (const animation of held) if (animation.playState === 'paused') animation.play();
      held.clear();
    };
    const near = new IntersectionObserver(
      ([entry]) => {
        away = !entry.isIntersecting;
        if (away) hold();
        else release();
      },
      { rootMargin: '100% 0px' }
    );
    // A loop that starts later, as a skeleton that turns slow, joins them, and holds if away.
    const started = (event: AnimationEvent) => {
      if (!read || !(event.target instanceof Element)) return;
      gather(event.target);
      if (away) hold();
    };
    near.observe(section);
    section.addEventListener('animationstart', started);
    return () => {
      near.disconnect();
      section.removeEventListener('animationstart', started);
      release();
    };
  }
</script>

<!-- No accessible name, so the sections are headings to jump between, not one landmark region
     each (L-108). -->
<section {id} class={['section', { headed: head }]} {@attach stillWhenAway}>
  <header class="head">
    {#if head}
      <h2>{meta.title}</h2>
      <p class="lead">{meta.lead}</p>
    {/if}
    {#if meta.components.length > 0}
      <p class="sources">
        <span class="sources-label">Source</span>
        {#each meta.components as name (name)}
          {#if sources[name]}
            <Link href={REPOSITORY + sources[name]} standalone>{name}</Link>
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
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
  }

  /* On the page of every section, a line parts one component from the next. */
  .headed {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    padding-block: var(--sui-space-8) var(--sui-space-4);
  }

  .headed:not(:first-child) {
    margin-block-start: var(--sui-space-8);
  }

  .head {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  h2 {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-bold) var(--sui-font-size-dialog-title) / var(--sui-leading-title)
      var(--sui-sans);
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
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sources {
    align-items: baseline;
    color: var(--sui-text-muted);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-1) var(--sui-space-3);
    margin: 0;
  }

  .sources-label {
    font-weight: var(--sui-weight-semibold);
  }

  /* The links stand alone, so their hit areas grow to 44px on a touch screen; wrapped lines
     stand far enough apart that two hit areas never overlap. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sources {
      row-gap: var(--sui-space-6);
    }
  }

  .name {
    color: var(--sui-text-secondary);
  }
</style>
