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
  import { mark, word } from '../words.js';
  import { tick, untrack, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Count from '../internal/Count.svelte';
  import { formatCount } from '../internal/locale.js';
  import { followsInPlace, getShell } from '../internal/shell.svelte.js';
  import IconButton from './IconButton.svelte';
  import Tooltip from './Tooltip.svelte';

  let {
    title,
    kicker,
    sections,
    current,
    label,
    pagesLabel = word('SideNav.pagesLabel', (title: string) => `${title} pages`),
    level = 2,
    closeLabel = word('SideNav.closeLabel', 'Close navigation'),
    collapseLabel = word('SideNav.collapseLabel', 'Collapse'),
    expandLabel = word('SideNav.expandLabel', 'Expand'),
    countLabel = word(
      'SideNav.countLabel',
      (count: number) => `${formatCount(count)} ${count === 1 ? 'item' : 'items'}`
    ),
    countedName = word(
      'SideNav.countedName',
      (label: string, count: string) => `${label}${mark('comma')}${count}`
    ),
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
    /** Names the page list from `title` when `label` is not given. */
    pagesLabel?: (title: string) => string;
    /** The title's heading level; section headings sit one level below it. */
    level?: 2 | 3 | 4 | 5;
    /** Names the button that closes the phone drawer. */
    closeLabel?: string;
    /** The fold control's word while the sidebar is whole. */
    collapseLabel?: string;
    /** The fold control's word while the sidebar is a strip. */
    expandLabel?: string;
    /** The words a row's count is read as, after its label. */
    countLabel?: (count: number) => string;
    /** A counted row's accessible name from its label and `countLabel`, in the language's order. */
    countedName?: (label: string, count: string) => string;
    /** Quiet content at the bottom, such as the account. */
    foot?: Snippet;
    /** Called when a row is followed, for a router that handles the click itself. */
    onnavigate?: (event: MouseEvent, item: NavItem) => void;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & HTMLAttributes<HTMLDivElement> = $props();

  const shell = getShell();
  const mode = $derived(shell?.mode ?? 'full');
  const folds = $derived(shell !== undefined && mode !== 'drawer' && shell.foldable);
  const uid = $props.id();

  let tree = $state<HTMLElement | null>(null);
  let fold = $state<HTMLButtonElement | null>(null);
  let thumb = $state({ x: 0, y: 0, width: 0, height: 0 });
  let measured = $state(false);
  let gliding = $state(false);
  const rows = $state<Record<string, HTMLAnchorElement | null>>({});

  /** Lays the selection plate under the current row, measured rather than guessed. */
  function measure() {
    const row = current ? rows[current] : null;
    // A closed drawer draws no rows, so its plate lands afresh when the drawer opens.
    if (!tree || !row || row.getClientRects().length === 0) {
      measured = false;
      gliding = false;
      return;
    }
    // Client rects, because offsets round to whole pixels and the plate must sit exactly on the
    // row. The plate stands at the list's start corner, which is its right in a right-to-left page.
    const list = tree.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const rtl = getComputedStyle(tree).direction === 'rtl';
    thumb = {
      x: rtl ? box.right - list.right : box.left - list.left,
      y: box.top - list.top,
      width: box.width,
      height: box.height
    };
    if (!measured) {
      measured = true;
      // The first placement is not a change, so the plate only glides after it has landed.
      requestAnimationFrame(() => requestAnimationFrame(() => (gliding = true)));
    }
  }

  // The plate's own state stays out of the effect's reach, so a measure from the observer never
  // rebuilds the observer inside its own delivery.
  $effect(() => {
    void current;
    void mode;
    if (!tree) return;
    untrack(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(tree);
    for (const row of Object.values(rows)) if (row) observer.observe(row);
    return () => observer.disconnect();
  });

  /* The fold control leaves when the shell grows too narrow to fold. If it held focus, the
     current page's row takes it, so focus never falls to the page. */
  $effect.pre(() => {
    if (folds || !fold || document.activeElement !== fold) return;
    void tick().then(() => (rows[current ?? ''] ?? Object.values(rows)[0])?.focus());
  });

  function follow(event: MouseEvent, item: NavItem) {
    onnavigate?.(event, item);
    if (mode === 'drawer' && followsInPlace(event)) shell?.closeDrawer();
  }
</script>

<!--
@component
The pages of one place, as rows under section headings: the second level of navigation, where
a `Rail` chooses the place and this chooses the page. Every row is a destination with its own
icon and address, and a heading is only a label.

Current is drawn the same way in every navigation list: the words carry it. Rest rows are
muted and the page on screen is primary ink, a step of 3:1 or more in lightness, on a quiet
plate that only supports it. Both keep one weight, so turning current never rewraps a label or
changes a row's height. Under forced colors the plate is `Highlight` and its words `HighlightText`. The plate is measured
from the current row, does not slide on first paint, and glides to the next row when the page
changes. Until it is measured the row paints its own plate.

Inside an `AppShell` wide enough to fold, a Collapse control at the end of the list folds it
into a strip where each row is an icon over a short label, and Expand brings it back. A
tooltip with the full name shows only where `short` replaces a label, and a count is still
read aloud. In the phone drawer a close button takes the head's end, rows are 44px, and
following a row closes the drawer.

- Semantics: a `nav` landmark named "<title> pages" by default, the title a heading at `level`, each section a list labelled by its own heading one level below, and every row a link with `aria-current="page"` on the current one.
- Content: a title and optional kicker, sections of rows with a glyph, a label, an optional `short` label and an optional count, and an optional `foot`.
- States: rest, hover, pressed (the pressed ground, an inset shadow and a 1px sink), focus (a 2px inset ring) and current (primary ink on the quiet plate, in the rest rows' weight, so it moves nothing); labels wrap rather than being cut.
- Keyboard: Tab moves through the rows, then the fold or close control; Enter follows a row or presses the control.
- Pointer and touch: rows are 34px on a desktop pointer and 44px in the drawer and the strip; the close and fold controls are 34px and 44px there, and nothing needs a gesture.
- Focus: folding keeps focus on the control; a fold control that leaves as the shell narrows hands focus to the current row, and a row followed in the drawer closes it with focus returned to the menu button.
- Responsive: the row list scrolls inside the column, a long label wraps, the strip stacks each glyph over its short label, and the fold control shows only where the shell can fold.
- Accessibility: a count is read with its words from `countLabel`, joined to the label by `countedName`, every ink holds 4.5:1 on its ground, the current ink stands 3:1 from the rest ink in lightness, so it is never hue alone (WCAG 1.4.1), and a heading names each group for heading navigation.
- Localization: `label`, `closeLabel`, `collapseLabel`, `expandLabel` and `countLabel` are props with English defaults; counts follow the page language, the plate is measured from the start edge and the fold glyphs mirror in a right-to-left page.
- Performance: one resize observer measures the plate, which glides with a transform; it suits a sidebar of tens of rows, not thousands.
- Analytics: `onnavigate(event, item)` reports every followed row; the shell's `oncollapsedchange` reports the fold.
- Failure: a `current` that matches no row draws no plate, an empty section draws only its heading, and an empty `sections` leaves the title and its controls.
-->

<div {...rest} class={['sui-side-nav', className]} data-mode={mode}>
  <div class="sui-side-nav-head">
    <div class="sui-side-nav-names">
      {#if kicker}<p class="sui-side-nav-kicker">{kicker}</p>{/if}
      <svelte:element this={`h${level}`} class="sui-side-nav-title">{title}</svelte:element>
    </div>
    {#if shell && mode === 'drawer'}
      <IconButton toolbar icon="close" label={closeLabel} onclick={() => shell.closeDrawer()} />
    {/if}
  </div>

  <nav class="sui-side-nav-tree" aria-label={label ?? pagesLabel(title)}>
    <div bind:this={tree} class={['sui-side-nav-list', { measured, gliding }]}>
      <span
        class="sui-side-nav-thumb"
        aria-hidden="true"
        style:--sui-thumb-x="{thumb.x}px"
        style:--sui-thumb-y="{thumb.y}px"
        style:--sui-thumb-width="{thumb.width}px"
        style:--sui-thumb-height="{thumb.height}px"
      ></span>
      {#each sections as section, index (section.label ?? index)}
        {#if section.label}
          <svelte:element this={`h${level + 1}`} id="{uid}-{index}" class="sui-side-nav-group"
            >{section.label}</svelte:element
          >
        {/if}
        <ul
          class="sui-side-nav-rows"
          aria-labelledby={section.label ? `${uid}-${index}` : undefined}
        >
          {#each section.items as item (item.href)}
            {@const tip = item.short !== undefined && item.short !== item.label}
            <li>
              <a
                bind:this={rows[item.href]}
                href={item.href}
                aria-label={item.count === undefined
                  ? undefined
                  : countedName(item.label, countLabel(item.count))}
                class="sui-side-nav-row"
                aria-current={item.href === current ? 'page' : undefined}
                onclick={(event) => follow(event, item)}
              >
                <span class="sui-side-nav-glyph"><Icon name={item.icon} size="base" /></span>
                <span class={['sui-side-nav-label', { replaced: item.short }]}>{item.label}</span>
                {#if item.short}
                  <span class="sui-side-nav-short" aria-hidden="true">{item.short}</span>
                {/if}
                {#if item.count !== undefined}
                  <span class="sui-side-nav-count" aria-hidden="true"
                    ><Count value={formatCount(item.count)} /></span
                  >
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

  {#if folds && shell}
    <button
      bind:this={fold}
      type="button"
      class="sui-side-nav-row sui-side-nav-fold"
      onclick={() => shell.toggleCollapsed()}
    >
      <span class="sui-side-nav-glyph"
        ><Icon
          name={mode === 'collapsed' ? 'sidebar-expand' : 'sidebar-collapse'}
          size="base"
        /></span
      >
      <span class="sui-side-nav-label">{mode === 'collapsed' ? expandLabel : collapseLabel}</span>
    </button>
  {/if}

  {#if foot}
    <div class="sui-side-nav-foot">{@render foot()}</div>
  {/if}
</div>

<style>
  /* The row's one-line box, computed in the row's font and handed down, so a part in another
     font, such as the count, can centre on the first line too. */
  @property --sui-local-line {
    syntax: '<length>';
    inherits: true;
    initial-value: 0px;
  }

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
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-sidebar-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-side-nav-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
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
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-sidebar-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.07em;
    margin: var(--sui-space-5) var(--sui-space-3) var(--sui-space-2);
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-side-nav-thumb + .sui-side-nav-group {
    margin-block-start: 0;
  }

  /* The quiet plate under the current row. It supports the row's ink, which carries the
     state, so it needs no ring or edge. */
  .sui-side-nav-thumb {
    background: var(--sui-sidebar-active-bg);
    block-size: var(--sui-thumb-height);
    border-radius: var(--sui-radius-control);
    box-shadow: var(--sui-sidebar-thumb-shadow);
    box-sizing: border-box;
    display: none;
    inline-size: var(--sui-thumb-width);
    inset-block-start: 0;
    inset-inline-start: 0;
    pointer-events: none;
    position: absolute;
    transform: translate(var(--sui-thumb-x), var(--sui-thumb-y));
  }

  .measured .sui-side-nav-thumb {
    display: block;
  }

  .gliding .sui-side-nav-thumb {
    transition:
      transform var(--sui-duration-travel) var(--sui-ease-travel),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-side-nav-list:has(.sui-side-nav-row[aria-current='page']:active) .sui-side-nav-thumb {
    box-shadow: var(--sui-sidebar-pressed-inset), var(--sui-sidebar-thumb-shadow-pressed);
    translate: 0 1px;
  }

  /* The row hangs its parts from the top, padded so a one-line row is exactly its height with
     the words on its middle; a glyph and a count centre on the first line, so a label that
     wraps keeps them beside its first line (L-94). */
  .sui-side-nav-row {
    --sui-local-row: var(--sui-control-height-compact);
    --sui-local-line: round(up, 1cap, 2px);
    align-items: start;
    background: transparent;
    border: 0;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-sidebar-text-muted);
    cursor: pointer;
    display: flex;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
    inline-size: 100%;
    margin: 0;
    min-block-size: var(--sui-local-row);
    padding: calc((var(--sui-local-row) - var(--sui-local-line)) / 2) var(--sui-space-3);
    position: relative;
    text-align: start;
    text-decoration: none;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  @media (hover: hover) {
    .sui-side-nav-row:hover:not(:active, [aria-current='page']) {
      background: var(--sui-sidebar-item-hover);
      color: var(--sui-sidebar-text-secondary);
    }
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
  }

  /* Until the plate is measured the current row paints its own, so the first frame is right. */
  .sui-side-nav-list:not(.measured) .sui-side-nav-row[aria-current='page'] {
    background: var(--sui-sidebar-active-bg);
  }

  .measured .sui-side-nav-row[aria-current='page'],
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
    margin-block: calc((var(--sui-local-line) - var(--sui-icon-base)) / 2);
  }

  .sui-side-nav-label {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    flex: 1;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-side-nav-short {
    display: none;
  }

  /* The count keeps the sidebar's own inks, and the current row's. Its ground is a veil a step
     past a pressed row, so it stands apart from every ground a row takes, hover included. */
  /* In the count's own font, so its cap is the count's: the count is its digits' even box and
     a space on each side, centred on the row's first line. */
  .sui-side-nav-count {
    --sui-local-count-ground: var(--sui-row-pressed);
    --sui-local-count-ink: var(--sui-sidebar-text-secondary);
    display: flex;
    flex: none;
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-flat)
      var(--sui-sans);
    margin-block: calc((var(--sui-local-line) - round(up, 1cap, 2px) - 2 * var(--sui-space-1)) / 2);
  }

  .sui-side-nav-row[aria-current='page'] .sui-side-nav-count {
    --sui-local-count-ink: var(--sui-sidebar-active-ink);
  }

  .sui-side-nav-foot {
    border-block-start: var(--sui-stroke) solid var(--sui-sidebar-border);
    padding-block-start: var(--sui-space-3);
  }

  [data-mode='drawer'] .sui-side-nav-row {
    --sui-local-row: var(--sui-touch-target);
  }

  /* The strip: each row stacks its glyph over a label that wraps rather than being cut, the
     place's names give way, and a heading's boundary stays as space. */
  [data-mode='collapsed'] {
    padding-inline: var(--sui-space-1);
  }

  [data-mode='collapsed'] .sui-side-nav-head {
    display: none;
  }

  [data-mode='collapsed'] .sui-side-nav-group {
    display: none;
  }

  [data-mode='collapsed'] .sui-side-nav-tree {
    margin-inline: calc(-1 * var(--sui-space-1));
    padding-inline: var(--sui-space-1);
  }

  /* The column keeps the strip's width, so a long label wraps instead of widening it. */
  [data-mode='collapsed'] .sui-side-nav-rows {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-mode='collapsed'] .sui-side-nav-rows ~ .sui-side-nav-rows {
    margin-block-start: var(--sui-space-4);
  }

  [data-mode='collapsed'] .sui-side-nav-row {
    align-items: center;
    flex-direction: column;
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    gap: var(--sui-space-1);
    justify-content: center;
    min-block-size: var(--sui-touch-target);
    padding: var(--sui-space-1);
    text-align: center;
  }

  [data-mode='collapsed'] .sui-side-nav-glyph {
    margin-block: 0;
  }

  /* A word too long for the strip breaks at a hyphen where the page's language allows. */
  [data-mode='collapsed'] :is(.sui-side-nav-label, .sui-side-nav-short) {
    flex: none;
    hyphens: auto;
    max-inline-size: 100%;
    overflow-wrap: break-word;
  }

  [data-mode='collapsed'] .sui-side-nav-short {
    align-content: center;
    block-size: var(--sui-block-snap);
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

  /* Forced colors keep system colors, so the plate and its words survive the mode. */
  @media (forced-colors: active) {
    .sui-side-nav-thumb,
    .sui-side-nav-list:not(.measured) .sui-side-nav-row[aria-current='page'] {
      background-color: Highlight;
    }

    .sui-side-nav-row[aria-current='page'] {
      color: HighlightText;
    }
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
