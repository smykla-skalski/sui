<script lang="ts">
  import type { Component } from 'svelte';
  import { PageHeader, PageToc, Select, SkipLink, ThemeSwitch } from '#lib';
  import AuditPanel from './audit/AuditPanel.svelte';

  type SectionMeta = { title: string; order: number };
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
        'fact-list'
      ]
    ],
    [
      'Marks',
      [
        'pill',
        'chip',
        'status-pill',
        'color-tag',
        'avatar',
        'clipped-label',
        'relative-time',
        'day-heading',
        'icons'
      ]
    ],
    ['Lists and states', ['object-list', 'list-toolbar', 'skeleton', 'load-more', 'states']],
    ['Charts', ['charts']],
    ['Shell', ['app-shell']]
  ];

  const place = (id: string): [number, number] => {
    const family = FAMILIES.findIndex(([, ids]) => ids.includes(id));
    return family < 0 ? [FAMILIES.length, 0] : [family, FAMILIES[family][1].indexOf(id)];
  };

  const modules = import.meta.glob<SectionModule>('./sink/*.svelte', { eager: true });
  const sections = Object.entries(modules)
    .map(([path, module]) => {
      const id = path.replace(/^.*\/|\.svelte$/g, '');
      const [family, position] = place(id);
      return {
        id,
        ...module.section,
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
    description="Every component in every state, measured against the design laws on each render"
    class="head"
  >
    {#snippet actions()}<ThemeSwitch name="sink-page-theme" />{/snippet}
  </PageHeader>

  <div class="layout">
    <PageToc {entries} title="Components" class="toc" />

    <main id="content" tabindex="-1">
      <div class="jump">
        <Select
          bind:value={jump}
          options={jumps}
          placeholder="Jump to a component"
          aria-label="Jump to a component"
        />
      </div>
      <AuditPanel />
      {#each sections as { id, title, Body } (id)}
        <section {id} aria-labelledby="{id}-title">
          <h2 id="{id}-title">{title}</h2>
          <Body />
        </section>
      {/each}
    </main>
  </div>
</div>

<style>
  .page {
    box-sizing: border-box;
    margin-inline: auto;
    max-inline-size: var(--sui-content-max);
    padding: var(--sui-rhythm-pane-top-wide) clamp(var(--sui-space-4), 2.4vw, var(--sui-space-8))
      var(--sui-space-8);
  }

  .layout {
    display: grid;
    gap: var(--sui-space-6);
    grid-template-columns: minmax(0, 1fr);
  }

  .layout :global(.toc) {
    display: none;
  }

  main {
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
  }

  main:focus {
    outline: none;
  }

  section {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-6);
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
    scroll-margin-block-start: var(--sui-space-4);
  }

  /* A section title stands a full tier above the example titles inside it (16px), so the
     two levels never read as one. */
  h2 {
    color: var(--sui-text-primary);
    font: 700 var(--sui-font-size-dialog-title) / var(--sui-leading-title) var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  /* Without the index column, a picker that stays in reach is the way across 60 sections. */
  .jump {
    background: var(--sui-canvas);
    inset-block-start: 0;
    padding-block: var(--sui-space-2);
    position: sticky;
    z-index: var(--sui-layer-sticky);
  }

  @media (max-width: 36rem) {
    section {
      padding: var(--sui-rhythm-surface-pad-compact);
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
</style>
