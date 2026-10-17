<script module lang="ts">
  /** One entry: the id of the section it names, and the words it is named by. */
  export interface TocEntry {
    id: string;
    label: string;
    /** A heading the entry is listed under. Consecutive entries with one group share it. */
    group?: string;
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    entries,
    title = 'On this page',
    level = 2,
    offset,
    onnavigate,
    class: className = '',
    ...rest
  }: {
    entries: readonly TocEntry[];
    /** The column's own label and the landmark's name. Not one of the entries. */
    title?: string;
    /** The title's heading level; group headings sit one level below it. */
    level?: 2 | 3 | 4 | 5;
    /** The height of a bar that sticks above the page, which the index sticks under. */
    offset?: string;
    /** Called when an entry is followed. */
    onnavigate?: (event: MouseEvent, entry: TocEntry) => void;
    /** Layout for the call site only, never the index's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title'> = $props();

  let here = $state<string | null>(null);
  let nav = $state<HTMLElement | null>(null);
  const links = $state<Record<string, HTMLAnchorElement | null>>({});

  const groups = $derived(
    entries.reduce<{ label?: string; items: TocEntry[] }[]>((list, entry) => {
      const last = list.at(-1);
      if (last && last.label === entry.group) last.items.push(entry);
      else list.push({ label: entry.group, items: [entry] });
      return list;
    }, [])
  );

  // A long index scrolls inside itself; the current entry is kept one row clear of the
  // visible edges without scrolling the page, which scrollIntoView would also do. The
  // visible part is measured on screen, because the index may reach past the viewport
  // before it sticks.
  $effect(() => {
    const link = here ? links[here] : null;
    if (!nav || !link) return;
    const box = nav.getBoundingClientRect();
    const row = link.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(nav).scrollPaddingBlockStart) || 0;
    const top = Math.max(box.top, 0) + pad + row.height;
    const bottom = Math.min(box.bottom, innerHeight) - pad - row.height;
    if (row.top < top) nav.scrollTop -= top - row.top;
    else if (row.bottom > bottom) nav.scrollTop += row.bottom - bottom;
  });

  /** The box the sections scroll in: a pane that scrolls them, or the page. */
  function scroller(section: HTMLElement): HTMLElement | null {
    const page = document.documentElement;
    for (
      let node = section.parentElement;
      node && node !== document.body && node !== page;
      node = node.parentElement
    ) {
      if (
        /auto|scroll/.test(getComputedStyle(node).overflowY) &&
        node.scrollHeight > node.clientHeight + 1
      )
        return node;
    }
    return null;
  }

  /** The reader's place: the last section whose top has crossed the top quarter of its scroller. */
  function mark(): void {
    const sections = entries
      .map((entry) => document.getElementById(entry.id))
      .filter(
        (section): section is HTMLElement => section !== null && section.getClientRects().length > 0
      );
    const first = sections[0];
    if (!first) return;
    const pane = scroller(first);
    const page = document.documentElement;
    const [scrolled, seen, whole] = pane
      ? [pane.scrollTop, pane.clientHeight, pane.scrollHeight]
      : [window.scrollY, window.innerHeight, page.scrollHeight];
    if (scrolled + seen >= whole - 1 && scrolled > 1) {
      here = sections.at(-1)?.id ?? null;
      return;
    }
    const line = (pane ? pane.getBoundingClientRect().top : 0) + seen / 4;
    let found = first.id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) found = section.id;
    }
    here = found;
  }

  function reveal(id: string): HTMLElement | null {
    const section = document.getElementById(id);
    for (let node = section?.parentElement; node; node = node.parentElement) {
      if (node instanceof HTMLDetailsElement) node.open = true;
    }
    return section;
  }

  /** Moves focus to the section's heading, or the section, so the next Tab starts there. */
  function land(section: HTMLElement): void {
    const target = section.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? section;
    if (!target.hasAttribute('tabindex')) {
      target.tabIndex = -1;
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
  }

  function follow(event: MouseEvent, entry: TocEntry): void {
    onnavigate?.(event, entry);
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const section = reveal(entry.id);
    if (!section) return;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      event.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', `#${entry.id}`);
      here = entry.id;
    }
    land(section);
  }

  function arrive(): void {
    const id = decodeURIComponent(location.hash.slice(1));
    if (entries.some((entry) => entry.id === id)) {
      reveal(id);
      here = id;
    } else mark();
  }

  // Scroll events do not bubble, so one listener in the capture phase hears the page and any
  // pane the sections scroll in, and the reading line is found once a frame.
  $effect(() => {
    void entries;
    let frame = 0;
    const onscroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(mark);
    };
    addEventListener('scroll', onscroll, { capture: true, passive: true });
    arrive();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', onscroll, { capture: true });
    };
  });
</script>

<svelte:window onhashchange={arrive} />

<!--
@component
The index beside a long page: where its sections are, and which one the reader is in. The
entries are fragment links. Following one opens any native disclosure that holds its
section. When the reader allows motion the index scrolls there smoothly and records the hash
itself, and otherwise the browser follows the link as it would any other. Either way focus
moves to the section's first heading, or to the section, so the next Tab starts there.

The current entry wears the current mark every navigation list shares: the neutral selection
plate inside a `--sui-border-strong` ring, which holds 3:1, with semibold primary ink, and
`Highlight` under forced colors. It is announced with `aria-current="location"`. It follows
the URL hash on arrival, then the last section whose top has crossed the top quarter of the
box the sections scroll in, the page or a pane, and the last section once that box is
scrolled to its end. The index sticks to the top of the viewport inside whatever column it
is given, or under a sticky bar as tall as `offset`, and fills the height below, padding its
own top and bottom, so a long index scrolls out at that edge. Placing it beside the content,
or leaving it out on a phone, is the page's layout.

- Semantics: a `nav` landmark named by `title`, with the title as a heading at `level`, group headings one level below, and lists of fragment links, the current one with `aria-current="location"`.
- Content: entries with an id and a label that wraps, optionally grouped under a heading.
- States: rest, hover (a row ground), pressed (the pressed ground and an inset shadow), focus (a 2px inset ring) and current (the plate inside its ring, semibold).
- Keyboard: Tab moves through the entries and Enter follows one, moving focus to the section's heading.
- Pointer and touch: entries are 28px tall on a desktop pointer and 44px on a phone or a coarse pointer, across the column's width.
- Focus: following an entry moves focus to its section's first heading, or the section, which takes a temporary `tabindex`.
- Responsive: the index sticks and scrolls inside itself, keeping the current entry in view; the page decides where it stands.
- Accessibility: the current entry is announced, its ring holds 3:1 and every entry's ink 4.5:1.
- Localization: `title` is a prop with an English default; the entries follow the reading direction.
- Performance: one capture listener reads the sections' places once a frame while anything scrolls; it suits tens of sections.
- Analytics: `onnavigate(event, entry)` reports every followed entry.
- Failure: an entry whose section is missing or hidden is never current and its link still works as a fragment link; an empty `entries` draws only the title.
-->

<nav
  bind:this={nav}
  {...rest}
  class={['sui-page-toc', className]}
  style:--sui-local-toc-offset={offset}
  aria-label={title}
>
  <svelte:element this={`h${level}`} class="sui-page-toc-title">{title}</svelte:element>
  {#each groups as group, index (group.label ?? index)}
    {#if group.label}<svelte:element this={`h${level + 1}`} class="sui-page-toc-group"
        >{group.label}</svelte:element
      >{/if}
    <ul class="sui-page-toc-list">
      {#each group.items as entry (entry.id)}
        <li>
          <a
            bind:this={links[entry.id]}
            class="sui-page-toc-link"
            href="#{entry.id}"
            aria-current={here === entry.id ? 'location' : undefined}
            onclick={(event) => follow(event, entry)}
            ><span class="sui-page-toc-label">{entry.label}</span></a
          >
        </li>
      {/each}
    </ul>
  {/each}
</nav>

<style>
  /* The index sticks to the viewport's top, or under the page's bar, and fills the height
     below it, padding its own scroll area, so entries leave at that edge and never get cut
     at a line in the middle of the page. */
  .sui-page-toc {
    align-self: start;
    box-sizing: border-box;
    inset-block-start: var(--sui-local-toc-offset, 0px);
    max-block-size: calc(100dvh - var(--sui-local-toc-offset, 0px));
    min-inline-size: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-block: var(--sui-space-6);
    position: sticky;
    scroll-padding-block: var(--sui-space-6);
    scrollbar-width: thin;
  }

  .sui-page-toc-title + .sui-page-toc-group {
    margin-block-start: var(--sui-space-4);
  }

  .sui-page-toc-group {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    margin: var(--sui-space-5) 0 var(--sui-space-2);
    text-box: trim-both cap alphabetic;
  }

  .sui-page-toc-title {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.06em;
    margin: 0 0 var(--sui-space-2);
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-page-toc-list {
    display: grid;
    gap: var(--sui-space-1);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .sui-page-toc-link {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-muted);
    display: flex;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    min-block-size: var(--sui-tier-quiet);
    overflow-wrap: anywhere;
    padding: var(--sui-space-1) var(--sui-space-3);
    position: relative;
    text-decoration: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  @media (hover: hover) {
    .sui-page-toc-link:hover:not(:active, [aria-current='location']) {
      background: var(--sui-row-hover);
      color: var(--sui-text-primary);
    }
  }

  .sui-page-toc-link:active {
    background: var(--sui-row-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-text-primary);
  }

  .sui-page-toc-link:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-page-toc-label {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  /* The current mark every navigation list shares: the selection plate inside a ring that holds
     3:1, on all four sides so it is never an edge strip, laid over the row so it moves nothing. */
  .sui-page-toc-link[aria-current='location'] {
    background: var(--sui-surface-inset);
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
  }

  .sui-page-toc-link[aria-current='location']::before {
    border: var(--sui-stroke) solid var(--sui-border-strong);
    border-radius: inherit;
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-page-toc-link {
      min-block-size: var(--sui-touch-target);
    }
  }

  @media (forced-colors: active) {
    .sui-page-toc-link[aria-current='location']::before {
      border: var(--sui-stroke-bold) solid Highlight;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-page-toc-link {
      transition: none;
    }
  }
</style>
