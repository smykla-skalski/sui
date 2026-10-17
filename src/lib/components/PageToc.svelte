<script module lang="ts">
  /** One entry: the id of the section it names, and the words it is named by. */
  export interface TocEntry {
    id: string;
    label: string;
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    entries,
    title = 'On this page',
    class: className = '',
    ...rest
  }: {
    entries: readonly TocEntry[];
    /** The column's own label and the landmark's name. Not one of the entries. */
    title?: string;
    /** Layout for the call site only, never the index's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title'> = $props();

  let here = $state<string | null>(null);

  /** The reader's place: the last section whose top has crossed the reading line. */
  function mark(): void {
    const sections = entries
      .map((entry) => document.getElementById(entry.id))
      .filter(
        (section): section is HTMLElement => section !== null && section.getClientRects().length > 0
      );
    const first = sections[0];
    if (!first) return;
    const root = document.documentElement;
    if (window.scrollY + window.innerHeight >= root.scrollHeight - 1 && window.scrollY > 1) {
      here = sections.at(-1)?.id ?? null;
      return;
    }
    const line = window.innerHeight / 4;
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

  function follow(event: MouseEvent, id: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const section = reveal(id);
    if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', `#${id}`);
    here = id;
  }

  function arrive(): void {
    const id = decodeURIComponent(location.hash.slice(1));
    if (entries.some((entry) => entry.id === id)) {
      reveal(id);
      here = id;
    } else mark();
  }

  $effect(() => {
    // The band is the top quarter of the viewport: a section is current once its top
    // crosses it, and the observer says when that might have changed.
    const observer = new IntersectionObserver(mark, { rootMargin: '0px 0px -75% 0px' });
    for (const entry of entries) {
      const section = document.getElementById(entry.id);
      if (section) observer.observe(section);
    }
    arrive();
    return () => observer.disconnect();
  });
</script>

<svelte:window onhashchange={arrive} onscrollend={mark} />

<!--
@component
The index beside a long page: where its sections are, and which one the reader is in. The
entries are fragment links. Following one opens any native disclosure that holds its
section. When the reader allows motion the index scrolls there smoothly and records the hash
itself, and otherwise the browser follows the link as it would any other.

The current entry turns its rule to the brand ink and is announced with
`aria-current="location"`. It follows the URL hash on arrival, then the last section whose
top has crossed the top quarter of the viewport, and the last section once the page is
scrolled to its end. The index is sticky inside whatever column it is given, and placing it
beside the content, or leaving it out on a phone, is the page's layout.
-->

<nav {...rest} class={['sui-page-toc', className]} aria-label={title}>
  <p class="sui-page-toc-title">{title}</p>
  <ul class="sui-page-toc-list">
    {#each entries as entry (entry.id)}
      <li>
        <a
          class="sui-page-toc-link"
          href="#{entry.id}"
          aria-current={here === entry.id ? 'location' : undefined}
          onclick={(event) => follow(event, entry.id)}
          ><span class="sui-page-toc-label">{entry.label}</span></a
        >
      </li>
    {/each}
  </ul>
</nav>

<style>
  .sui-page-toc {
    align-self: start;
    inset-block-start: var(--sui-rhythm-pane-top-wide);
    min-inline-size: 0;
    position: sticky;
  }

  .sui-page-toc-title {
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-sans);
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
    border-inline-start: 2px solid var(--sui-border-subtle);
    border-end-end-radius: var(--sui-radius-chip);
    border-start-end-radius: var(--sui-radius-chip);
    box-sizing: border-box;
    color: var(--sui-text-muted);
    display: flex;
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-sans);
    min-block-size: var(--sui-tier-quiet);
    overflow-wrap: anywhere;
    padding: var(--sui-space-1) var(--sui-space-3);
    text-decoration: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-page-toc-link:hover {
    background: var(--sui-row-hover);
    color: var(--sui-text-primary);
  }

  .sui-page-toc-link:active {
    background: var(--sui-row-pressed);
  }

  .sui-page-toc-link:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-page-toc-label {
    text-box: trim-both cap alphabetic;
  }

  /* The reader's place, not a choice they made: said with the rule and the ink, never
     with a filled ground. */
  .sui-page-toc-link[aria-current='location'] {
    border-inline-start-color: var(--sui-brand-action);
    color: var(--sui-text-primary);
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-page-toc-link {
      transition: none;
    }
  }
</style>
