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
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { formatCount } from '../internal/locale.js';
  import { followsInPlace, getShell } from '../internal/shell.svelte.js';
  import Tooltip from './Tooltip.svelte';

  let {
    items,
    foot = [],
    current,
    label = word('Rail.label', 'Places'),
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
  const bar = shell?.bottomNav ?? false;
  const inBar = $derived(bar && shell?.mode === 'drawer');
  const tiles = $state<Record<string, HTMLElement | null>>({});

  const key = (item: RailItem) => item.href ?? item.label;
  const name = (item: RailItem) =>
    item.badge ? `${item.label}, ${badgeLabel(item.badge)}` : item.label;

  function follow(event: MouseEvent, item: RailItem) {
    onnavigate?.(event, item);
    if (shell?.mode === 'drawer' && followsInPlace(event)) shell.closeDrawer();
  }
</script>

<!--
@component
The outermost navigation: a 72px column of tiles, one per place, such as a workspace or a
console. It changes where the reader is, and the `SideNav` beside it changes the page inside
that place.

Every tile is at least a 44px target with its icon over its label, `short` when one is given.
A label that does not fit wraps under the icon instead of being cut, and a tooltip with the
full name opens beside a tile only when `short` replaces it. A badge rides the icon's corner
and is read as part of the tile's name. Inside an `AppShell` the rail stays beside the
collapsed strip. On a phone it rides in the drawer, or, in a shell with `bottomNav`, it turns
into the bottom bar: the same tiles side by side, sharing the width.

Current is drawn the same way in every navigation list: the place on screen stands on the
selection plate inside a `--sui-border-strong` ring, which holds 3:1 against the column, with
semibold ink, and under forced colors the ring turns `Highlight`.

- Semantics: a `nav` landmark named by `label`, holding lists of links (`aria-current="page"`) or buttons (`aria-current="true"`).
- Content: tiles with a glyph, a label and an optional `short` label and `badge`; an optional `brand` mark above them and `foot` tiles at the end.
- States: rest, hover, pressed (the plate's ground, an inset shadow and a 1px sink), focus (a 2px offset ring) and current (the plate inside its ring, semibold).
- Keyboard: Tab moves through the tiles in order, and Enter follows a link or presses a button.
- Pointer and touch: every tile is at least 44 by 44px on every pointer; nothing needs a gesture.
- Focus: pressing a tile keeps focus on it; following a link inside the phone drawer closes the drawer and the shell returns focus to its menu button.
- Responsive: in a column shorter than its tiles, as at 400% zoom, the rail scrolls inside itself; text zoom grows the tiles instead of spilling them, and with `bottomNav` on a phone the tiles share one row.
- Accessibility: each tile's name is its full `label` plus the badge's words, so a `short` label still names it in full; the current ring and the label ink hold 3:1 and 4.5:1.
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
        ><span>{formatCount(item.badge)}</span></span
      >{/if}
  </span>
  <span class="sui-rail-label">{item.short ?? item.label}</span>
{/snippet}

<nav {...rest} class={['sui-rail', className]} aria-label={label} data-bar={bar || undefined}>
  {#if brand}
    <div class="sui-rail-brand">{@render brand()}</div>
    <span class="sui-rail-rule" aria-hidden="true"></span>
  {/if}
  <ul class="sui-rail-list" style:--sui-local-rail-count={items.length}>
    {#each items as item (key(item))}{@render tile(item)}{/each}
  </ul>
  {#if foot.length > 0}
    <ul class="sui-rail-list sui-rail-foot" style:--sui-local-rail-count={foot.length}>
      {#each foot as item (key(item))}{@render tile(item)}{/each}
    </ul>
  {/if}
</nav>

<style>
  .sui-rail {
    align-items: center;
    background: var(--sui-sidebar-bg);
    block-size: 100%;
    border-inline-end: var(--sui-stroke) solid var(--sui-sidebar-border);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-2);
    /* The column is 72px at the default text size and widens with a reader's larger text, so
       a label keeps its words on a line instead of breaking letter by letter. */
    inline-size: var(--sui-rail-width);
    overflow: hidden auto;
    overscroll-behavior: contain;
    padding-block: var(--sui-space-3);
    scrollbar-width: thin;
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
     them past the edge. */
  .sui-rail-list {
    align-self: stretch;
    display: grid;
    flex: none;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0 var(--sui-space-1);
  }

  .sui-rail-foot {
    margin-block-start: auto;
  }

  .sui-rail-tile {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-secondary);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-1);
    inline-size: 100%;
    justify-content: center;
    margin: 0;
    min-block-size: var(--sui-touch-target);
    padding: var(--sui-space-1);
    position: relative;
    text-decoration: none;
    touch-action: manipulation;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  @media (hover: hover) {
    .sui-rail-tile:hover:not(:active) {
      background: var(--sui-sidebar-item-hover);
      color: var(--sui-sidebar-text);
    }
  }

  .sui-rail-tile:active {
    background: var(--sui-sidebar-item-pressed);
    box-shadow: var(--sui-sidebar-pressed-inset);
    translate: 0 1px;
  }

  .sui-rail-tile:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-sidebar-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-rail-tile[aria-current] {
    background: var(--sui-sidebar-active-bg);
    box-shadow: var(--sui-sidebar-thumb-shadow);
    color: var(--sui-sidebar-active-ink);
  }

  /* The current mark every navigation list shares: a ring that holds 3:1 on the column, drawn
     on all four sides so it is never an edge strip, and laid over the tile so it moves nothing. */
  .sui-rail-tile[aria-current]::before {
    border: var(--sui-stroke) solid var(--sui-border-strong);
    border-radius: inherit;
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  .sui-rail-tile[aria-current]:active {
    box-shadow: var(--sui-sidebar-pressed-inset), var(--sui-sidebar-thumb-shadow-pressed);
  }

  .sui-rail-glyph {
    display: inline-flex;
    position: relative;
  }

  .sui-rail-label {
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-medium) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    hyphens: auto;
    max-inline-size: 100%;
    overflow-wrap: break-word;
    text-align: center;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  .sui-rail-tile[aria-current] .sui-rail-label {
    font-weight: var(--sui-weight-semibold);
  }

  /* Something waiting is information, not a fault, so it wears the accent. */
  .sui-rail-badge {
    align-items: center;
    background: var(--sui-brand-action);
    block-size: var(--sui-icon-base);
    border-radius: var(--sui-radius-pill);
    box-shadow: 0 0 0 var(--sui-stroke-bold) var(--sui-sidebar-bg);
    box-sizing: border-box;
    color: var(--sui-on-brand-action);
    display: inline-flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-flat)
      var(--sui-sans);
    font-variant-numeric: tabular-nums;
    inset-block-start: calc(-1 * var(--sui-space-1));
    inset-inline-start: calc(100% - var(--sui-space-2));
    justify-content: center;
    min-inline-size: var(--sui-icon-base);
    padding-inline: var(--sui-space-1);
    position: absolute;
  }

  .sui-rail-badge > span {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  /* In a shell with a bottom bar, on a phone, the tiles stand side by side and share the row. */
  @container sui-shell (max-width: 47.9375rem) {
    .sui-rail[data-bar] {
      block-size: auto;
      border-block-start: var(--sui-stroke) solid var(--sui-sidebar-border);
      border-inline-end: 0;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0;
      inline-size: 100%;
      overflow: visible;
      padding: var(--sui-space-1) var(--sui-space-1)
        calc(var(--sui-space-1) + env(safe-area-inset-bottom));
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

    /* In a tile no wider than its words the count stands beside the glyph, inside the tile,
       rather than on its corner, where it would reach into the next tile. */
    .sui-rail[data-bar] .sui-rail-glyph {
      align-items: center;
      gap: var(--sui-space-1);
    }

    .sui-rail[data-bar] .sui-rail-badge {
      box-shadow: none;
      position: static;
    }

    /* Tiles in a row meet, so a narrow phone gives each label the whole tile. */
    .sui-rail[data-bar] .sui-rail-tile {
      padding-inline: 0;
    }
  }

  @media (forced-colors: active) {
    .sui-rail-tile[aria-current]::before {
      border: var(--sui-stroke-bold) solid Highlight;
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
