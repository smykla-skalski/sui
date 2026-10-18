<script lang="ts">
  import { word } from '../words.js';
  import { flushSync, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { rootFontSize } from '../internal/rem.svelte.js';
  import { firstStop, setShell, trapTab, type ShellMode } from '../internal/shell.svelte.js';

  let {
    title,
    rail,
    sidebar,
    bar,
    label = word('AppShell.label', 'Navigation'),
    menuLabel = word('AppShell.menuLabel', 'Menu'),
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
  let width = $state(0);
  let root = $state<HTMLElement | null>(null);
  let side = $state<HTMLElement | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let places = $state<HTMLElement | null>(null);
  let menu = $state<HTMLButtonElement | null>(null);
  const bottom = $derived(bottomNav && rail !== undefined);

  // The palette's breakpoints, the same as the container queries below, which own the first
  // paint. They are read again whenever the width or the root's text size changes, so a reader
  // who enlarges the text moves them in step with the queries, which measure in rem too.
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
  $effect(() => {
    if (contained || mode !== 'drawer' || !topBar || flowing) return;
    const page = document.documentElement.style;
    const before = [page.scrollPaddingBlockStart, page.scrollPaddingBlockEnd];
    const head = topBar;
    const foot = places;
    const pad = () => {
      page.scrollPaddingBlockStart = `${head.offsetHeight}px`;
      if (foot) page.scrollPaddingBlockEnd = `${foot.offsetHeight}px`;
    };
    const observer = new ResizeObserver(pad);
    observer.observe(head);
    if (foot) observer.observe(foot);
    return () => {
      observer.disconnect();
      [page.scrollPaddingBlockStart, page.scrollPaddingBlockEnd] = before;
    };
  });

  /** The drawer lives in the top layer, so it is placed against the shell's start edge by hand. */
  function placeDrawer() {
    if (!side || !root) return;
    const box = root.getBoundingClientRect();
    const view = document.documentElement;
    const top = Math.max(topBar?.getBoundingClientRect().bottom ?? box.top, 0);
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

On a wide screen `collapsed` folds the sidebar into a 72px strip of icons with short labels.
The rail stays beside it, so every place is still one press away. Below 64rem there is no room
to fold, so the sidebar stays whole and its fold control leaves.

On a phone, below 48rem of the shell's own width, a 56px bar names the current page. Its
button, a glyph and the word `menuLabel`, opens the sidebar over the content as a modal drawer.
Without `bottomNav` the rail rides in the drawer too. With it, the rail's few peer places stand
in a bar along the bottom, always in reach of a thumb, and the drawer holds only the pages.

The layout answers to the shell's own width through container queries, so a shell inside a
narrow preview behaves as it would on a phone. `contained` fills a bounded box instead of the
viewport. `landmark="none"` keeps the content from claiming the page's one `main`.

- Semantics: a plain frame; the rail and the sidebar bring their own `nav` landmarks, the content is the page's `main` unless `landmark="none"`, and the phone drawer is a modal `dialog` named by `label`.
- Content: a `rail` (usually a `Rail`), a `sidebar` (usually a `SideNav`), the content, a page `title` and optional `bar` controls; with `bottomNav` the rail should hold five places or fewer.
- States: full, collapsed (wide screens only), phone with the drawer closed or open, and phone with the bottom bar; the menu button draws hover, pressed and focus like any bar control.
- Keyboard: Tab reaches the menu button, the bars and the content in order; in the open drawer Tab and Shift+Tab stay inside and Escape closes it.
- Pointer and touch: the menu button and every bottom bar tile are 44px; a press outside the open drawer closes it, and nothing needs a gesture.
- Focus: opening the drawer moves focus to its first control, and closing it, by Escape, a press outside or a followed link, returns focus to the menu button.
- Responsive: container queries on the shell's own width switch between full, folded, drawer and bottom bar, and the phone bar's title wraps instead of being cut; bars that would cover more than a quarter of the screen (the shell's own box when contained), as with very large text, ride with the content instead of sticking; a page shell pads the document's scroll by the bars' height so a focused control never hides behind them.
- Accessibility: while the drawer is open the bars and the content are inert; the menu button shows its word and reports `aria-expanded`.
- Localization: `menuLabel` and `label` are props with English defaults; the drawer opens from the start edge and is placed by direction, so it lands on the right in a right-to-left page, and the sidebar glyph mirrors.
- Performance: one width measure drives the mode; the fold snaps instead of animating the column's width, and placement work runs only while the drawer is open.
- Analytics: `onopenchange(open)` reports the drawer and `oncollapsedchange(collapsed)` the fold; `drawerOpen` and `collapsed` are bindable too.
- Failure: with no `rail` the shell draws the sidebar alone, and `bottomNav` without a rail falls back to the drawer; the shell holds no data of its own, so loading and errors belong to its content.
-->

<div
  bind:this={root}
  bind:clientWidth={width}
  {...rest}
  class={['sui-shell', className, { contained, 'bottom-nav': bottom, flowing }]}
>
  <header bind:this={topBar} class="sui-shell-bar" inert={drawerOpen}>
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
    <p class="sui-shell-title">{title}</p>
    {@render bar?.()}
  </header>

  <div class="sui-shell-grid" data-collapsed={collapsed}>
    {#if bottom}
      <div bind:this={places} class="sui-shell-places" inert={drawerOpen}>{@render rail?.()}</div>
    {/if}
    <div
      bind:this={side}
      id={sideId}
      popover="auto"
      class="sui-shell-side"
      role={mode === 'drawer' ? 'dialog' : undefined}
      aria-modal={mode === 'drawer' ? 'true' : undefined}
      aria-label={mode === 'drawer' ? label : undefined}
      {onbeforetoggle}
      {ontoggle}
    >
      {#if rail && !bottom}
        <div class="sui-shell-rail">{@render rail()}</div>
      {/if}
      <div class="sui-shell-pages">{@render sidebar()}</div>
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
    padding-block: var(--sui-space-1);
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

  .sui-shell-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    flex: 1 1 8rem;
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    /* A word wider than the bar, as at a large text size, breaks at a syllable with a hyphen
       where the page's language allows, else at the edge. */
    hyphens: auto;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  .sui-shell-grid {
    display: grid;
    flex: 1;
    grid-template-columns: auto minmax(0, 1fr);
    min-block-size: 0;
  }

  .bottom-nav .sui-shell-grid {
    grid-template-columns: auto auto minmax(0, 1fr);
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

  /* A short viewport, as at 400% zoom, leaves the rail less height than its tiles, so the
     rail scrolls inside the column instead of being cut. */
  .sui-shell-rail,
  .sui-shell-places {
    display: flex;
    flex: none;
    min-block-size: 0;
  }

  .sui-shell-places {
    align-self: start;
    block-size: 100dvh;
    inset-block-start: 0;
    position: sticky;
  }

  .sui-shell-pages {
    border-inline-end: var(--sui-stroke) solid var(--sui-sidebar-border);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inline-size: var(--sui-sidebar-width);
    min-inline-size: 0;
  }

  .contained :is(.sui-shell-side, .sui-shell-places) {
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
      max-inline-size: 86vw;
      position: fixed;
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
    .sui-shell-menu {
      transition: none;
    }
  }
</style>
