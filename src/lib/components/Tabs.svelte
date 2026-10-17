<script module lang="ts">
  export type TabItem = {
    href: string;
    label: string;
    /** A count beside the label, such as the open items behind the tab. */
    count?: number | string;
  };
</script>

<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    label,
    items,
    current,
    class: className = '',
    ...rest
  }: {
    /** Names the navigation for assistive technology, such as "Repository". It is never drawn. */
    label: string;
    items: readonly TabItem[];
    /** The `href` of the page being shown. Its tab wears the underline and `aria-current`. */
    current?: string;
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'children' | 'aria-label'> = $props();

  /* A row short of room may start with the current tab out of sight, which is the one tab a
     reader looks for. Keyed to `current` so a new page reveals its tab again. Jumped, never
     scrolled smoothly, so nothing slides into the first paint. */
  function revealCurrent(_current: string | undefined): Attachment<HTMLUListElement> {
    return (track) => {
      const tab = track.querySelector('[aria-current="page"]');
      if (!tab) return;
      const box = tab.getBoundingClientRect();
      const own = track.getBoundingClientRect();
      if (box.left < own.left) track.scrollLeft += box.left - own.left;
      else if (box.right > own.right) track.scrollLeft += box.right - own.right;
    };
  }
</script>

<!--
@component
Text tabs for moving between the pages of one place, such as a repository's overview, runs
and settings. Each tab is a link, so it opens in a new tab, survives a reload and works
without script. The current one wears a 2px brand underline and `aria-current="page"`. A
count rides its label in tabular figures.

For exclusive views inside one page, which swap content without changing the address, reach
for `SegmentedControl` instead. A row short of room scrolls inside its own track, with a thin
scrollbar for a mouse without a wheel, and never widens the page. The current tab is brought
into view, and keyboard focus scrolls the tab it reaches into view, with the ring inset so
the track never clips it.
-->

<nav {...rest} class={['sui-tabs', className]} aria-label={label}>
  <ul class="sui-tabs-track" {@attach revealCurrent(current)}>
    {#each items as item (item.href)}
      <li class="sui-tabs-item">
        <a
          class="sui-tabs-tab"
          href={item.href}
          aria-current={item.href === current ? 'page' : undefined}
        >
          <span class="sui-tabs-label">{item.label}</span>
          {#if item.count !== undefined}
            <span class="sui-tabs-count"><span>{item.count}</span></span>
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .sui-tabs {
    min-inline-size: 0;
  }

  .sui-tabs-track {
    border-block-end: 1px solid var(--sui-border-divider);
    display: flex;
    gap: var(--sui-space-4);
    list-style: none;
    margin: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0;
    scrollbar-width: thin;
  }

  .sui-tabs-item {
    display: flex;
    flex: none;
  }

  .sui-tabs-tab {
    align-items: center;
    block-size: var(--sui-control-height-compact);
    border-block-end: 2px solid transparent;
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: flex;
    font: 600 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-2);
    padding-block-start: 2px;
    text-decoration: none;
    transition:
      color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  .sui-tabs-tab:hover:not([aria-current='page']) {
    border-block-end-color: var(--sui-control-border);
    color: var(--sui-text-primary);
  }

  .sui-tabs-tab[aria-current='page'] {
    border-block-end-color: var(--sui-brand-action);
    color: var(--sui-text-primary);
  }

  .sui-tabs-tab:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-tabs-label {
    text-box: trim-both cap alphabetic;
  }

  .sui-tabs-count {
    background: var(--sui-interactive-hover-layer);
    border-radius: var(--sui-radius-chip);
    color: var(--sui-text-secondary);
    display: inline-grid;
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    font-variant-numeric: tabular-nums;
    min-inline-size: var(--sui-space-4);
    padding: var(--sui-space-1);
    place-items: center;
  }

  .sui-tabs-count > span {
    text-box: trim-both cap alphabetic;
  }

  [aria-current='page'] .sui-tabs-count {
    background: var(--sui-brand-action-tint);
    color: var(--sui-brand-action-text);
  }

  @media (max-width: 47.9375rem) {
    .sui-tabs-tab {
      block-size: var(--sui-touch-target);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-tabs-tab {
      transition: none;
    }
  }
</style>
