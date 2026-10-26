<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import { dev } from '$app/env';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import {
    AppShell,
    ServiceWorkerStatus,
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

  let { children } = $props();

  // SvelteKit serves the worker at the base, beside these pages. The layout pages the sink frames
  // register none, so a frame never shows a notice of its own.
  const worker = registerServiceWorker(`${resolve('/(sink)')}service-worker.js`, { dev });

  // Each row opens its component's page. On the page of every section the rows follow the
  // sections in place instead, and mark the one the reader has scrolled to.
  const everything = $derived(page.route.id === '/(sink)/all');
  const index: NavSection[] = $derived([
    {
      items: [
        { href: resolve('/(sink)'), label: 'Overview', icon: 'book' },
        { href: `${resolve('/(sink)/all')}/`, label: 'All components', icon: glyphSnippet('all') }
      ]
    },
    ...families.map((members) => ({
      label: members[0].family,
      items: members.map(({ id, meta }) => ({
        href: everything ? `#${id}` : `${resolve('/(sink)/[id]', { id })}/`,
        label: meta.title,
        icon: glyphSnippet(id)
      }))
    }))
  ]);

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

  onMount(() => exposeAudit());
</script>

<SkipLink href="#content" />

<AppShell title={page.data.section?.meta.title ?? 'Kitchen sink'} landmark="none" bind:drawerOpen>
  {#snippet sidebar()}
    <!-- The sidebar stays in view at every width, in the drawer on a phone, so the theme lives
         once, at its foot. Two choices fit the sidebar's width as a segmented control. -->
    <SideNav
      kicker="SUI"
      title="Kitchen sink"
      label="Components"
      sections={index}
      current={page.url.pathname}
      scrollTargets={everything}
      onnavigate={follow}
    >
      {#snippet foot()}<ThemeSwitch system={false} />{/snippet}
    </SideNav>
  {/snippet}

  {@render children()}
</AppShell>

<ServiceWorkerStatus {worker} />
