<script lang="ts">
  import { word } from '../words.js';
  import { flushSync, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { clearance } from '../internal/clearance.js';
  import RailPages from '../internal/RailPages.svelte';
  import { rootFontSize } from '../internal/rem.svelte.js';
  import { firstStop, setShell, trapTab, type ShellMode } from '../internal/shell.svelte.js';

  let {
    title,
    eyebrow,
    rail,
    sidebar,
    bar,
    label = word('AppShell.label', 'Navigation'),
    menuLabel = word('AppShell.menuLabel', 'Navigation'),
    bottomNav = false,
    landmark = 'main',
    contained = false,
    collapsed = $bindable(false),
    drawerOpen = $bindable(false),
    onopenchange,
    oncollapsedchange,
    class: className = '',
    children,
    ...rest
  }: {
    /** The page the reader is on, named in the phone bar. It wraps rather than being cut. */
    title: string;
    /** Where the page is, such as its workspace, drawn small over the title in the phone bar. */
    eyebrow?: string;
    /** The outermost navigation, such as a `Rail`. On a phone it rides in the drawer, or in the bottom bar with `bottomNav`. */
    rail?: Snippet;
    /** The pages, usually a `SideNav`. It becomes a drawer on a phone. */
    sidebar: Snippet;
    /** Controls at the end of the phone bar. */
    bar?: Snippet;
    /** Names the phone drawer for assistive technology. */
    label?: string;
    /** The word on the phone bar's button that opens the drawer, drawn beside its glyph. */
    menuLabel?: string;
    /** On a phone, draws the rail's few peer places as a bar along the bottom, and the drawer keeps only the sidebar. */
    bottomNav?: boolean;
    /** `main` makes the content the page's one main landmark; `none` when the page already has one. */
    landmark?: 'main' | 'none';
    /** Fills a bounded box instead of the viewport, as a preview does. */
    contained?: boolean;
    collapsed?: boolean;
    drawerOpen?: boolean;
    /** Called when the phone drawer opens or closes. */
    onopenchange?: (open: boolean) => void;
    /** Called when the reader folds or unfolds the sidebar. */
    oncollapsedchange?: (collapsed: boolean) => void;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    children: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();

  const sideId = $props.id();
  /* The content box, as the container queries measure it: the safe-area padding on a phone's
     side is no room for the layout (L-118). */
  let box = $state<DOMRectReadOnly | null>(null);
  const width = $derived(box?.width ?? 0);
  let root = $state<HTMLElement | null>(null);
  let side = $state<HTMLElement | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let places = $state<HTMLElement | null>(null);
  let menu = $state<HTMLButtonElement | null>(null);
  let name = $state<HTMLElement | null>(null);
  const bottom = $derived(bottomNav && rail !== undefined);

  // The palette's breakpoints, the same as the container queries below, which own the first
  // paint. They are read again whenever the width or the root's text size changes, so a reader
  // who enlarges the text moves them along with the queries, which measure in rem too.
  function breakpoint(name: string): number {
    const rem = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return rem * rootFontSize();
  }

  // A server render has no width and no styles to read, so it draws the full shell, as the
  // container queries do before the first measure.
  const foldable = $derived(width > 0 && width >= breakpoint('--sui-breakpoint-wide'));
  const mode: ShellMode = $derived(
    width === 0
      ? 'full'
      : width <= breakpoint('--sui-breakpoint-phone')
        ? 'drawer'
        : collapsed && foldable
          ? 'collapsed'
          : 'full'
  );

  setShell({
    get mode() {
      return mode;
    },
    get collapsed() {
      return collapsed;
    },
    get foldable() {
      return foldable;
    },
    get bottomNav() {
      return bottom;
    },
    toggleCollapsed: () => {
      collapsed = !collapsed;
      oncollapsedchange?.(collapsed);
    },
    closeDrawer: () => {
      drawerOpen = false;
    }
  });

  $effect(() => {
    if (mode !== 'drawer' && drawerOpen) drawerOpen = false;
  });

  $effect(() => {
    if (!side) return;
    const shown = side.matches(':popover-open');
    if (drawerOpen && mode === 'drawer' && !shown) side.showPopover();
    else if (!drawerOpen && shown) side.hidePopover();
  });

  /* Bars that would cover much of the screen, as with very large text on a phone, ride with
     the content instead of sticking, so the content is never hidden under them (WCAG 1.4.10).
     The screen is the window for a page shell and the shell's own box for a contained one. */
  const MOST = 0.25;
  let flowing = $state(false);
  $effect(() => {
    if (mode !== 'drawer' || !topBar) {
      flowing = false;
      return;
    }
    const head = topBar;
    const foot = places;
    const check = () => {
      // A contained shell taller than the window is seen through the window.
      const room = contained && root ? Math.min(root.clientHeight, innerHeight) : innerHeight;
      flowing = head.offsetHeight + (foot?.offsetHeight ?? 0) > room * MOST;
    };
    const observer = new ResizeObserver(check);
    observer.observe(head);
    if (foot) observer.observe(foot);
    addEventListener('resize', check);
    return () => {
      observer.disconnect();
      removeEventListener('resize', check);
    };
  });

  /* A page shell scrolls the document under its sticky bars, so a link to a fragment or a
     focused control would land behind them; the page's scroll padding keeps them clear. A
     contained shell scrolls its pane, which the bars never cover, and bars that ride with the
     content cover nothing. */
  function padPage(head: HTMLElement) {
    if (contained || mode !== 'drawer' || flowing) return;
    const page = clearance(document.documentElement);
    const foot = places;
    const observer = new ResizeObserver(() =>
      page.hold({ start: head.offsetHeight, end: foot?.offsetHeight })
    );
    observer.observe(head);
    if (foot) observer.observe(foot);
    return () => {
      observer.disconnect();
      page.release();
    };
  }

  /* While the page's own heading, an h1 in the same words as the title, is on screen, the bar
     names only where the page is, and it names the page once the heading goes under the bar,
     as a large title hands over to the bar's title on iOS. The eyebrow then stands on the bar's
     middle, lifted by a whole number of pixels. */
  let headed = $state(false);
  let lift = $state(0);
  // Only a hand-over the reader's scroll makes moves: while a page loads, the bar takes each
  // reading at once, so a title never fades out over a page that opens with its heading.
  let settled = $state(false);
  $effect(() => {
    if (settled) return;
    const settle = () => (settled = true);
    addEventListener('scroll', settle, { capture: true, once: true, passive: true });
    return () => removeEventListener('scroll', settle, { capture: true });
  });
  $effect(() => {
    const bar = topBar;
    const holder = name;
    const frame = root;
    if (mode !== 'drawer' || !bar || !holder || !frame) {
      headed = false;
      return;
    }
    const heading = [...frame.querySelectorAll('h1')].find(
      (node) => !bar.contains(node) && node.textContent?.trim() === title.trim()
    );
    if (!heading) {
      headed = false;
      return;
    }
    const line = holder.querySelector<HTMLElement>('.sui-shell-eyebrow');
    const sizes = new ResizeObserver(() => {
      lift = line ? Math.round((holder.offsetHeight - line.offsetHeight) / 2) : 0;
    });
    sizes.observe(holder);
    // A contained shell's pane starts under its bar, and bars that ride with the content cover nothing.
    const seen = new IntersectionObserver(([entry]) => (headed = entry.isIntersecting), {
      rootMargin: contained || flowing ? '0px' : `${-bar.offsetHeight}px 0px 0px 0px`
    });
    seen.observe(heading);
    return () => {
      sizes.disconnect();
      seen.disconnect();
    };
  });

  /** The drawer lives in the top layer, so it is placed against the shell's start edge by hand.
      It runs from the shell's top, over the bar, as a modal drawer does, so the scrim dims the
      whole frame behind it. */
  function placeDrawer() {
    if (!side || !root) return;
    const box = root.getBoundingClientRect();
    const view = document.documentElement;
    const top = Math.max(box.top, 0);
    const bottomEdge = Math.min(box.bottom, view.clientHeight);
    const start =
      getComputedStyle(root).direction === 'rtl' ? view.clientWidth - box.right : box.left;
    side.style.setProperty('--sui-drawer-top', `${top}px`);
    side.style.setProperty('--sui-drawer-start', `${Math.max(start, 0)}px`);
    side.style.setProperty('--sui-drawer-height', `${Math.max(bottomEdge - top, 0)}px`);
  }

  $effect(() => {
    if (!drawerOpen || !side) return;
    placeDrawer();
    const drawer = side;
    const frame = requestAnimationFrame(() => firstStop(drawer)?.focus());
    const onkeydown = (event: KeyboardEvent) => trapTab(drawer, event);
    addEventListener('scroll', placeDrawer, { capture: true, passive: true });
    addEventListener('resize', placeDrawer, { passive: true });
    drawer.addEventListener('keydown', onkeydown);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', placeDrawer, { capture: true });
      removeEventListener('resize', placeDrawer);
      drawer.removeEventListener('keydown', onkeydown);
    };
  });

  function onbeforetoggle(event: ToggleEvent) {
    if (event.newState === 'open') placeDrawer();
  }

  function ontoggle(event: ToggleEvent) {
    const open = event.newState === 'open';
    if (open !== drawerOpen) drawerOpen = open;
    onopenchange?.(open);
    if (open) return;
    const lost = side?.contains(document.activeElement) || document.activeElement === document.body;
    // The bar stays inert until the closed state reaches the DOM, and an inert button takes no focus.
    flushSync();
    if (lost) menu?.focus({ preventScroll: true });
  }
</script>

<!--
@component
The frame of an application: an optional rail for the outermost choice, a sidebar with the
pages, and the content. The shell owns the layout and its states, and the navigation inside
it reads them from context.

On a wide screen `collapsed` folds the sidebar into an 80px strip of icons with short labels.
With a rail the two become one column: the places at the top, a hairline, the pages, then the
fold control and the rail's foot, so every place and page is still one press away and Tab meets
them in the order they are drawn. Below 64rem there is no room to fold, so the sidebar stays
whole and its fold control leaves.

On a phone, below 48rem of the shell's own width, a 56px bar names the current page once the
page's own h1 in the same words has gone under it; while that heading is on screen the bar
names only where the page is, its `eyebrow`, on the bar's middle. Its
button, a glyph and the word `menuLabel`, parted from the title by a 20px hairline, opens the
sidebar from the shell's top, over the bar and the content, as a modal drawer. The drawer's pages are 288px wide, or the sidebar's 228px
beside the rail, and the drawer leaves at least 56px of the screen uncovered. `eyebrow` names where the page is, such as its workspace, over the title. Without `bottomNav` the rail rides in the drawer too. With it, the rail's few peer places stand
in a bar along the bottom, always in reach of a thumb, and the drawer holds only the pages.

The layout answers to the shell's own width through container queries, so a shell inside a
narrow preview behaves as it would on a phone. `contained` fills a bounded box instead of the
viewport. `landmark="none"` keeps the content from claiming the page's one `main`.

- Semantics: a plain frame; the rail and the sidebar bring their own `nav` landmarks, the content is the page's `main` unless `landmark="none"`, and the phone drawer is a modal `dialog` named by `label`.
- Content: a `rail` (usually a `Rail`), a `sidebar` (usually a `SideNav`), the content, a page `title` and optional `bar` controls; with `bottomNav` the rail should hold five places or fewer.
- States: full, collapsed into one column with the rail (wide screens only), phone with the drawer closed or open, and phone with the bottom bar; the menu button draws hover, pressed and focus like any bar control.
- Keyboard: Tab reaches the menu button, the bars and the content in order; in the open drawer Tab and Shift+Tab stay inside and Escape closes it.
- Pointer and touch: the menu button and every bottom bar tile are 44px; a press outside the open drawer closes it, and nothing needs a gesture.
- Focus: opening the drawer moves focus to its first control, and closing it, by Escape, a press outside or a followed link, returns focus to the menu button.
- Responsive: container queries on the shell's own width switch between full, folded, drawer and bottom bar, and the phone bar's title wraps instead of being cut; bars that would cover more than a quarter of the screen (the shell's own box when contained), as with very large text, ride with the content instead of sticking; a page shell pads the document's scroll by the bars' height so a focused control never hides behind them.
- Accessibility: while the drawer is open the bars and the content are inert; the menu button shows its word and reports `aria-expanded`.
- Localization: `menuLabel` and `label` are props with English defaults; the drawer opens from the start edge and is placed by direction, so it lands on the right in a right-to-left page, and the sidebar glyph mirrors.
- Performance: one width measure drives the mode; the fold snaps instead of animating the column's width, and placement work runs only while the drawer is open; the bar's title fades in over 160ms as the page's heading goes under the bar, by opacity and a whole-pixel lift only, and changes at once with reduced motion.
- Analytics: `onopenchange(open)` reports the drawer and `oncollapsedchange(collapsed)` the fold; `drawerOpen` and `collapsed` are bindable too.
- Failure: with no `rail` the shell draws the sidebar alone, and `bottomNav` without a rail falls back to the drawer; the shell holds no data of its own, so loading and errors belong to its content.
-->

<div
  bind:this={root}
  bind:contentRect={box}
  {...rest}
  class={['sui-shell', className, { contained, 'bottom-nav': bottom, flowing }]}
>
  <header bind:this={topBar} {@attach padPage} class="sui-shell-bar" inert={drawerOpen}>
    <button
      bind:this={menu}
      type="button"
      class="sui-shell-menu"
      popovertarget={sideId}
      aria-expanded={drawerOpen}
    >
      <Icon name="sidebar-expand" size="md" />
      <span class="sui-shell-menu-label">{menuLabel}</span>
    </button>
    <span class="sui-shell-rule" aria-hidden="true"></span>
    <div
      bind:this={name}
      class={['sui-shell-name', { headed, settled }]}
      style:--sui-local-name-lift="{lift}px"
    >
      {#if eyebrow}<p class="sui-shell-eyebrow">{eyebrow}</p>{/if}
      <p class="sui-shell-title">{title}</p>
    </div>
    {@render bar?.()}
  </header>

  {#snippet pages()}
    <div class={['sui-shell-pages', { joined: rail }]}>{@render sidebar()}</div>
  {/snippet}

  <div class="sui-shell-grid" data-collapsed={collapsed}>
    {#if bottom}
      <div bind:this={places} class="sui-shell-places" inert={drawerOpen}>{@render rail?.()}</div>
    {/if}
    <div
      bind:this={side}
      id={sideId}
      popover="auto"
      class={['sui-shell-side', { joined: rail }]}
      role={mode === 'drawer' ? 'dialog' : undefined}
      aria-modal={mode === 'drawer' ? 'true' : undefined}
      aria-label={mode === 'drawer' ? label : undefined}
      {onbeforetoggle}
      {ontoggle}
    >
      {#if rail}
        <RailPages {pages}>{@render rail()}</RailPages>
      {:else}
        {@render pages()}
      {/if}
    </div>
    <svelte:element
      this={landmark === 'main' ? 'main' : 'div'}
      class="sui-shell-pane"
      inert={drawerOpen}
    >
      {@render children()}
    </svelte:element>
  </div>
</div>

<style>
  .sui-shell {
    background: var(--sui-canvas);
    color: var(--sui-text-primary);
    container: sui-shell / inline-size;
    display: flex;
    flex-direction: column;
    min-block-size: 100dvh;
    position: relative;
  }

  /* A page shell fills the screen, so its grounds run under a notch while its content keeps to
     the safe area (L-118). */
  .sui-shell:not(.contained) {
    padding-inline: var(--sui-safe-start) var(--sui-safe-end);
  }

  .contained {
    block-size: var(--sui-shell-height, 32rem);
    min-block-size: 0;
    overflow: hidden;
  }

  /* A title with too little room beside the menu button takes a line of its own, so it breaks
     between words, never inside one. */
  .sui-shell-bar {
    align-items: center;
    background: var(--sui-sidebar-bg);
    border-block-end: var(--sui-stroke) solid var(--sui-sidebar-border);
    box-sizing: border-box;
    color: var(--sui-sidebar-text);
    display: none;
    flex: none;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    inset-block-start: 0;
    min-block-size: var(--sui-top-bar-height);
    /* The foot gives its hairline's pixel back, so the bar's inner box is even and the button
       and the name centre on whole pixels. */
    padding-block: var(--sui-space-1) calc(var(--sui-space-1) - var(--sui-stroke));
    padding-inline: var(--sui-space-2) var(--sui-space-3);
    position: sticky;
    z-index: var(--sui-layer-top-bar);
  }

  .sui-shell-menu {
    align-items: center;
    background: transparent;
    block-size: var(--sui-touch-target);
    border: 0;
    border-radius: var(--sui-radius-control);
    color: var(--sui-sidebar-text-secondary);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-2);
    justify-content: center;
    margin: 0;
    min-inline-size: var(--sui-touch-target);
    padding-block: 0;
    padding-inline: var(--sui-space-2) var(--sui-space-3);
    touch-action: manipulation;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  .sui-shell-menu-label {
    align-content: center;
    block-size: var(--sui-block-snap);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  @media (hover: hover) {
    .sui-shell-menu:hover:not(:active) {
      background: var(--sui-sidebar-item-hover);
      color: var(--sui-sidebar-text);
    }
  }

  .sui-shell-menu:active {
    background: var(--sui-sidebar-item-pressed);
    box-shadow: var(--sui-sidebar-pressed-inset);
    color: var(--sui-sidebar-text);
  }

  .sui-shell-menu:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-sidebar-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* The menu button is a control and the title is where the reader is, so a hairline parts them,
     as a toolbar parts its groups. */
  .sui-shell-rule {
    background: var(--sui-sidebar-border);
    block-size: var(--sui-space-5);
    flex: none;
    inline-size: var(--sui-stroke);
    margin-inline-end: var(--sui-space-1);
  }

  /* The eyebrow stands a copy gap over the title, so the two read as one name. */
  .sui-shell-name {
    display: grid;
    flex: 1 1 8rem;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  /* Opacity and a whole-pixel lift only, so the hand-over is composited and the words land on
     the pixel grid. */
  .settled > * {
    transition:
      opacity var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-fast) var(--sui-ease-standard),
      visibility var(--sui-duration-fast);
  }

  .headed > * {
    translate: 0 var(--sui-local-name-lift);
  }

  /* Hidden once faded, so the title is never read twice beside the heading it hands over to. */
  .headed > .sui-shell-title {
    opacity: 0;
    visibility: hidden;
  }

  .sui-shell-eyebrow {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-sidebar-text-secondary);
    font: var(--sui-weight-medium) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: break-word;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .sui-shell-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    /* A word wider than the bar, as at a large text size, breaks at a syllable with a hyphen
       where the page's language allows, else at the edge. */
    hyphens: auto;
    overflow-wrap: break-word;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  .sui-shell-grid {
    display: grid;
    flex: 1;
    grid-template-columns: auto minmax(0, 1fr);
    min-block-size: 0;
  }

  /* The chrome holds the rail and the pages side by side and carries a popover attribute for
     its phone drawer. Everywhere else it is in flow, so the browser's own popover box is undone
     here. Its fit-content width stays, so it follows the columns inside. */
  .sui-shell-side {
    align-self: start;
    background: var(--sui-sidebar-bg);
    block-size: 100dvh;
    border: 0;
    box-sizing: border-box;
    color: var(--sui-sidebar-text);
    display: flex;
    inset: auto;
    inset-block-start: 0;
    margin: 0;
    overflow: hidden;
    padding: 0;
    position: sticky;
  }

  /* The bottom bar's places stand only on a phone. Wider, the rail beside the pages draws them. */
  .sui-shell-places {
    display: none;
  }

  .sui-shell-pages {
    border-inline-end: var(--sui-stroke) solid var(--sui-sidebar-border);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inline-size: var(--sui-sidebar-width);
    min-inline-size: 0;
  }

  /* Beside a rail the pages ride inside it, between its places and its foot, and part from its
     column by a hairline of their own. */
  .sui-shell-pages.joined {
    align-self: stretch;
    border-inline-start: var(--sui-stroke) solid var(--sui-sidebar-border);
    grid-area: pages;
    max-inline-size: 100%;
  }

  .contained .sui-shell-side {
    align-self: stretch;
    block-size: auto;
  }

  .sui-shell-pane {
    min-inline-size: 0;
  }

  .contained .sui-shell-pane {
    overflow: auto;
  }

  @container sui-shell (min-width: 64.0625rem) {
    .sui-shell-grid[data-collapsed='true'] .sui-shell-pages {
      inline-size: var(--sui-sidebar-width-collapsed);
    }

    /* Folded, the rail and the strip are one column: the pages stand under the places, parted
       by a hairline across the column, and the column keeps the edge. */
    .sui-shell-grid[data-collapsed='true'] .sui-shell-pages.joined {
      border-block-start: var(--sui-stroke) solid var(--sui-sidebar-border);
      border-inline: 0;
    }

    .sui-shell-grid[data-collapsed='true'] .sui-shell-side.joined {
      border-inline-end: var(--sui-stroke) solid var(--sui-sidebar-border);
    }
  }

  @container sui-shell (max-width: 47.9375rem) {
    .sui-shell-bar {
      display: flex;
    }

    .sui-shell-grid,
    .bottom-nav .sui-shell-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .sui-shell-side:not(:popover-open) {
      display: none;
    }

    .sui-shell-side:popover-open {
      block-size: var(--sui-drawer-height);
      box-shadow: var(--sui-shadow-popover);
      inset-block-start: var(--sui-drawer-top);
      inset-inline-start: var(--sui-drawer-start);
      max-inline-size: calc(100vw - 3.5rem);
      position: fixed;
    }

    /* The drawer's pages take 288px, wider than the column they fold from, so a two-word label
       keeps one line there; beside the rail they give way first, and 56px of the screen stays
       uncovered to close the drawer by. */
    .sui-shell-side:popover-open .sui-shell-pages {
      inline-size: 18rem;
    }

    /* Beside the rail the pages keep the sidebar's own width, so a wide strip of the screen
       stays uncovered to close the drawer by. Over a bottom bar the rail stays in the bar and
       the pages keep their 288px. */
    .sui-shell:not(.bottom-nav) .sui-shell-side:popover-open .sui-shell-pages.joined {
      inline-size: var(--sui-sidebar-width);
    }

    /* The drawer meets the screen's top, start and foot, so it keeps its rows off the notch and
       the home indicator (L-118). */
    .sui-shell:not(.contained) .sui-shell-side:popover-open {
      padding-block: env(safe-area-inset-top) env(safe-area-inset-bottom);
      padding-inline-start: var(--sui-safe-start);
    }

    .sui-shell:not(.contained) .sui-shell-bar {
      min-block-size: calc(var(--sui-top-bar-height) + env(safe-area-inset-top));
      padding-block-start: calc(var(--sui-space-1) + env(safe-area-inset-top));
    }

    /* The pages give way first when the rail beside them leaves less room. */
    .sui-shell-side:popover-open .sui-shell-pages {
      border-inline-end: 0;
      flex: 0 1 auto;
    }

    .sui-shell-side::backdrop {
      background: var(--sui-scrim);
    }

    /* The bottom bar follows the content and sticks to the foot of the view. */
    .bottom-nav .sui-shell-grid {
      grid-template-rows: 1fr auto;
    }

    .contained.bottom-nav .sui-shell-grid {
      grid-template-rows: minmax(0, 1fr) auto;
    }

    .bottom-nav .sui-shell-pane {
      grid-row: 1;
    }

    .sui-shell-places,
    .contained .sui-shell-places {
      align-self: end;
      display: flex;
      block-size: auto;
      grid-row: 2;
      inset-block: auto 0;
      z-index: var(--sui-layer-top-bar);
    }
  }

  .flowing :is(.sui-shell-bar, .sui-shell-places) {
    position: relative;
  }

  /* A contained shell scrolls only its pane, so its bars ride with the content only once the
     whole shell scrolls instead. */
  .contained.flowing {
    overflow-y: auto;
  }

  .contained.flowing .sui-shell-grid {
    flex: none;
    min-block-size: auto;
  }

  .contained.flowing .sui-shell-pane {
    overflow: visible;
  }

  @media (forced-colors: active) {
    .sui-shell-side:popover-open {
      border-inline-end: var(--sui-stroke-bold) solid CanvasText;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-shell-menu,
    .settled > * {
      transition: none;
    }
  }
</style>
