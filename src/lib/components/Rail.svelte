<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type RailItem = {
    label: string;
    /** A shorter name drawn under the icon, taken from the words of `label` so speech input finds it. */
    short?: string;
    icon: IconName;
    /** A destination draws a link; without one the tile is a button that calls `onpick`. */
    href?: string;
    /** A count of things waiting there, drawn on the icon's corner and read with the name. */
    badge?: number;
  };
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { formatCount } from '../internal/locale.js';
  import { followsInPlace, getRailPages, getShell } from '../internal/shell.svelte.js';
  import Tooltip from './Tooltip.svelte';

  let {
    items,
    foot = [],
    current,
    label = word('Rail.label', 'Workspaces'),
    badgeLabel = word('Rail.badgeLabel', (count: number) => `${formatCount(count)} waiting`),
    brand,
    onpick,
    onnavigate,
    class: className = '',
    ...rest
  }: {
    items: RailItem[];
    /** Tiles at the bottom, such as settings or the account. */
    foot?: RailItem[];
    /** The place on screen: its `href`, or the `label` of a tile without one. */
    current?: string;
    /** The navigation landmark's name. */
    label?: string;
    /** The words a badge's count is read as, after the place's name. */
    badgeLabel?: (count: number) => string;
    /** The product's mark at the top. */
    brand?: Snippet;
    /** Called when a tile without an `href` is pressed. */
    onpick?: (item: RailItem) => void;
    /** Called when a tile's link is followed, for a router that handles the click itself. */
    onnavigate?: (event: MouseEvent, item: RailItem) => void;
    class?: HTMLAttributes<HTMLElement>['class'];
  } & HTMLAttributes<HTMLElement> = $props();

  const shell = getShell();
  // The shell's pages, when this rail stands beside them rather than in the phone's bottom bar.
  const pages = getRailPages();
  const bar = (shell?.bottomNav ?? false) && !pages;
  const inBar = $derived(bar && shell?.mode === 'drawer');
  // A phone's drawer in a shell with a bottom bar holds only the pages: the bar has the places.
  const pagesOnly = $derived(pages && shell?.bottomNav && shell.mode === 'drawer');
  const tiles = $state<Record<string, HTMLElement | null>>({});

  const key = (item: RailItem) => item.href ?? item.label;
  const name = (item: RailItem) =>
    item.badge ? `${item.label}${mark('comma')}${badgeLabel(item.badge)}` : item.label;

  function follow(event: MouseEvent, item: RailItem) {
    onnavigate?.(event, item);
    if (shell?.mode === 'drawer' && followsInPlace(event)) shell.closeDrawer();
  }
</script>

<!--
@component
The outermost navigation: an 80px column of tiles, one per place, such as a workspace or a
console. It changes where the reader is, and the `SideNav` beside it changes the page inside
that place.

Every tile is at least a 44px target with its icon over its label, `short` when one is given.
A label that does not fit wraps under the icon instead of being cut, and a tooltip with the
full name opens beside a tile only when `short` replaces it. A badge stands 4px clear of the icon's top-end corner
and is read as part of the tile's name. Inside an `AppShell` the rail holds the shell's pages
between its places and its foot: beside them in a column of their own while the sidebar is
whole, and stacked with them in one column once it folds. Holding them, it marks its current
place on a neutral plate a step past a pressed tile's, its glyph in the place's own ink, so the current page's accent plate and glyph are the column's one accent. Whole, its foot draws the pages' foot hairline on the same line. On a phone it rides in the drawer, or,
in a shell with `bottomNav`, it turns into the bottom bar: the same tiles side by side, sharing
the width.

Current is drawn the same way in every navigation list: the words and the plate carry it.
Rest tiles are muted and the place on screen is primary ink, a step of 2:1 or more in
lightness, with its glyph in the accent ink, on a plate of the accent tint, its words at 500. Every tile holds the room its words take at
500, so turning current never rewraps a label or changes a tile's height. Under forced colors the plate is `Highlight` and its words `HighlightText`.

- Semantics: a `nav` landmark named by `label`, holding lists of links (`aria-current="page"`) or buttons (`aria-current="true"`).
- Content: tiles with a glyph, a label and an optional `short` label and `badge`; an optional `brand` mark above them and `foot` tiles at the end.
- States: rest, hover, pressed (the pressed ground, an inset shadow and a 1px sink), focus (a 2px offset ring) and current (primary ink at 500 and an accent glyph on the plate, in room every tile holds, so it moves nothing).
- Keyboard: Tab moves through the tiles in order, and Enter follows a link or presses a button.
- Pointer and touch: every tile is at least 44 by 44px on every pointer; nothing needs a gesture.
- Focus: pressing a tile keeps focus on it; following a link inside the phone drawer closes the drawer and the shell returns focus to its menu button.
- Responsive: in a column shorter than its tiles, as at 400% zoom, the rail scrolls inside itself; text zoom grows the tiles instead of spilling them, and with `bottomNav` on a phone the tiles share one row, 8px under the bar's top and over its foot.
- Accessibility: each tile's name is its full `label` plus the badge's words, so a `short` label still names it in full; every ink holds 4.5:1 on its ground, and the current ink stands 2:1 from the rest ink in lightness and the plate marks it too, so it is never hue alone (WCAG 1.4.1).
- Localization: `label` and `badgeLabel` are props with English defaults; the badge's count follows the page language's digits and grouping, and the tooltip opens on the inline end, which is the left in a right-to-left page.
- Performance: a handful of static tiles; only background, colour and the 1px press move, through transitions that reduced motion removes.
- Analytics: `onnavigate(event, item)` reports a followed link and `onpick(item)` a pressed button.
- Failure: an empty `items` draws an empty column with its brand and foot; a place without a destination is a button, and a badge of 0 draws nothing.
-->

{#snippet tile(item: RailItem)}
  {@const here = key(item) === current}
  {@const tip = item.short !== undefined && item.short !== item.label}
  <li>
    {#if item.href}
      <a
        bind:this={tiles[key(item)]}
        href={item.href}
        class="sui-rail-tile"
        aria-label={name(item)}
        aria-current={here ? 'page' : undefined}
        onclick={(event) => follow(event, item)}
      >
        {@render face(item)}
      </a>
    {:else}
      <button
        bind:this={tiles[key(item)]}
        type="button"
        class="sui-rail-tile"
        aria-label={name(item)}
        aria-current={here ? 'true' : undefined}
        onclick={() => onpick?.(item)}
      >
        {@render face(item)}
      </button>
    {/if}
    {#if tip}
      <Tooltip
        anchor={tiles[key(item)]}
        text={item.label}
        side={inBar ? 'block-start' : 'inline-end'}
      />
    {/if}
  </li>
{/snippet}

{#snippet face(item: RailItem)}
  <span class="sui-rail-glyph">
    <Icon name={item.icon} size="md" />
    {#if item.badge}<span class="sui-rail-badge" aria-hidden="true"
        ><span data-count={formatCount(item.badge)}></span></span
      >{/if}
  </span>
  <span class="sui-rail-label" data-label={item.short ?? item.label}
    ><span>{item.short ?? item.label}</span></span
  >
{/snippet}

{#if pagesOnly}
  {@render pages?.()}
{:else}
  <nav
    {...rest}
    class={['sui-rail', className, { host: pages }]}
    aria-label={label}
    data-bar={bar || undefined}
    data-collapsed={(pages && shell?.collapsed) || undefined}
  >
    <div class="sui-rail-top">
      {#if brand}
        <div class="sui-rail-brand">{@render brand()}</div>
        <span class="sui-rail-rule" aria-hidden="true"></span>
      {/if}
      <ul class="sui-rail-list" style:--sui-local-rail-count={items.length}>
        {#each items as item (key(item))}{@render tile(item)}{/each}
      </ul>
    </div>
    <!-- The pages stand between the places and the foot, so Tab meets them in the order the
         folded column draws them. -->
    {@render pages?.()}
    {#if foot.length > 0}
      <ul class="sui-rail-list sui-rail-foot" style:--sui-local-rail-count={foot.length}>
        {#each foot as item (key(item))}{@render tile(item)}{/each}
      </ul>
    {/if}
  </nav>
{/if}

<style>
  .sui-rail {
    --sui-local-rail-edge: calc(-1 * var(--sui-stroke));

    align-items: center;
    background: var(--sui-sidebar-bg);
    block-size: 100%;
    /* The edge is drawn inside the column, not beside its room, so the tiles keep an even 64px
       and a glyph centres on a whole pixel, where a border left 63px and a half-pixel glyph. */
    box-shadow: inset var(--sui-local-rail-edge) 0 var(--sui-sidebar-border);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-2);
    /* The column is 80px at the default text size and widens with a reader's larger text, so
       a label keeps its words on a line instead of breaking letter by letter. */
    inline-size: var(--sui-rail-width);
    overflow: hidden auto;
    overscroll-behavior: contain;
    padding-block: var(--sui-space-3);
    scrollbar-width: thin;
  }

  /* Alone, the places' part of the column is no box of its own. */
  .sui-rail-top {
    display: contents;
  }

  /* Beside the shell's pages the rail is a grid: its places at the top of its column, its foot
     at the bottom, and the pages in a column of their own beside them. Folded, the three stack
     in one column (AppShell), so the rail and the strip are one column. */
  .host {
    align-items: start;
    box-shadow: none;
    display: grid;
    gap: 0;
    grid-template:
      'top pages' auto
      '. pages' minmax(0, 1fr)
      'foot pages' auto
      / var(--sui-rail-width) minmax(0, max-content);
    inline-size: auto;
    min-inline-size: 0;
    padding-block: 0;
  }

  .host .sui-rail-top {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-2);
    grid-area: top;
    padding-block-start: var(--sui-space-3);
  }

  /* The places keep the pitch and the inset the folded column keeps, 4px apart and 4px in, so
     they hold still when the pages fold under them and every plate in the column is 72px, the
     room a two-word page label such as "Icon Button" needs on one line. */
  .host .sui-rail-list {
    gap: var(--sui-space-1);
    padding-inline: var(--sui-space-1);
  }

  /* Beside the pages, and in the one folded column, a place's tile rounds as a page's row does,
     so the column's plates share one corner. */
  .host .sui-rail-tile {
    border-radius: var(--sui-radius-control);
  }

  .host .sui-rail-foot {
    grid-area: foot;
    margin-block-start: 0;
    padding-block: var(--sui-space-2) var(--sui-space-3);
  }

  @container sui-shell (min-width: 64.0625rem) {
    .host[data-collapsed] {
      grid-template:
        'top' auto
        'pages' minmax(0, 1fr)
        'foot' auto
        / var(--sui-rail-width);
    }

    /* One column keeps one pitch: every tile stands 4px from the next, places, pages and foot
       alike, and the places stand 8px clear of the hairline under them, as a group's rows do. */
    .host[data-collapsed] .sui-rail-top {
      padding-block-end: var(--sui-space-2);
    }

    .host[data-collapsed] .sui-rail-foot {
      padding-block-start: 0;
    }
  }

  /* Whole beside the pages, the foot draws the hairline the pages' foot draws, on its line, and
     its tile centres on the fold control's, so the two feet read as one band. Under 64rem the
     pages' foot goes, so this one keeps no line either. */
  @container sui-shell (min-width: 64.0625rem) {
    .host:not([data-collapsed]) .sui-rail-foot {
      border-block-start: var(--sui-stroke) solid var(--sui-sidebar-border);
      margin-inline: var(--sui-space-1);
      padding: calc(var(--sui-space-3) - var(--sui-stroke)) 0
        calc(var(--sui-space-3) - var(--sui-stroke));
    }
  }

  .sui-rail:dir(rtl) {
    --sui-local-rail-edge: var(--sui-stroke);
  }

  .sui-rail-brand {
    display: grid;
    flex: none;
    place-items: center;
  }

  .sui-rail-rule {
    background: var(--sui-sidebar-border);
    block-size: var(--sui-stroke);
    flex: none;
    inline-size: var(--sui-space-6);
  }

  /* The list runs the column's width, so a scrollbar narrows the tiles instead of pushing
     them past the edge. Its tiles stand 8px in, clear of the column's edge as a side nav's
     rows stand clear of theirs, and give their words the room they gave up. */
  .sui-rail-list {
    align-self: stretch;
    display: grid;
    flex: none;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0 var(--sui-space-2);
  }

  .sui-rail-foot {
    margin-block-start: auto;
  }

  /* A badge's halo takes the tile's ground in every state, so it never shows the sidebar
     through a hovered, pressed or current tile. */
  .sui-rail-tile {
    --sui-local-tile-ground: var(--sui-sidebar-bg);
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-rest);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-1);
    inline-size: 100%;
    justify-content: center;
    margin: 0;
    min-block-size: var(--sui-touch-target);
    padding: var(--sui-space-1) 0;
    text-decoration: none;
    touch-action: manipulation;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  @media (hover: hover) {
    .sui-rail-tile:hover:not(:active, [aria-current]) {
      --sui-local-tile-ground: var(--sui-sidebar-item-hover);
      background: var(--sui-local-tile-ground);
      color: var(--sui-sidebar-text);
    }
  }

  .sui-rail-tile:active {
    --sui-local-tile-ground: var(--sui-sidebar-item-pressed);
    background: var(--sui-local-tile-ground);
    box-shadow: var(--sui-sidebar-pressed-inset);
    translate: 0 1px;
  }

  .sui-rail-tile:focus-visible {
    color: var(--sui-sidebar-text);
    outline: var(--sui-focus-ring-width) solid var(--sui-sidebar-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  /* The plate under the current tile marks the state with the tile's ink and glyph, so it
     needs no ring or edge. */
  .sui-rail-tile[aria-current] {
    --sui-local-tile-ground: var(--sui-sidebar-active-bg);
    background: var(--sui-local-tile-ground);
    box-shadow: var(--sui-sidebar-thumb-shadow);
    color: var(--sui-sidebar-active-ink);
  }

  .sui-rail-tile[aria-current] .sui-rail-glyph {
    color: var(--sui-sidebar-active-glyph);
  }

  /* Holding the pages, the rail marks its place on a neutral plate, so the current page's
     accent plate is the one accent in the column and the two never compete. */
  .host .sui-rail-tile[aria-current] {
    background: var(--sui-sidebar-place-bg);
  }

  /* Its glyph keeps the place's own ink, so the page's glyph is the column's one accent mark. */
  .host .sui-rail-tile[aria-current] .sui-rail-glyph {
    color: var(--sui-sidebar-active-ink);
  }

  .sui-rail-tile[aria-current]:active {
    box-shadow: var(--sui-sidebar-pressed-inset), var(--sui-sidebar-thumb-shadow-pressed);
  }

  .sui-rail-glyph {
    display: inline-flex;
    position: relative;
  }

  /* A hidden copy of the words at the current weight shares their cell, so every tile already
     holds the room its words take once current, and turning current never rewraps them (L-85). */
  /* The label's box is an even height, so the glyph over it centres in the tile on a whole
     pixel. */
  .sui-rail-label {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    hyphens: auto;
    max-inline-size: 100%;
    overflow-wrap: break-word;
    text-align: center;
    text-wrap: balance;
  }

  .sui-rail-label > span,
  .sui-rail-label::after {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    grid-area: 1 / 1;
    min-inline-size: 0;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .sui-rail-label::after {
    content: attr(data-label) / '';
    font-weight: var(--sui-weight-medium);
    visibility: hidden;
  }

  .sui-rail-tile[aria-current] .sui-rail-label > span {
    font-weight: var(--sui-weight-medium);
  }

  /* Something waiting is information, not a fault, so it wears the accent. The count stands 4px
     clear of its glyph's top-end corner, where a folded page's count stands, so it covers none
     of the glyph and a folded column's counts share one offset. */
  .sui-rail-badge {
    align-items: center;
    background: var(--sui-brand-action);
    block-size: var(--sui-icon-base);
    border-radius: var(--sui-radius-pill);
    box-shadow: 0 0 0 var(--sui-stroke-bold) var(--sui-local-tile-ground);
    box-sizing: border-box;
    color: var(--sui-on-brand-action);
    display: inline-flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-flat)
      var(--sui-sans);
    font-variant-numeric: tabular-nums;
    inset-block-start: calc(-1 * var(--sui-space-1));
    inset-inline-start: calc(100% + var(--sui-space-1));
    justify-content: center;
    min-inline-size: var(--sui-icon-base);
    padding-inline: var(--sui-space-1);
    position: absolute;
  }

  /* The count is drawn, not written, so the tile's visible words stay its label, which leads
     its name (WCAG 2.5.3); the name already says the count. */
  .sui-rail-badge > span {
    align-content: center;
    block-size: var(--sui-block-snap);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .sui-rail-badge > span::before {
    content: attr(data-count);
  }

  /* In a shell with a bottom bar, on a phone, the tiles stand side by side and share the row,
     8px in from the bar's edges as the rail's tiles are from its column's. */
  @container sui-shell (max-width: 47.9375rem) {
    .sui-rail[data-bar] {
      block-size: auto;
      border-block-start: var(--sui-stroke) solid var(--sui-sidebar-border);
      border-inline-end: 0;
      box-shadow: none;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0;
      inline-size: 100%;
      overflow: visible;
      padding: var(--sui-space-2) var(--sui-space-2)
        calc(var(--sui-space-2) + env(safe-area-inset-bottom));
    }

    .sui-rail[data-bar] :is(.sui-rail-brand, .sui-rail-rule) {
      display: none;
    }

    /* Each tile starts from its label's width, so a longer name gets the room it needs, and
       never narrows past a finger's 44px; tiles that no longer fit one row, as at a large
       text size, wrap onto a second rather than squeeze. */
    .sui-rail[data-bar] .sui-rail-list {
      align-self: auto;
      display: flex;
      flex: var(--sui-local-rail-count) 1 auto;
      flex-wrap: wrap;
      gap: 0;
      margin: 0;
      min-inline-size: 0;
      padding: 0;
    }

    .sui-rail[data-bar] li {
      display: flex;
      flex: 1 1 auto;
      min-inline-size: var(--sui-touch-target);
    }

    /* Tiles in a row meet, so a narrow phone gives each label the whole tile. */
    .sui-rail[data-bar] .sui-rail-tile {
      padding-inline: 0;
    }
  }

  /* The count rides the glyph's corner in the bar as in the rail, unless the bar is so narrow
     that its tiles shrink to their words, where the corner would reach into the next tile: there
     it stands beside the glyph, inside the tile. */
  @container sui-shell (max-width: 18rem) {
    .sui-rail[data-bar] .sui-rail-glyph {
      align-items: center;
      gap: var(--sui-space-1);
    }

    .sui-rail[data-bar] .sui-rail-badge {
      box-shadow: none;
      position: static;
    }
  }

  @media (forced-colors: active) {
    /* Forced colors drop a shadow, so the column's edge is a border there. Beside the pages
       the column draws none, as it draws no shadow. */
    .sui-rail:not(.host) {
      border-inline-end: var(--sui-stroke) solid CanvasText;
    }

    .sui-rail-tile[aria-current],
    .host .sui-rail-tile[aria-current] {
      background-color: Highlight;
      color: HighlightText;
      /* Kept as written, or the browser draws a Canvas backplate behind the words on the plate. */
      forced-color-adjust: none;
    }

    .sui-rail-tile[aria-current] .sui-rail-glyph,
    .host .sui-rail-tile[aria-current] .sui-rail-glyph {
      color: HighlightText;
    }

    .sui-rail-badge {
      border: var(--sui-stroke) solid CanvasText;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-rail-tile {
      transition: none;
    }

    .sui-rail-tile:active {
      translate: none;
    }
  }
</style>
