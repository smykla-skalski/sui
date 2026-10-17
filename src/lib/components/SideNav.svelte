<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type NavItem = {
    href: string;
    label: string;
    /** A shorter name for the collapsed strip, taken from the words of `label` so speech input finds it. */
    short?: string;
    icon: IconName;
    /** A count beside the label, in tabular figures. */
    count?: number;
  };

  export type NavSection = {
    /** A heading over the group. A heading is a label, never a link. */
    label?: string;
    items: NavItem[];
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { getShell, watchCut } from '../internal/shell.svelte.js';
  import IconButton from './IconButton.svelte';
  import Tooltip from './Tooltip.svelte';

  let {
    title,
    kicker,
    sections,
    current,
    label,
    foot,
    onnavigate,
    class: className = '',
    ...rest
  }: {
    /** The name of the place these pages belong to. */
    title: string;
    /** A word above the title saying what kind of place it is. */
    kicker?: string;
    sections: NavSection[];
    /** The `href` of the page on screen. Exactly one row carries it. */
    current?: string;
    /** The navigation landmark's name. Defaults to "<title> pages". */
    label?: string;
    /** Quiet content at the bottom, such as the account. */
    foot?: Snippet;
    /** Called when a row is followed, for a router that handles the click itself. */
    onnavigate?: (event: MouseEvent, item: NavItem) => void;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & HTMLAttributes<HTMLDivElement> = $props();

  const shell = getShell();
  const mode = $derived(shell?.mode ?? 'full');
  const uid = $props.id();

  let tree = $state<HTMLElement | null>(null);
  let thumb = $state({ top: 0, left: 0, width: 0, height: 0 });
  let measured = $state(false);
  let gliding = $state(false);
  const rows = $state<Record<string, HTMLAnchorElement | null>>({});
  const cut = $state<Record<string, boolean>>({});

  /** Lays the selection plate under the current row, measured rather than guessed. */
  function measure() {
    const row = current ? rows[current] : null;
    // A closed drawer draws no rows, so its plate lands afresh when the drawer opens.
    if (!tree || !row || row.getClientRects().length === 0) {
      measured = false;
      gliding = false;
      return;
    }
    // Client rects, because offsets round to whole pixels and the plate must sit exactly on the row.
    const list = tree.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    thumb = {
      top: box.top - list.top,
      left: box.left - list.left,
      width: box.width,
      height: box.height
    };
    if (!measured) {
      measured = true;
      // The first placement is not a change, so the plate only glides after it has landed.
      requestAnimationFrame(() => requestAnimationFrame(() => (gliding = true)));
    }
  }

  $effect(() => {
    void current;
    void mode;
    if (!tree) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tree);
    for (const row of Object.values(rows)) if (row) observer.observe(row);
    return () => observer.disconnect();
  });
</script>

<!--
@component
The pages of one place, as rows under section headings: the second level of navigation, where
a `Rail` chooses the place and this chooses the page. Every row is a destination with its own
icon and address, and a heading is only a label.

The current page wears one solid plate in the brand color with inverse ink, the loudest thing
in the column. The plate is measured from the current row, does not slide on first paint, and
glides to the next row when the page changes. Until it is measured the row paints its own plate,
so the first frame is already right.

Inside an `AppShell` it follows the shell. A button named Navigation, with `aria-expanded`,
folds it into a strip where each row is an icon over a one-line label, `short` when one is
given. A tooltip with the full name shows only when that label is shorter or cut, and a count
is still read aloud. In the phone drawer the same place holds a close button, and rows are 44px.
-->

<div {...rest} class={['sui-side-nav', className]} data-mode={mode}>
  <div class="sui-side-nav-head">
    <div class="sui-side-nav-names">
      {#if kicker}<p class="sui-side-nav-kicker">{kicker}</p>{/if}
      <p class="sui-side-nav-title">{title}</p>
    </div>
    {#if shell && mode === 'drawer'}
      <IconButton
        toolbar
        icon="close"
        label="Close navigation"
        onclick={() => shell.closeDrawer()}
      />
    {:else if shell}
      <IconButton
        toolbar
        icon={shell.collapsed ? 'sidebar-expand' : 'sidebar-collapse'}
        label="Navigation"
        aria-expanded={!shell.collapsed}
        onclick={() => shell.toggleCollapsed()}
      />
    {/if}
  </div>

  <nav class="sui-side-nav-tree" aria-label={label ?? `${title} pages`}>
    <div bind:this={tree} class={['sui-side-nav-list', { measured, gliding }]}>
      <span
        class="sui-side-nav-thumb"
        aria-hidden="true"
        style:--sui-thumb-top="{thumb.top}px"
        style:--sui-thumb-left="{thumb.left}px"
        style:--sui-thumb-width="{thumb.width}px"
        style:--sui-thumb-height="{thumb.height}px"
      ></span>
      {#each sections as section, index (section.label ?? index)}
        {#if section.label}
          <p id="{uid}-{index}" class="sui-side-nav-group">{section.label}</p>
        {/if}
        <ul
          class="sui-side-nav-rows"
          aria-labelledby={section.label ? `${uid}-${index}` : undefined}
        >
          {#each section.items as item (item.href)}
            {@const tip = item.short ? item.short !== item.label : cut[item.href]}
            <li>
              <a
                bind:this={rows[item.href]}
                href={item.href}
                class="sui-side-nav-row"
                aria-current={item.href === current ? 'page' : undefined}
                onclick={(event) => onnavigate?.(event, item)}
              >
                <span class="sui-side-nav-glyph"><Icon name={item.icon} size="base" /></span>
                <span
                  class={['sui-side-nav-label', { replaced: item.short }]}
                  {@attach watchCut((value) => (cut[item.href] = value))}
                >
                  {item.label}
                </span>
                {#if item.short}
                  <span class="sui-side-nav-short" aria-hidden="true">{item.short}</span>
                {/if}
                {#if item.count !== undefined}
                  <span class="sui-side-nav-count"><span>{item.count}</span></span>
                {/if}
              </a>
              {#if mode === 'collapsed' && tip}
                <Tooltip anchor={rows[item.href]} text={item.label} side="inline-end" />
              {/if}
            </li>
          {/each}
        </ul>
      {/each}
    </div>
  </nav>

  {#if foot}
    <div class="sui-side-nav-foot">{@render foot()}</div>
  {/if}
</div>

<style>
  /* A row's glyph and a heading's first letter share one column because the row's inline
     padding and the heading's inline margin are the same token. */
  .sui-side-nav {
    box-sizing: border-box;
    color: var(--sui-sidebar-text);
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--sui-space-4);
    min-block-size: 0;
    padding: var(--sui-space-4) var(--sui-space-3);
  }

  .sui-side-nav-head {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
    padding-inline-start: var(--sui-space-3);
  }

  .sui-side-nav-names {
    display: grid;
    flex: 1;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-side-nav-kicker {
    color: var(--sui-sidebar-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-side-nav-title {
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-side-nav-tree {
    flex: 1 1 auto;
    margin-inline: calc(-1 * var(--sui-space-3));
    min-block-size: 0;
    overflow: hidden auto;
    padding-inline: var(--sui-space-3);
    scrollbar-width: thin;
  }

  .sui-side-nav-list {
    display: grid;
    position: relative;
  }

  .sui-side-nav-rows {
    display: grid;
    gap: var(--sui-control-inset);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .sui-side-nav-group {
    color: var(--sui-sidebar-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-sans);
    letter-spacing: 0.07em;
    margin: var(--sui-space-5) var(--sui-space-3) var(--sui-space-2);
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-side-nav-thumb + .sui-side-nav-group {
    margin-block-start: 0;
  }

  .sui-side-nav-thumb {
    background: var(--sui-sidebar-active-bg);
    block-size: var(--sui-thumb-height);
    border-radius: var(--sui-radius-control);
    box-shadow: var(--sui-sidebar-thumb-shadow);
    display: none;
    inline-size: var(--sui-thumb-width);
    inset-block-start: var(--sui-thumb-top);
    inset-inline-start: var(--sui-thumb-left);
    pointer-events: none;
    position: absolute;
  }

  .measured .sui-side-nav-thumb {
    display: block;
  }

  .gliding .sui-side-nav-thumb {
    transition:
      inset-block-start var(--sui-duration-travel) var(--sui-ease-travel),
      inset-inline-start var(--sui-duration-travel) var(--sui-ease-travel),
      inline-size var(--sui-duration-travel) var(--sui-ease-travel),
      block-size var(--sui-duration-travel) var(--sui-ease-travel),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-side-nav-list:has(.sui-side-nav-row[aria-current='page']:active) .sui-side-nav-thumb {
    box-shadow: var(--sui-sidebar-pressed-inset), var(--sui-sidebar-thumb-shadow-pressed);
    translate: 0 1px;
  }

  .sui-side-nav-row {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-secondary);
    display: flex;
    font: 500 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-2);
    min-block-size: var(--sui-control-height-compact);
    padding: var(--sui-space-2) var(--sui-space-3);
    position: relative;
    text-decoration: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-side-nav-row:hover {
    background: var(--sui-sidebar-item-hover);
    color: var(--sui-sidebar-text);
  }

  .sui-side-nav-row:active {
    background: var(--sui-sidebar-item-pressed);
    box-shadow: var(--sui-sidebar-pressed-inset);
    translate: 0 1px;
  }

  .sui-side-nav-row:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-sidebar-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-side-nav-row[aria-current='page'] {
    color: var(--sui-sidebar-active-ink);
    font-weight: 600;
  }

  /* Until the plate is measured the current row paints its own, so the first frame is right. */
  .sui-side-nav-list:not(.measured) .sui-side-nav-row[aria-current='page'] {
    background: var(--sui-sidebar-active-bg);
  }

  .measured .sui-side-nav-row[aria-current='page'],
  .measured .sui-side-nav-row[aria-current='page']:hover,
  .measured .sui-side-nav-row[aria-current='page']:active {
    background: transparent;
    box-shadow: none;
  }

  .sui-side-nav-row[aria-current='page']:focus-visible {
    outline-color: var(--sui-sidebar-active-ink);
  }

  .sui-side-nav-glyph {
    align-items: center;
    display: inline-flex;
    flex: none;
  }

  .sui-side-nav-label {
    flex: 1;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-side-nav-short {
    display: none;
  }

  .sui-side-nav-count {
    align-items: center;
    background: var(--sui-sidebar-item-hover);
    block-size: var(--sui-tier-mark);
    border-radius: var(--sui-r-chip);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-secondary);
    display: inline-flex;
    flex: none;
    font: 500 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    font-variant-numeric: tabular-nums;
    padding-inline: var(--sui-space-2);
  }

  .sui-side-nav-count > span {
    text-box: trim-both cap alphabetic;
  }

  .sui-side-nav-row[aria-current='page'] .sui-side-nav-count {
    background: none;
    border: 1px solid color-mix(in srgb, var(--sui-sidebar-active-ink) 40%, transparent);
    color: var(--sui-sidebar-active-ink);
  }

  .sui-side-nav-foot {
    border-block-start: 1px solid var(--sui-sidebar-border);
    padding-block-start: var(--sui-space-3);
  }

  [data-mode='drawer'] .sui-side-nav-row {
    min-block-size: var(--sui-touch-target);
  }

  /* The strip: each row stacks its glyph over a one-line label, the place's names give way,
     and a heading's boundary stays as space. */
  [data-mode='collapsed'] {
    padding-inline: var(--sui-space-1);
  }

  [data-mode='collapsed'] .sui-side-nav-head {
    justify-content: center;
    padding-inline-start: 0;
  }

  [data-mode='collapsed'] :is(.sui-side-nav-names, .sui-side-nav-group) {
    display: none;
  }

  [data-mode='collapsed'] .sui-side-nav-tree {
    margin-inline: calc(-1 * var(--sui-space-1));
    padding-inline: var(--sui-space-1);
  }

  /* The column keeps the strip's width, so a long label is cut instead of widening it. */
  [data-mode='collapsed'] .sui-side-nav-rows {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-mode='collapsed'] .sui-side-nav-rows ~ .sui-side-nav-rows {
    margin-block-start: var(--sui-space-4);
  }

  [data-mode='collapsed'] .sui-side-nav-row {
    flex-direction: column;
    font: 500 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    justify-content: center;
    min-block-size: var(--sui-touch-target);
    padding: 0 var(--sui-space-1);
  }

  [data-mode='collapsed'] .sui-side-nav-row[aria-current='page'] {
    font-weight: 600;
  }

  [data-mode='collapsed'] :is(.sui-side-nav-label, .sui-side-nav-short) {
    flex: none;
    max-inline-size: 100%;
    overflow-x: clip;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-mode='collapsed'] .sui-side-nav-short {
    display: block;
    text-box: trim-both cap alphabetic;
  }

  /* A label replaced by its short form, and a count, leave the strip but are still read. */
  [data-mode='collapsed'] :is(.sui-side-nav-label.replaced, .sui-side-nav-count) {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    text-box: normal;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .gliding .sui-side-nav-thumb,
    .sui-side-nav-row {
      transition: none;
    }

    .sui-side-nav-row:active,
    .sui-side-nav-list:has(.sui-side-nav-row[aria-current='page']:active) .sui-side-nav-thumb {
      translate: none;
    }
  }
</style>
