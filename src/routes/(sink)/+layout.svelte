<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import { dev } from '$app/env';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import {
    AppShell,
    ServiceWorkerStatus,
    Select,
    SideNav,
    SkipLink,
    ThemeSwitch,
    registerServiceWorker,
    type NavItem,
    type NavSection
  } from '#lib';
  import { followsInPlace } from '#lib/internal/shell.svelte.js';
  import { exposeAudit } from '../audit/expose.js';
  import { glyphSnippet } from '../kit/glyphs';
  import { families } from '../kit/sections';
  import { previewOf, previewOptions, previewUrl, type Preview } from './previews';

  let { children } = $props();

  // SvelteKit serves the worker at the base, beside these pages. The layout pages the sink frames
  // register none, so a frame never shows a notice of its own.
  const worker = registerServiceWorker(`${resolve('/(sink)')}service-worker.js`, { dev });

  // Each row opens its component's page. On the page of every section, which the tests read and
  // no row opens, the rows follow the sections in place instead, and mark the one in view.
  const everything = $derived(page.route.id === '/(sink)/all');
  const index: NavSection[] = $derived([
    { items: [{ href: resolve('/(sink)'), label: 'Overview', icon: 'book' }] },
    ...families.map((members) => ({
      label: members[0].family,
      items: members.map(({ id, meta }) => ({
        href: everything ? `#${id}` : `${resolve('/(sink)/[id]', { id })}/`,
        label: meta.label ?? meta.title,
        short: meta.short,
        icon: glyphSnippet(id)
      }))
    }))
  ]);

  // The current row's href, built as the rows' are: the server resolves paths relative to the
  // page and the browser to the root, so the page's own path would match no row in the server's
  // render, and the row would turn current only once the script ran.
  const current = $derived(
    page.route.id === '/(sink)/[id]' && page.params.id
      ? `${resolve('/(sink)/[id]', { id: page.params.id })}/`
      : page.route.id === '/(sink)'
        ? resolve('/(sink)')
        : page.url.pathname
  );

  let drawerOpen = $state(false);

  /** Follows an entry: to its page, or on the page of every section in place, where focus lands
   * on the section's heading, so the next Tab starts there. */
  function follow(event: MouseEvent, item: NavItem) {
    // The phone drawer leaves first, so the section is no longer inert and can take focus.
    drawerOpen = false;
    const section = everything ? document.getElementById(item.href.slice(1)) : null;
    if (!followsInPlace(event) || !section) return;
    event.preventDefault();
    flushSync();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: still ? 'instant' : 'smooth', block: 'start' });
    history.pushState(null, '', item.href);
    const heading = section.querySelector<HTMLElement>('h2') ?? section;
    if (!heading.hasAttribute('tabindex')) {
      heading.tabIndex = -1;
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
    heading.focus({ preventScroll: true });
  }

  // Only a build deployed as a preview has a list of the previews to fetch. The picker is drawn
  // from the first paint with this preview alone, so the list's arrival never moves the sidebar.
  const deployed = !!import.meta.env.VITE_PREVIEWS;
  let previews = $state<Preview[]>([]);
  const here = $derived(previewOf(page.url.pathname));
  const choices = $derived(
    previews.length
      ? previewOptions(previews)
      : [{ value: here, label: here ? `#${here.slice('/pr-'.length)}` : 'main' }]
  );

  onMount(() => {
    exposeAudit();
    if (!deployed) return;
    fetch('/previews.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((list: Preview[]) => (previews = list))
      .catch(() => {});
  });
</script>

{#snippet picker()}
  <Select
    aria-label="Preview"
    value={here}
    options={choices}
    onchange={(event) => location.assign(previewUrl(event.currentTarget.value, location))}
  />
{/snippet}

<SkipLink href="#content" />

<AppShell
  title={page.data.section?.meta.title ?? 'Kitchen Sink'}
  eyebrow="SUI"
  landmark="none"
  bind:drawerOpen
>
  {#snippet sidebar()}
    <!-- The sidebar stays in view at every width, in the drawer on a phone, so the theme lives
         once, at its foot. Two choices fill the sidebar's width as a segmented control, so the
         foot ends on the rows' edge, folded or not. -->
    <SideNav
      kicker="SUI"
      title="Kitchen Sink"
      label="Components"
      sections={index}
      {current}
      scrollTargets={everything}
      onnavigate={follow}
      head={deployed ? picker : undefined}
    >
      {#snippet foot(folded: boolean)}<ThemeSwitch
          system={false}
          iconOnly={folded}
          fill
        />{/snippet}
    </SideNav>
  {/snippet}

  {@render children()}
</AppShell>

<ServiceWorkerStatus {worker} />
