<script lang="ts">
  import type { Component } from 'svelte';
  import { page } from '$app/state';
  import { AppShell, Button, Icon, PageHeader, PageToc, Rail, SkipLink, ThemeSwitch } from '#lib';
  import AuditPanel from './audit/AuditPanel.svelte';
  import Section, { type SectionMeta } from './kit/Section.svelte';
  import { places } from './places';

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

  // The header's tools become a bar fixed over the content once their place in the header has
  // scrolled away.
  let compact = $state(false);
  // The slot keeps the box the tools had in it while they ride in the fixed bar, so the header
  // keeps its wrap and the page under it never moves when the bar comes or goes.
  let held = $state({ inline: 0, block: 0 });
  let slides = $state(false);
  function watch(slot: HTMLElement) {
    // The first report is where the page already stands, as after a reload halfway down, so the
    // bar is simply there; only the reader's own scrolling slides it in.
    let reported = false;
    // One call can carry several entries for the slot, as when the page scrolls before the
    // first one is delivered, and only the last is current.
    const watcher = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const next = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
      if (next && !compact) held = { inline: slot.offsetWidth, block: slot.offsetHeight };
      slides = reported;
      reported = true;
      compact = next;
    });
    watcher.observe(slot);
    return () => watcher.disconnect();
  }
</script>

<svelte:head>
  <title>SUI kitchen sink</title>
  <meta
    name="description"
    content="Every SUI component in every state, held to the SUI design laws"
  />
</svelte:head>

<SkipLink href="#content" />

<AppShell title="Kitchen sink" landmark="none">
  {#snippet rail()}
    <Rail items={places} current={page.url.pathname} />
  {/snippet}
  {#snippet sidebar()}
    <div class="index"><PageToc {entries} title="Components" class="toc" /></div>
  {/snippet}

  <div class="sink">
    <PageHeader
      class="head"
      eyebrow="SUI"
      title="Kitchen sink"
      description="Every component in every state, measured against the design laws on every render"
    >
      {#snippet actions()}
        <div
          class="slot"
          {@attach watch}
          style:inline-size={compact ? `${held.inline}px` : undefined}
          style:block-size={compact ? `${held.block}px` : undefined}
        >
          <div class={['tools', { compact, slides }]}>
            <p class="tools-title" aria-hidden="true">Kitchen sink</p>
            <div class="theme"><ThemeSwitch name="sink-page-theme" system={false} /></div>
          </div>
        </div>
      {/snippet}
    </PageHeader>

    <div class="page">
      <main id="content" tabindex="-1">
        <AuditPanel />
        {#each sections as { id, family, meta, source, Body } (id)}
          <Section {id} {family} {meta} {source} {sources} body={Body} />
        {/each}
      </main>

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
  </div>
</AppShell>

<style>
  /* The bar the header's tools become, and the room anchors and focus keep below it and above
     the floating button, so nothing lands under either (WCAG 2.4.11). A phone shell pads the
     top by its own bar instead. */
  :global(html) {
    --sink-bar: calc(
      var(--sui-control-height-compact) + 2 * var(--sui-space-2) + var(--sui-stroke)
    );
    --sink-float: max(var(--sui-space-6), env(safe-area-inset-bottom));
    --sink-floor: calc(var(--sui-touch-target) + 2 * var(--sink-float));

    scroll-padding-block-start: calc(var(--sink-bar) + var(--sui-space-4));
    scroll-padding-block-end: var(--sink-floor);
  }

  /* The index fills the sidebar's column and scrolls inside it, in the drawer too. */
  .index {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-block-size: 0;
  }

  .index :global(.toc) {
    align-self: stretch;
    flex: 1 1 auto;
    min-block-size: 0;
    padding-block-start: var(--sui-rhythm-pane-gutter);
    padding-inline-start: var(--sui-space-3);
  }

  /* The content box is the measure for the fixed bar, which spans it and nothing else. The
     column is centred in it, and the header's band and the bar keep its inset. */
  .sink {
    --sink-gutter: clamp(var(--sui-space-4), 2.4vw, var(--sui-space-8));
    --sink-inset: max(
      var(--sink-gutter),
      calc((100cqi - var(--sui-content-max)) / 2 + var(--sink-gutter))
    );
    container-type: inline-size;
  }

  .sink :global(.head) {
    --sui-local-head-inset: var(--sink-inset);
  }

  .page {
    box-sizing: border-box;
    margin-inline: auto;
    max-inline-size: var(--sui-content-max);
    padding: 0 var(--sink-gutter) var(--sink-float);
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

  .theme {
    flex: none;
    margin-inline-start: auto;
  }

  /* A phone's shell bar already sticks above the content, so the tools stay in the header
     there and only a wider shell takes them into a bar of their own, sliding in from above.
     The bar is frosted glass over the page scrolling under it, as Fluent's in-app acrylic is
     for surfaces that content scrolls beneath and Apple's bar materials are. */
  @container sui-shell (min-width: 48rem) {
    .tools.compact {
      backdrop-filter: var(--sui-glass-filter);
      background: var(--sui-glass-bar);
      border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
      box-sizing: border-box;
      inline-size: 100cqi;
      inset-block-start: 0;
      inset-inline-end: 0;
      min-block-size: var(--sink-bar);
      padding-block: var(--sui-space-2);
      padding-inline: var(--sink-inset);
      position: fixed;
      z-index: var(--sui-layer-sticky);
    }

    .compact .tools-title {
      display: block;
    }

    .tools.compact.slides {
      animation: sink-bar-in var(--sui-duration-normal) var(--sui-ease-out);
    }

    /* Where nothing frosts what passes under it, or the reader asks for less transparency, the
       bar is the band's opaque ground, as Apple's Reduce Transparency and Fluent's solid
       fallback make it; forced colors draw the system's own. */
    @supports not (backdrop-filter: blur(1px)) {
      .tools.compact {
        background: var(--sui-surface-base);
      }
    }

    @media (prefers-reduced-transparency: reduce) {
      .tools.compact {
        backdrop-filter: none;
        background: var(--sui-surface-base);
      }
    }

    @media (forced-colors: active) {
      .tools.compact {
        backdrop-filter: none;
        background: Canvas;
      }
    }
  }

  @keyframes sink-bar-in {
    from {
      translate: 0 -100%;
    }
  }

  main {
    display: grid;
    gap: var(--sui-space-8);
    min-inline-size: 0;
  }

  main:focus {
    outline: none;
  }

  /* The way back up rides the foot of the window at the end of the column, and rests below the
     last section once the page is scrolled to its end, so it never covers it. */
  .to-top {
    border-radius: var(--sui-radius-control);
    box-shadow: var(--sui-shadow-popover);
    display: flex;
    inline-size: fit-content;
    inset-block-end: var(--sink-float);
    margin-block-start: var(--sink-float);
    margin-inline-start: auto;
    position: sticky;
    z-index: var(--sui-layer-sticky);
  }

  @media (prefers-reduced-motion: reduce) {
    .tools.compact.slides {
      animation: none;
    }
  }
</style>
