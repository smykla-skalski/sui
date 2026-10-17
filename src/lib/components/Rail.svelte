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
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { watchCut } from '../internal/shell.svelte.js';
  import Tooltip from './Tooltip.svelte';

  let {
    items,
    foot = [],
    current,
    label = 'Places',
    brand,
    onpick,
    class: className = '',
    ...rest
  }: {
    items: RailItem[];
    /** Tiles at the bottom, such as settings or the account. */
    foot?: RailItem[];
    /** The label of the place on screen. */
    current?: string;
    /** The navigation landmark's name. */
    label?: string;
    /** The product's mark at the top. */
    brand?: Snippet;
    onpick?: (item: RailItem) => void;
    class?: HTMLAttributes<HTMLElement>['class'];
  } & HTMLAttributes<HTMLElement> = $props();

  const tiles = $state<Record<string, HTMLElement | null>>({});
  const cut = $state<Record<string, boolean>>({});

  const name = (item: RailItem) =>
    item.badge ? `${item.label}, ${item.badge} waiting` : item.label;
</script>

<!--
@component
The outermost navigation: a 72px column of tiles, one per place, such as a workspace or a
console. It changes where the reader is, and the `SideNav` beside it changes the page inside
that place. The current place wears the same solid plate as the current page.

Every tile is a 44px target with its icon over a one-line label, `short` when one is given.
A tooltip with the full name opens to the side only when the drawn label is shorter or cut.
A badge rides the icon's corner and is read as part of the tile's name. Inside an `AppShell`
the rail stays beside the collapsed strip, and on a phone it rides in the drawer.
-->

{#snippet tile(item: RailItem)}
  {@const here = item.label === current}
  {@const tip = item.short ? item.short !== item.label : cut[item.label]}
  <li>
    {#if item.href}
      <a
        bind:this={tiles[item.label]}
        href={item.href}
        class="sui-rail-tile"
        aria-label={name(item)}
        aria-current={here ? 'page' : undefined}
      >
        {@render face(item)}
      </a>
    {:else}
      <button
        bind:this={tiles[item.label]}
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
      <Tooltip anchor={tiles[item.label]} text={item.label} side="inline-end" />
    {/if}
  </li>
{/snippet}

{#snippet face(item: RailItem)}
  <span class="sui-rail-glyph">
    <Icon name={item.icon} size="md" />
    {#if item.badge}<span class="sui-rail-badge" aria-hidden="true"><span>{item.badge}</span></span
      >{/if}
  </span>
  <span class="sui-rail-label" {@attach watchCut((value) => (cut[item.label] = value))}
    >{item.short ?? item.label}</span
  >
{/snippet}

<nav {...rest} class={['sui-rail', className]} aria-label={label}>
  {#if brand}
    <div class="sui-rail-brand">{@render brand()}</div>
    <span class="sui-rail-rule" aria-hidden="true"></span>
  {/if}
  <ul class="sui-rail-list">
    {#each items as item (item.label)}{@render tile(item)}{/each}
  </ul>
  {#if foot.length > 0}
    <ul class="sui-rail-list sui-rail-foot">
      {#each foot as item (item.label)}{@render tile(item)}{/each}
    </ul>
  {/if}
</nav>

<style>
  .sui-rail {
    align-items: center;
    background: var(--sui-sidebar-bg);
    block-size: 100%;
    border-inline-end: 1px solid var(--sui-sidebar-border);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-2);
    inline-size: var(--sui-rail-width);
    padding-block: var(--sui-space-3);
  }

  .sui-rail-brand {
    display: grid;
    place-items: center;
  }

  .sui-rail-rule {
    background: var(--sui-sidebar-border);
    block-size: 1px;
    flex: none;
    inline-size: var(--sui-space-6);
  }

  .sui-rail-list {
    display: grid;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .sui-rail-foot {
    margin-block-start: auto;
  }

  .sui-rail-tile {
    align-items: center;
    background: transparent;
    block-size: var(--sui-touch-target);
    border: 0;
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-secondary);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-1);
    inline-size: calc(var(--sui-rail-width) - var(--sui-space-2));
    justify-content: center;
    margin: 0;
    padding: 0 var(--sui-space-1);
    text-decoration: none;
    touch-action: manipulation;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-rail-tile:hover {
    background: var(--sui-sidebar-item-hover);
    color: var(--sui-sidebar-text);
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

  .sui-rail-tile[aria-current]:active {
    box-shadow: var(--sui-sidebar-pressed-inset), var(--sui-sidebar-thumb-shadow-pressed);
  }

  .sui-rail-glyph {
    display: inline-flex;
    position: relative;
  }

  .sui-rail-label {
    block-size: var(--sui-block-snap);
    font: 500 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    max-inline-size: 100%;
    overflow-x: clip;
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-rail-tile[aria-current] .sui-rail-label {
    font-weight: 600;
  }

  .sui-rail-badge {
    align-items: center;
    background: var(--sui-danger);
    block-size: var(--sui-icon-base);
    border-radius: var(--sui-radius-chip);
    box-shadow: 0 0 0 2px var(--sui-sidebar-bg);
    box-sizing: border-box;
    color: var(--sui-on-danger);
    display: inline-flex;
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
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

  @media (prefers-reduced-motion: reduce) {
    .sui-rail-tile {
      transition: none;
    }

    .sui-rail-tile:active {
      translate: none;
    }
  }
</style>
