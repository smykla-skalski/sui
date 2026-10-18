<script lang="ts">
  import type { Component } from 'svelte';
  import { Button, Icon, PageHeader, PageToc, Select, SkipLink, ThemeSwitch } from '#lib';
  import AuditPanel from './audit/AuditPanel.svelte';
  import Section, { type SectionMeta } from './kit/Section.svelte';

  type SectionModule = { default: Component; section: SectionMeta };

  // The families a reader looks for, in the order the README lists them. A section that is
  // not listed here still shows, at the end, so a new section is never lost.
  const FAMILIES: [string, string[]][] = [
    ['Actions', ['buttons', 'icon-buttons', 'navigation', 'tabs', 'skip-link']],
    [
      'Inputs',
      [
        'text-input',
        'field',
        'textarea',
        'search-field',
        'switch',
        'checkbox',
        'choice-cards',
        'segmented-control',
        'theme-switch',
        'copyable-link-field',
        'color-picker'
      ]
    ],
    [
      'Pickers and editors',
      [
        'select',
        'combobox',
        'action-menu',
        'help-tip',
        'duration-input',
        'pair-entry',
        'pattern-entries',
        'inherit-control',
        'addition-picker',
        'setting-list'
      ]
    ],
    ['Overlays', ['overlays', 'modal', 'confirm-dialog', 'toaster', 'save-bar']],
    [
      'Surfaces and content',
      [
        'card',
        'plate',
        'callout',
        'disclosure',
        'page-header',
        'page-toc',
        'code-block',
        'diff-block',
        'data-table',
        'fact-list',
        'fact-line'
      ]
    ],
    ['Marks', ['pill', 'chip', 'avatar', 'clipped-label', 'relative-time', 'day-heading', 'icons']],
    ['Lists and states', ['object-list', 'list-toolbar', 'skeleton', 'load-more', 'states']],
    ['Charts', ['charts']],
    ['Shell', ['app-shell']]
  ];

  const place = (id: string): [number, number] => {
    const family = FAMILIES.findIndex(([, ids]) => ids.includes(id));
    return family < 0 ? [FAMILIES.length, 0] : [family, FAMILIES[family][1].indexOf(id)];
  };

  const modules = import.meta.glob<SectionModule>('./sink/*.svelte', { eager: true });
  // Each section's own text, so every example can offer the markup that draws it.
  const texts = import.meta.glob<string>('./sink/*.svelte', {
    eager: true,
    import: 'default',
    query: '?raw'
  });
  // Only the paths: a section links each component it shows to its source.
  const sources = Object.fromEntries(
    Object.keys(
      import.meta.glob([
        '../lib/components/*.svelte',
        '../lib/charts/*.svelte',
        '../lib/icons/*.svelte'
      ])
    ).map((path) => [path.replace(/^.*\/|\.svelte$/g, ''), path.replace(/^\.\.\//, 'src/')])
  );
  const sections = Object.entries(modules)
    .map(([path, module]) => {
      const id = path.replace(/^.*\/|\.svelte$/g, '');
      const [family, position] = place(id);
      return {
        id,
        meta: module.section,
        title: module.section.title,
        order: module.section.order,
        source: texts[path] ?? '',
        family: FAMILIES[family]?.[0] ?? 'More',
        rank: family * 100 + position,
        Body: module.default
      };
    })
    .sort((a, b) => a.rank - b.rank || a.order - b.order || a.title.localeCompare(b.title));
  const entries = sections.map(({ id, title, family }) => ({ id, label: title, group: family }));
  const jumps = Object.values(
    Object.groupBy(sections, (section) => section.family) as Record<string, typeof sections>
  ).map((members) => ({
    label: members[0].family,
    options: members.map(({ id, title }) => ({ value: id, label: title }))
  }));

  let jump = $state<string | null>(null);

  // The header's pickers become a bar fixed to the top of the window once their place in the
  // header has scrolled away. Their place keeps its height, so nothing below it moves.
  let slot = $state<HTMLElement | null>(null);
  let compact = $state(false);
  // The slot keeps the box the tools had in it while they ride in the fixed bar, so the header
  // keeps its wrap and the page under it never moves when the bar comes or goes.
  let held = $state({ inline: 0, block: 0 });
  $effect(() => {
    if (!slot) return;
    // One call can carry several entries for the slot, as when the page scrolls before the
    // first one is delivered, and only the last is current.
    const watcher = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const next = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
      if (next && !compact && slot) held = { inline: slot.offsetWidth, block: slot.offsetHeight };
      compact = next;
    });
    watcher.observe(slot);
    return () => watcher.disconnect();
  });

  $effect(() => {
    if (!jump) return;
    document.getElementById(jump)?.scrollIntoView({ block: 'start' });
    history.replaceState(null, '', `#${jump}`);
  });
</script>

<svelte:head>
  <title>SUI kitchen sink</title>
  <meta
    name="description"
    content="Every SUI component in every state, held to the SUI design laws"
  />
</svelte:head>

<SkipLink href="#content" />

<div class="page">
  <PageHeader
    eyebrow="SUI"
    title="Kitchen sink"
    description="Every component in every state, measured against the design laws on every render"
  >
    {#snippet actions()}
      <div
        class="slot"
        bind:this={slot}
        style:inline-size={compact ? `${held.inline}px` : undefined}
        style:block-size={compact ? `${held.block}px` : undefined}
      >
        <div class={['tools', { compact }]}>
          <p class="tools-title" aria-hidden="true">Kitchen sink</p>
          <!-- Without the index column, this is the way across the sections. -->
          <div class="jump">
            <Select
              bind:value={jump}
              options={jumps}
              placeholder="Jump to a component"
              aria-label="Jump to a component"
            />
          </div>
          <div class="theme"><ThemeSwitch name="sink-page-theme" system={false} /></div>
        </div>
      </div>
    {/snippet}
  </PageHeader>

  <div class="layout">
    <PageToc {entries} title="Components" offset="var(--sink-bar)" class="toc" />

    <main id="content" tabindex="-1">
      <AuditPanel />
      {#each sections as { id, family, meta, source, Body } (id)}
        <Section {id} {family} {meta} {source} {sources} body={Body} />
      {/each}
    </main>
  </div>

  <!-- "#top" is the fragment every browser takes to the start of the page, with no script. -->
  {#if compact}
    <div class="to-top">
      <Button href="#top">
        {#snippet icon()}<Icon name="chevron-up" size="sm" />{/snippet}
        Back to top
      </Button>
    </div>
  {/if}
</div>

<style>
  /* The bar the header's pickers become, and the room anchors, the index and focus keep
     below it so nothing lands under it. */
  :global(html) {
    --sink-bar: calc(var(--sui-control-height-compact) + 2 * var(--sui-space-2) + 1px);
    --sink-gutter: clamp(var(--sui-space-4), 2.4vw, var(--sui-space-8));
    --sink-width: calc(var(--sui-content-max) + var(--sui-toc-width));
    --sink-float: max(var(--sui-space-6), env(safe-area-inset-bottom));
    /* The page ends clear of the floating button, so it never covers the last section. */
    --sink-floor: calc(var(--sui-touch-target) + 2 * var(--sink-float));

    scroll-padding-block-start: calc(var(--sink-bar) + var(--sui-space-4));
  }

  /* The index column sits beside the reading column, so the page is wider by the index. */
  .page {
    box-sizing: border-box;
    margin-inline: auto;
    max-inline-size: var(--sink-width);
    padding: var(--sui-rhythm-pane-top-wide) var(--sink-gutter) var(--sink-floor);
  }

  .slot {
    display: flex;
    flex: 1 1 auto;
    min-block-size: var(--sui-control-height-compact);
    min-inline-size: 0;
  }

  .tools {
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    gap: var(--sui-space-3);
    min-inline-size: 0;
  }

  /* Fixed to the window, lined up with the page's column, and sliding in from above. */
  .tools.compact {
    animation: sink-bar-in var(--sui-duration-normal) var(--sui-ease-out);
    background: var(--sui-canvas);
    border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
    box-sizing: border-box;
    inset-block-start: 0;
    inset-inline: 0;
    min-block-size: var(--sink-bar);
    padding-block: var(--sui-space-2);
    padding-inline: max(
      var(--sink-gutter),
      calc((100% - var(--sink-width)) / 2 + var(--sink-gutter))
    );
    position: fixed;
    z-index: var(--sui-layer-sticky);
  }

  @keyframes sink-bar-in {
    from {
      translate: 0 -100%;
    }
  }

  /* Shown once the header has scrolled away, at the end of the page's column. */
  .to-top {
    border-radius: var(--sui-radius-control);
    box-shadow: var(--sui-shadow-popover);
    display: flex;
    inset-block-end: var(--sink-float);
    inset-inline-end: max(
      var(--sink-gutter),
      calc((100% - var(--sink-width)) / 2 + var(--sink-gutter))
    );
    position: fixed;
    z-index: var(--sui-layer-sticky);
  }

  .tools-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    display: none;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .jump {
    flex: 1 1 auto;
    max-inline-size: 20rem;
    min-inline-size: 0;
  }

  .theme {
    flex: none;
    margin-inline-start: auto;
  }

  /* The index keeps the rest of the gap inside its own scroll area, for its scrollbar. */
  .layout {
    column-gap: var(--sui-space-3);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .layout :global(.toc) {
    display: none;
  }

  /* The index pads its own scroll area, so the column beside it starts as low. */
  main {
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
    padding-block-start: var(--sui-space-6);
  }

  main:focus {
    outline: none;
  }

  @media (min-width: 48rem) {
    .compact .tools-title {
      display: block;
    }
  }

  @media (min-width: 72rem) {
    .layout {
      grid-template-columns: var(--sui-toc-width) minmax(0, 1fr);
    }

    .layout :global(.toc) {
      display: block;
    }

    .jump {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tools.compact {
      animation: none;
    }
  }
</style>
