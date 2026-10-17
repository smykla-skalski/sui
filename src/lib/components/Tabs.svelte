<script module lang="ts">
  export type TabItem = {
    href: string;
    label: string;
    /** A count beside the label, such as the open items behind the tab. A number follows the page language. */
    count?: number | string;
  };
</script>

<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import Count from '../internal/Count.svelte';
  import { formatCount } from '../internal/locale.js';

  let {
    label,
    items,
    current,
    onnavigate,
    class: className = '',
    ...rest
  }: {
    /** Names the navigation for assistive technology, such as "Repository". It is never drawn. */
    label: string;
    items: readonly TabItem[];
    /** The `href` of the page being shown. Its tab wears the current plate and `aria-current`. */
    current?: string;
    /** Called when a tab is followed, for a router that handles the click itself. */
    onnavigate?: (event: MouseEvent, item: TabItem) => void;
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'children' | 'aria-label'> = $props();

  /* A row short of room may start with the current tab out of sight, which is the one tab a
     reader looks for. Keyed to `current` so a new page reveals its tab again. Jumped, never
     scrolled smoothly, so nothing slides into the first paint, and kept clear of the track's
     scroll padding so the edge fade never covers it. */
  function revealCurrent(_current: string | undefined): Attachment<HTMLUListElement> {
    return (track) => {
      const tab = track.querySelector('[aria-current="page"]');
      if (!tab) return;
      const pad = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
      const box = tab.getBoundingClientRect();
      const own = track.getBoundingClientRect();
      if (box.left < own.left + pad) track.scrollLeft += box.left - own.left - pad;
      else if (box.right > own.right - pad) track.scrollLeft += box.right - own.right + pad;
    };
  }
</script>

<!--
@component
Text tabs for moving between the pages of one place, such as a repository's overview, runs
and settings. Each tab is a link, so it opens in a new tab, survives a reload and works
without script. For exclusive views inside one page, which swap content without changing the
address, reach for `SegmentedControl` instead.

The current tab wears the plate inside a 3:1 ring, primary ink and `aria-current="page"`: the
same current mark `SideNav`, `Rail` and `PageToc` draw, never colour alone, and `Highlight`
under forced colors. A choice in a control, such as a segmented thumb or a checked box, is
the brand fill instead, so where the reader is and what they chose never look alike. A count rides
its label in tabular figures.

A row short of room scrolls inside its own track and never widens the page. The edge that
has more tabs past it fades, so the reader can see the row goes on, and a thin scrollbar
stays for a mouse without a wheel. The current tab is brought into view clear of the fade,
and keyboard focus scrolls the tab it reaches into view, with the ring inset so the track
never clips it.

- Semantics: a `nav` landmark named by `label`, holding a list of links with `aria-current="page"` on the current one.
- Content: a short label per tab and an optional count; a label never wraps, so a long set scrolls.
- States: rest, hover (a row ground and primary ink), pressed (the pressed ground, an inset shadow and a 1px sink), focus (a 2px inset ring) and current (the plate inside its 3:1 ring, the mark every navigation list shares, and primary ink).
- Keyboard: Tab moves through the tabs as links and Enter follows one; they are links, so there are no arrow keys.
- Pointer and touch: tabs are 34px tall on a desktop pointer and 44 by 44px at least on a phone or a coarse pointer; the track scrolls by wheel, scrollbar, swipe or keyboard focus.
- Focus: following a tab moves to its page, where the page decides focus; focus on a tab out of view scrolls it into view.
- Responsive: the track scrolls sideways, fades the edge with more tabs past it, and reveals the current tab on arrival.
- Accessibility: the current ring holds 3:1 and its ink 4.5:1, and the counts are read with their labels.
- Localization: the tabs follow the reading direction, so the fades and the scroll mirror in a right-to-left page, and a numeric count follows the page language's digits and grouping.
- Performance: plain links with no measuring beyond one reveal per current page; only colour, the ground and the 1px press transition, and the fade runs on a scroll timeline.
- Analytics: `onnavigate(event, item)` reports every followed tab.
- Failure: an empty `items` draws an empty track, and a `current` that matches no tab draws no plate.
-->

<nav {...rest} class={['sui-tabs', className]} aria-label={label}>
  <ul class="sui-tabs-track" {@attach revealCurrent(current)}>
    {#each items as item (item.href)}
      <li class="sui-tabs-item">
        <a
          class="sui-tabs-tab"
          href={item.href}
          aria-current={item.href === current ? 'page' : undefined}
          onclick={(event) => onnavigate?.(event, item)}
        >
          <span class="sui-tabs-label">{item.label}</span>
          {#if item.count !== undefined}
            <Count value={typeof item.count === 'number' ? formatCount(item.count) : item.count} />
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

  /* Each fade is its own mask layer sized one fade past the track, so sliding a layer by that
     much shows or hides its fade. The scroll timeline slides them: the start fade shows once
     the row has left its start, and the end fade hides once it reaches its end. A track that
     does not scroll has no timeline, and both fades stay hidden. */
  .sui-tabs-track {
    --sui-local-tabs-fade: var(--sui-space-8);
    border-block-end: var(--sui-stroke) solid var(--sui-border-divider);
    display: flex;
    gap: var(--sui-space-4);
    list-style: none;
    margin: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0;
    scroll-padding-inline: var(--sui-local-tabs-fade);
    scrollbar-width: thin;
  }

  @supports (animation-timeline: scroll()) {
    .sui-tabs-track {
      animation: sui-tabs-fade var(--sui-ease-linear) both;
      animation-timeline: scroll(self inline);
      -webkit-mask-image:
        linear-gradient(to right, transparent, var(--sui-canvas) var(--sui-local-tabs-fade)),
        linear-gradient(to left, transparent, var(--sui-canvas) var(--sui-local-tabs-fade));
      mask-image:
        linear-gradient(to right, transparent, var(--sui-canvas) var(--sui-local-tabs-fade)),
        linear-gradient(to left, transparent, var(--sui-canvas) var(--sui-local-tabs-fade));
      -webkit-mask-composite: source-in;
      mask-composite: intersect;
      mask-position:
        100% 0,
        0 0;
      mask-repeat: no-repeat;
      mask-size: calc(100% + var(--sui-local-tabs-fade)) 100%;
    }

    .sui-tabs-track:dir(rtl) {
      animation-name: sui-tabs-fade-rtl;
    }
  }

  @keyframes sui-tabs-fade {
    0% {
      mask-position:
        100% 0,
        100% 0;
    }

    4%,
    96% {
      mask-position:
        0 0,
        100% 0;
    }

    100% {
      mask-position:
        0 0,
        0 0;
    }
  }

  /* In a right-to-left page the row starts at the right, so the left fade shows first. */
  @keyframes sui-tabs-fade-rtl {
    0% {
      mask-position:
        0 0,
        0 0;
    }

    4%,
    96% {
      mask-position:
        0 0,
        100% 0;
    }

    100% {
      mask-position:
        100% 0,
        100% 0;
    }
  }

  .sui-tabs-item {
    display: flex;
    flex: none;
  }

  .sui-tabs-tab {
    align-items: center;
    block-size: var(--sui-control-height-compact);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: flex;
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-2);
    justify-content: center;
    padding-inline: var(--sui-space-3);
    position: relative;
    text-decoration: none;
    transition:
      color var(--sui-duration-fast) var(--sui-ease-standard),
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  @media (hover: hover) {
    .sui-tabs-tab:hover:not(:active, [aria-current='page']) {
      background: var(--sui-row-hover);
      color: var(--sui-text-primary);
    }
  }

  .sui-tabs-tab:active {
    background: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-text-primary);
    translate: 0 1px;
  }

  /* The current mark every navigation list shares: the selection plate inside a ring that holds
     3:1, on all four sides, laid over the tab so it moves nothing. */
  .sui-tabs-tab[aria-current='page'] {
    --sui-local-count-ink: var(--sui-text-primary);
    background: var(--sui-surface-inset);
    color: var(--sui-text-primary);
  }

  .sui-tabs-tab[aria-current='page']::before {
    border: var(--sui-stroke) solid var(--sui-border-strong);
    border-radius: inherit;
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  .sui-tabs-tab:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-tabs-label {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  /* A finger needs 44 by 44px, so a short label's tab widens to it. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-tabs-tab {
      block-size: var(--sui-touch-target);
      min-inline-size: var(--sui-touch-target);
    }
  }

  @media (forced-colors: active) {
    .sui-tabs-tab[aria-current='page']::before {
      border: var(--sui-stroke-bold) solid Highlight;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-tabs-tab {
      transition: none;
    }

    .sui-tabs-tab:active {
      translate: none;
    }
  }
</style>
