<script lang="ts">
  import { flushSync, onMount, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { firstStop, setShell, trapTab, type ShellMode } from '../internal/shell.svelte.js';

  let {
    title,
    rail,
    sidebar,
    bar,
    label = 'Navigation',
    landmark = 'main',
    contained = false,
    collapsed = $bindable(false),
    drawerOpen = $bindable(false),
    class: className = '',
    children,
    ...rest
  }: {
    /** The page the reader is on, named in the phone bar. */
    title: string;
    /** The outermost navigation, such as a `Rail`. On a phone it rides in the drawer beside the pages. */
    rail?: Snippet;
    /** The pages, usually a `SideNav`. It becomes a drawer on a phone. */
    sidebar: Snippet;
    /** Controls at the end of the phone bar. */
    bar?: Snippet;
    /** Names the navigation region and the button that opens its drawer. */
    label?: string;
    /** `main` makes the content the page's one main landmark; `none` when the page already has one. */
    landmark?: 'main' | 'none';
    /** Fills a bounded box instead of the viewport, as a preview does. */
    contained?: boolean;
    collapsed?: boolean;
    drawerOpen?: boolean;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    children: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();

  const sideId = $props.id();
  let width = $state(0);
  let rem = $state(16);
  let ready = $state(false);
  let root = $state<HTMLElement | null>(null);
  let side = $state<HTMLElement | null>(null);
  let topBar = $state<HTMLElement | null>(null);
  let menu = $state<HTMLButtonElement | null>(null);

  // The same breakpoints as the container queries below, which own the first paint.
  const mode: ShellMode = $derived(
    width > 0 && width < 48 * rem
      ? 'drawer'
      : collapsed && width >= 64.0625 * rem
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
    toggleCollapsed: () => {
      collapsed = !collapsed;
    },
    closeDrawer: () => {
      drawerOpen = false;
    }
  });

  onMount(() => {
    rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    // The first frame is a placement, not a change, so the width only animates after it.
    const frame = requestAnimationFrame(() => (ready = true));
    return () => cancelAnimationFrame(frame);
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

  /** The drawer lives in the top layer, so it is placed against the shell by hand. */
  function placeDrawer() {
    if (!side || !root) return;
    const box = root.getBoundingClientRect();
    const top = Math.max(topBar?.getBoundingClientRect().bottom ?? box.top, 0);
    const bottom = Math.min(box.bottom, document.documentElement.clientHeight);
    side.style.setProperty('--sui-drawer-top', `${top}px`);
    side.style.setProperty('--sui-drawer-left', `${Math.max(box.left, 0)}px`);
    side.style.setProperty('--sui-drawer-height', `${Math.max(bottom - top, 0)}px`);
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
    drawerOpen = event.newState === 'open';
    if (drawerOpen) return;
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
The rail stays beside it, so every place is still one press away.

On a phone, below 48rem of the shell's own width, a 56px bar names the current page. Its
button opens the rail and the sidebar over the content as one drawer, and keeps its name
while `aria-expanded` says whether the drawer is open. While the drawer is open the bar and
the content are inert, focus moves into the drawer and Tab stays inside. Escape or a press
outside closes it, and focus returns to the bar's button.

The layout answers to the shell's own width through container queries, so a shell inside a
narrow preview behaves as it would on a phone. `contained` fills a bounded box instead of the
viewport. `landmark="none"` keeps the content from claiming the page's one `main`.
-->

<div
  bind:this={root}
  bind:clientWidth={width}
  {...rest}
  class={['sui-shell', className, { contained, ready }]}
>
  <header bind:this={topBar} class="sui-shell-bar" inert={drawerOpen}>
    <button
      bind:this={menu}
      type="button"
      class="sui-shell-menu"
      popovertarget={sideId}
      aria-expanded={drawerOpen}
      aria-label={label}
    >
      <Icon name="sidebar-expand" size="md" />
    </button>
    <p class="sui-shell-title">{title}</p>
    {@render bar?.()}
  </header>

  <div class="sui-shell-grid" data-collapsed={collapsed}>
    <aside
      bind:this={side}
      id={sideId}
      popover="auto"
      class="sui-shell-side"
      aria-label={label}
      {onbeforetoggle}
      {ontoggle}
    >
      {#if rail}
        <div class="sui-shell-rail">{@render rail()}</div>
      {/if}
      <div class="sui-shell-pages">{@render sidebar()}</div>
    </aside>
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

  .sui-shell-bar {
    align-items: center;
    background: var(--sui-sidebar-bg);
    border-block-end: 1px solid var(--sui-sidebar-border);
    box-sizing: border-box;
    color: var(--sui-sidebar-text);
    display: none;
    flex: none;
    gap: var(--sui-space-2);
    inset-block-start: 0;
    min-block-size: var(--sui-top-bar-height);
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
    inline-size: var(--sui-touch-target);
    justify-content: center;
    margin: 0;
    padding: 0;
    touch-action: manipulation;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-shell-menu:hover {
    background: var(--sui-sidebar-item-hover);
    color: var(--sui-sidebar-text);
  }

  .sui-shell-menu:active {
    background: var(--sui-sidebar-item-pressed);
    box-shadow: var(--sui-sidebar-pressed-inset);
    translate: 0 1px;
  }

  .sui-shell-menu:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-sidebar-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-shell-title {
    flex: 1;
    font: 600 var(--sui-font-size-title) / var(--sui-leading-title) var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow-x: clip;
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .sui-shell-rail {
    display: flex;
    flex: none;
  }

  .sui-shell-pages {
    border-inline-end: 1px solid var(--sui-sidebar-border);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inline-size: var(--sui-sidebar-width);
    min-inline-size: 0;
  }

  .contained .sui-shell-side {
    align-self: stretch;
    block-size: auto;
  }

  .ready .sui-shell-pages {
    transition: inline-size var(--sui-duration-normal) var(--sui-ease-standard);
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

    .sui-shell-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .sui-shell-side:not(:popover-open) {
      display: none;
    }

    .sui-shell-side:popover-open {
      block-size: var(--sui-drawer-height);
      box-shadow: var(--sui-shadow-popover);
      inset-block-start: var(--sui-drawer-top);
      inset-inline-start: var(--sui-drawer-left);
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
  }

  @media (prefers-reduced-motion: reduce) {
    .ready .sui-shell-pages,
    .sui-shell-menu {
      transition: none;
    }

    .sui-shell-menu:active {
      translate: none;
    }
  }
</style>
