<script lang="ts">
  import { flushSync, type Component } from 'svelte';
  import { page } from '$app/state';
  import {
    AppShell,
    Button,
    Icon,
    PageHeader,
    Rail,
    SideNav,
    SkipLink,
    ThemeSwitch,
    type IconName,
    type NavItem,
    type NavSection
  } from '#lib';
  import { followsInPlace } from '#lib/internal/shell.svelte.js';
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
        'section',
        'detail-pane',
        'page-toc',
        'code-block',
        'diff-block',
        'data-table',
        'fact-list',
        'fact-line',
        'timeline',
        'link-list'
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

  // Each family's glyph, worn by every member without a glyph of its own.
  const FAMILY_ICONS: Record<string, IconName> = {
    Actions: 'sliders',
    Inputs: 'editor',
    'Pickers and editors': 'chevrons-up-down',
    Overlays: 'notifications',
    'Surfaces and content': 'file',
    Marks: 'tag',
    'Lists and states': 'repositories',
    Charts: 'gauge',
    Shell: 'sidebar-expand'
  };
  // A component a glyph already names wears that glyph.
  const ICONS: Record<string, IconName> = {
    'icon-buttons': 'more',
    navigation: 'arrow-up-right',
    'search-field': 'search',
    checkbox: 'check',
    'theme-switch': 'sun-moon',
    'copyable-link-field': 'link',
    'help-tip': 'help',
    'duration-input': 'pending',
    'confirm-dialog': 'warning',
    'service-worker-status': 'server',
    callout: 'info',
    'diff-block': 'branch',
    'data-table': 'database',
    avatar: 'user',
    'relative-time': 'history',
    'day-heading': 'calendar',
    'list-toolbar': 'filter',
    'load-more': 'refresh',
    skeleton: 'circle-dashed',
    states: 'circle-slash'
  };
  const index: NavSection[] = Object.values(
    Object.groupBy(sections, (section) => section.family) as Record<string, typeof sections>
  ).map((members) => ({
    label: members[0].family,
    items: members.map(({ id, title, family }) => ({
      href: `#${id}`,
      label: title,
      icon: ICONS[id] ?? FAMILY_ICONS[family] ?? 'circle-dashed'
    }))
  }));

  // The section the reader is in: the last whose top has crossed the top quarter of the window,
  // where a reader's eye lands. The index's plate follows it. Before the page runs, as in the
  // server's render, the reader is at the top, in the first section.
  let here = $state(sections[0]?.id ?? '');
  function spy(main: HTMLElement) {
    const tops = [...main.querySelectorAll<HTMLElement>(':scope > section[id]')];
    // Read once where the page already stands, as after a reload halfway down, so the plate
    // lands there before it would glide.
    here =
      tops.findLast((section) => section.getBoundingClientRect().top <= innerHeight / 4)?.id ??
      here;
    // A line a quarter down the window: a section crossing it is where the reader is.
    const watcher = new IntersectionObserver(
      (records) => {
        for (const record of records) if (record.isIntersecting) here = record.target.id;
      },
      { rootMargin: '-25% 0px -75% 0px' }
    );
    for (const section of tops) watcher.observe(section);
    return () => watcher.disconnect();
  }

  let drawerOpen = $state(false);

  /** Follows an entry in place: the page scrolls there and focus lands on the section's heading,
   * so the next Tab starts there. */
  function follow(event: MouseEvent, item: NavItem) {
    const section = document.getElementById(item.href.slice(1));
    if (!followsInPlace(event) || !section) return;
    event.preventDefault();
    // The phone drawer leaves first, so the section is no longer inert and can take focus.
    drawerOpen = false;
    flushSync();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: still ? 'instant' : 'smooth', block: 'start' });
    history.pushState(null, '', item.href);
    here = section.id;
    const heading = section.querySelector<HTMLElement>('h2') ?? section;
    if (!heading.hasAttribute('tabindex')) {
      heading.tabIndex = -1;
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
    heading.focus({ preventScroll: true });
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

<AppShell title="Kitchen sink" landmark="none" bind:drawerOpen>
  {#snippet rail()}
    <Rail items={places} current={page.url.pathname} />
  {/snippet}
  {#snippet sidebar()}
    <SideNav
      kicker="SUI"
      title="Kitchen sink"
      label="Components"
      sections={index}
      current="#{here}"
      onnavigate={follow}
    />
  {/snippet}

  <div class="sink">
    <PageHeader
      class="head"
      eyebrow="SUI"
      title="Kitchen sink"
      description="Every component in every state, measured against the design laws on every render"
    >
      {#snippet actions()}
        <div class="slot">
          <div class="theme"><ThemeSwitch name="sink-page-theme" system={false} /></div>
        </div>
      {/snippet}
    </PageHeader>

    <!-- The header's tools ride in a bar over the content once their place in the header has
         scrolled away. -->
    <div class="bar">
      <p class="bar-title" aria-hidden="true">Kitchen sink</p>
      <div class="theme"><ThemeSwitch name="sink-bar-theme" system={false} /></div>
    </div>

    <div class="page">
      <main id="content" tabindex="-1" {@attach spy}>
        <AuditPanel />
        {#each sections as { id, family, meta, source, Body } (id)}
          <Section {id} {family} {meta} {source} {sources} body={Body} />
        {/each}
      </main>

      <!-- "#top" is the fragment every browser takes to the start of the page, with no script. -->
      <div class="to-top">
        <Button href="#top">
          {#snippet icon()}<Icon name="chevron-up" size="sm" />{/snippet}
          Back to top
        </Button>
      </div>
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

  /* The content box is the measure for the fixed bar, which spans it and nothing else. The
     column is centred in it, and the header's band and the bar keep its inset. */
  .sink {
    --sink-gutter: clamp(var(--sui-space-4), 2.4vw, var(--sui-space-8));
    --sink-inset: max(
      var(--sink-gutter),
      calc((100cqi - var(--sui-content-max)) / 2 + var(--sink-gutter))
    );
    container-type: inline-size;
    timeline-scope: --sink-tools;
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
    view-timeline: --sink-tools block;
    view-timeline-inset: 0px;
  }

  .theme {
    flex: none;
    margin-inline-start: auto;
  }

  .bar {
    display: none;
  }

  .bar-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  /* A phone's shell bar already sticks above the content, so the tools stay in the header
     there and only a wider shell gives them a bar of their own. The bar is frosted glass over
     the page scrolling under it, as Fluent's in-app acrylic is for surfaces that content
     scrolls beneath and Apple's bar materials are. */
  @container sui-shell (min-width: 48rem) {
    .bar {
      align-items: center;
      backdrop-filter: var(--sui-glass-filter);
      background: var(--sui-glass-bar);
      border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
      box-sizing: border-box;
      display: flex;
      gap: var(--sui-space-3);
      inline-size: 100cqi;
      inset-block-start: 0;
      inset-inline-end: 0;
      min-block-size: var(--sink-bar);
      padding-block: var(--sui-space-2);
      padding-inline: var(--sink-inset);
      position: fixed;
      visibility: hidden;
      z-index: var(--sui-layer-sticky);
    }

    /* Where nothing frosts what passes under it, or the reader asks for less transparency, the
       bar is the band's opaque ground, as Apple's Reduce Transparency and Fluent's solid
       fallback make it; forced colors draw the system's own. */
    @supports not (backdrop-filter: blur(1px)) {
      .bar {
        background: var(--sui-surface-base);
      }
    }

    @media (prefers-reduced-transparency: reduce) {
      .bar {
        backdrop-filter: none;
        background: var(--sui-surface-base);
      }
    }

    @media (forced-colors: active) {
      .bar {
        backdrop-filter: none;
        background: Canvas;
      }
    }
  }

  /* The bar and the way back up follow the slot's place in the header through its view
     timeline, which the browser resolves before it paints, so after a reload halfway down they
     are there in the first frame. The bar slides in with the reader's own scroll and never
     moves on its own. Without scroll-driven animations the tools stay in the header and the
     way back up stays at the foot of the window. */
  @supports (animation-timeline: view()) {
    @container sui-shell (min-width: 48rem) {
      .bar {
        animation: sink-bar-in var(--sui-ease-linear) forwards;
        animation-range: exit 100% exit calc(100% + var(--sink-bar));
        animation-timeline: --sink-tools;
      }
    }

    /* While the header shows, its words are skipped as well as hidden, so the page holds no
       control that can be neither seen nor named. */
    .to-top {
      animation: sink-to-top-in var(--sui-ease-linear) forwards;
      animation-range: exit 100% exit calc(100% + 1px);
      animation-timeline: --sink-tools;
      content-visibility: hidden;
      visibility: hidden;
    }

    @media (prefers-reduced-motion: reduce) {
      @container sui-shell (min-width: 48rem) {
        .bar {
          animation-name: sink-shown;
        }
      }
    }
  }

  @keyframes sink-bar-in {
    from {
      translate: 0 -100%;
      visibility: visible;
    }

    to {
      translate: 0 0;
      visibility: visible;
    }
  }

  @keyframes sink-shown {
    from,
    to {
      visibility: visible;
    }
  }

  @keyframes sink-to-top-in {
    from,
    to {
      content-visibility: visible;
      visibility: visible;
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
</style>
