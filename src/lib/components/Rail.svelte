<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type RailItem = {
    label: string;
    icon: IconName;
    /** A destination draws a link; without one the tile is a button that calls `onpick`. */
    href?: string;
    /** A count of things waiting there, drawn on the tile's corner. */
    badge?: number;
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
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

  const name = (item: RailItem) =>
    item.badge ? `${item.label}, ${item.badge} waiting` : item.label;
</script>

<!--
@component
The outermost navigation: a 60px column of tiles, one per place, such as a workspace or a
console. It changes where the reader is, and the `SideNav` beside it changes the page inside
that place. The current place wears the same solid plate as the current page.

Every tile is an icon with its name in a tooltip that opens to the side, on hover and on
keyboard focus. Inside an `AppShell` the rail leaves on a phone and in the collapsed strip,
where the shell keeps one chrome column.
-->

{#snippet tile(item: RailItem)}
  {@const here = item.label === current}
  <li>
    {#if item.href}
      <a
        bind:this={tiles[item.label]}
        href={item.href}
        class="sui-rail-tile"
        aria-label={name(item)}
        aria-current={here ? 'page' : undefined}
      >
        <Icon name={item.icon} size="md" />
        {#if item.badge}<span class="sui-rail-badge" aria-hidden="true"
            ><span>{item.badge}</span></span
          >{/if}
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
        <Icon name={item.icon} size="md" />
        {#if item.badge}<span class="sui-rail-badge" aria-hidden="true"
            ><span>{item.badge}</span></span
          >{/if}
      </button>
    {/if}
    <Tooltip anchor={tiles[item.label]} text={name(item)} side="inline-end" />
  </li>
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
    block-size: var(--sui-rail-tile);
    border: 0;
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-secondary);
    cursor: pointer;
    display: inline-flex;
    inline-size: var(--sui-rail-tile);
    justify-content: center;
    margin: 0;
    padding: 0;
    position: relative;
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

  .sui-rail-badge {
    align-items: center;
    background: var(--sui-danger);
    block-size: var(--sui-icon-base);
    border-radius: var(--sui-radius-chip);
    box-shadow: 0 0 0 2px var(--sui-sidebar-bg);
    box-sizing: border-box;
    color: var(--sui-on-danger);
    display: inline-flex;
    font: 600 var(--sui-font-size-nano) / var(--sui-leading-flat) var(--sui-sans);
    font-variant-numeric: tabular-nums;
    inset-block-start: calc(-1 * var(--sui-space-1));
    inset-inline-end: calc(-1 * var(--sui-space-1));
    justify-content: center;
    min-inline-size: var(--sui-icon-base);
    padding-inline: var(--sui-space-1);
    position: absolute;
  }

  .sui-rail-badge > span {
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
