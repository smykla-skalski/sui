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
  import { mark, word } from '../words.js';

  let {
    label,
    items,
    current,
    countedName = word(
      'Tabs.countedName',
      (label: string, count: string) => `${label}${mark('space')}${count}`
    ),
    onnavigate,
    class: className = '',
    ...rest
  }: {
    /** Names the navigation for assistive technology, such as "Repository". It is never drawn. */
    label: string;
    items: readonly TabItem[];
    /** The `href` of the page being shown. Its tab wears the current plate and `aria-current`. */
    current?: string;
    /** A counted tab's accessible name from its label and its count, in the language's order. */
    countedName?: (label: string, count: string) => string;
    /** Called when a tab is followed, for a router that handles the click itself. */
    onnavigate?: (event: MouseEvent, item: TabItem) => void;
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'children' | 'aria-label'> = $props();

  const counted = (count: number | string) =>
    typeof count === 'number' ? formatCount(count) : count;

  /* A row short of room may start with the current tab out of sight, which is the one tab a
     reader looks for. Keyed to `current` so a new page reveals its tab again. Jumped, never
     scrolled smoothly, so nothing slides into the first paint, and kept clear of the row's
     scroll padding so the edge fade never covers it. */
  function revealCurrent(_current: string | undefined): Attachment<HTMLElement> {
    return (row) => {
      const tab = row.querySelector('[aria-current="page"]');
      if (!tab) return;
      const pad = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0;
      const box = tab.getBoundingClientRect();
      const own = row.getBoundingClientRect();
      if (box.left < own.left + pad) row.scrollLeft += box.left - own.left - pad;
      else if (box.right > own.right - pad) row.scrollLeft += box.right - own.right + pad;
    };
  }
</script>

<!--
@component
Text tabs for moving between the pages of one place, such as a repository's overview, runs
and settings. Each tab is a link, so it opens in a new tab, survives a reload and works
without script. For exclusive views inside one page, which swap content without changing the
address, reach for `SegmentedControl` instead.

The current tab stands on a 2px accent bar under its label and count, which covers the
track's line and holds 3:1 on the page, with primary ink at semibold and `aria-current="page"`.
The other tabs are muted at the regular weight, as in `SideNav`, `Rail` and `PageToc`, so the
words tell the current tab apart as well as the bar, never colour alone, and the bar is
`Highlight` under forced colors. Each label keeps the room its semibold form needs, so the row
never shifts when the current tab changes. A count rides its label in tabular figures.

A row short of room scrolls inside itself and never widens the page. The edge that has more
tabs past it fades, the track's line with it, so the reader can see the row goes on, and a thin
scrollbar stays for a mouse without a wheel, in room kept under the line so it never covers
the tabs. The current tab is brought into view clear of the fade,
and keyboard focus scrolls the tab it reaches into view, with the ring inset so the track
never clips it.

- Semantics: a `nav` landmark named by `label`, holding a list of links with `aria-current="page"` on the current one.
- Content: a short label per tab and an optional count; a label never wraps, so a long set scrolls.
- States: rest (muted ink, regular weight), hover (a row ground and secondary ink), pressed (the pressed ground and an inset shadow, with no sink, so the bar stays on the line), focus (a 2px inset ring) and current (the accent bar, primary ink and semibold).
- Keyboard: Tab moves through the tabs as links and Enter follows one; they are links, so there are no arrow keys.
- Pointer and touch: tabs are 34px tall in a 42px track on a desktop pointer and 44 by 44px at least on a phone or a coarse pointer; the track scrolls by wheel, scrollbar, swipe or keyboard focus.
- Focus: following a tab moves to its page, where the page decides focus; focus on a tab out of view scrolls it into view.
- Responsive: the track scrolls sideways, fades the edge with more tabs past it, and reveals the current tab on arrival.
- Accessibility: the current bar holds 3:1 on the page, every ink 4.5:1, and the current ink stands 3:1 from the rest ink with a heavier weight; the counts are read with their labels.
- Localization: the tabs follow the reading direction, so the fades and the scroll mirror in a right-to-left page, and a numeric count follows the page language's digits and grouping.
- Performance: plain links with no measuring beyond one reveal per current page; only colour and the ground transition, and the fade runs on a scroll timeline.
- Analytics: `onnavigate(event, item)` reports every followed tab.
- Failure: an empty `items` draws an empty track, and a `current` that matches no tab draws no bar.
-->

<nav {...rest} class={['sui-tabs', className]} aria-label={label} {@attach revealCurrent(current)}>
  <ul class="sui-tabs-track">
    {#each items as item (item.href)}
      <li class="sui-tabs-item">
        <a
          class="sui-tabs-tab"
          href={item.href}
          aria-current={item.href === current ? 'page' : undefined}
          aria-label={item.count === undefined
            ? undefined
            : countedName(item.label, counted(item.count))}
          onclick={(event) => onnavigate?.(event, item)}
        >
          <span class="sui-tabs-label" data-label={item.label}><span>{item.label}</span></span>
          {#if item.count !== undefined}
            <Count value={counted(item.count)} />
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</nav>

<style>
  /* The nav scrolls and the track scrolls inside it with its line, so the line fades with the
     tabs at an edge that has more past it. Each fade is its own mask layer sized one fade past
     the nav, so sliding a layer by that much shows or hides its fade. The scroll timeline
     slides them: the start fade shows once the row has left its start, and the end fade hides
     once it reaches its end. A row that does not scroll has no timeline, and both fades stay
     hidden. */
  .sui-tabs {
    --sui-local-tabs-fade: var(--sui-space-8);
    container-type: scroll-state;
    min-inline-size: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-padding-inline: var(--sui-local-tabs-fade);
    scrollbar-width: thin;
  }

  @supports (animation-timeline: scroll()) {
    .sui-tabs {
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

    .sui-tabs:dir(rtl) {
      animation-name: sui-tabs-fade-rtl;
    }
  }

  /* The track is as wide as its tabs or the nav, whichever is wider, so its line runs the whole
     row. */
  .sui-tabs-track {
    border-block-end: var(--sui-stroke) solid var(--sui-border-subtle);
    box-sizing: border-box;
    display: flex;
    gap: var(--sui-space-2);
    inline-size: max-content;
    list-style: none;
    margin: 0;
    min-inline-size: 100%;
    padding: var(--sui-space-1) 0 0;
  }

  /* A row that scrolls keeps room under its line, so the scrollbar never covers the tabs. */
  @container scroll-state(scrollable: inline) {
    .sui-tabs-track {
      margin-block-end: var(--sui-space-3);
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

  /* The tab's ground stands as far above the line as the track's top is above the tab, and
     the bar fills the foot of that room, so it covers the line. */
  .sui-tabs-tab {
    align-items: center;
    block-size: var(--sui-control-height-compact);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-muted);
    display: flex;
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-2);
    justify-content: center;
    margin-block-end: var(--sui-space-1);
    padding-inline: var(--sui-space-2);
    position: relative;
    text-decoration: none;
    transition: box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  .sui-tabs-tab::after {
    block-size: var(--sui-stroke-bold);
    border-start-end-radius: var(--sui-radius-pill);
    border-start-start-radius: var(--sui-radius-pill);
    content: '';
    inset-block-end: calc(-1 * (var(--sui-space-1) + var(--sui-stroke)));
    inset-inline: var(--sui-space-2);
    pointer-events: none;
    position: absolute;
  }

  @media (hover: hover) {
    .sui-tabs-tab:hover:not(:active, [aria-current='page']) {
      background: var(--sui-row-hover);
      color: var(--sui-text-secondary);
    }
  }

  /* No sink: the tab has no frame of its own, and the bar stays on the line (L-42). */
  .sui-tabs-tab:active {
    background: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  .sui-tabs-tab[aria-current='page'] {
    --sui-local-count-ink: var(--sui-text-primary);
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
  }

  .sui-tabs-tab[aria-current='page']::after {
    background: var(--sui-brand-action);
  }

  .sui-tabs-tab:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* A hidden semibold copy shares the words' cell, so a tab already holds the room the current
     weight needs and the row never shifts (L-91). */
  .sui-tabs-label {
    align-content: center;
    block-size: var(--sui-block-snap);
    display: grid;
  }

  .sui-tabs-label > span,
  .sui-tabs-label::after {
    align-content: center;
    block-size: var(--sui-block-snap);
    grid-area: 1 / 1;
    text-box: trim-both cap alphabetic;
  }

  .sui-tabs-label::after {
    content: attr(data-label) / '';
    font-weight: var(--sui-weight-semibold);
    visibility: hidden;
  }

  /* A finger needs 44 by 44px, so a short label's tab widens to it. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-tabs-track {
      padding-block-start: 0;
    }

    .sui-tabs-tab {
      block-size: var(--sui-touch-target);
      margin-block-end: 0;
      min-inline-size: var(--sui-touch-target);
    }

    .sui-tabs-tab::after {
      inset-block-end: calc(-1 * var(--sui-stroke));
    }
  }

  @media (forced-colors: active) {
    .sui-tabs-tab[aria-current='page']::after {
      background-color: Highlight;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-tabs-tab {
      transition: none;
    }
  }
</style>
