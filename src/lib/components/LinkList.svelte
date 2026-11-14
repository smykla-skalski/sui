<script module lang="ts">
  export type LinkListItem = {
    href: string;
    /** Words that say where the link goes. */
    label: string;
    /** One quiet line under the link, read as its description. */
    note?: string;
    /** Marks a link that leaves the product. Defaults to true for an absolute http(s) address. */
    external?: boolean;
  };
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Link from './Link.svelte';

  let {
    links,
    class: className = '',
    ...rest
  }: {
    links: readonly LinkListItem[];
    class?: HTMLAttributes<HTMLUListElement>['class'];
  } & Omit<HTMLAttributes<HTMLUListElement>, 'children'> = $props();

  const id = $props.id();
</script>

<!--
@component
Links to other pages about the same thing, such as a pane's "Related" list: one `Link` per
item, each with an optional quiet note under it. A list of things a page is about, with
standings and controls, is an `ObjectList`, and the way back is `BackLink`.

The list hangs from the heading above it, with no bullets, so its words stand on the
heading's edge. Each link stands one target's height plus 4px under the one before, so their
grown hit areas never meet, and on a phone one 44px target under it, the areas edge to edge,
so the list keeps a row's pitch; a note stands one copy gap under its link.

- Semantics: a `ul` with `role="list"`, so Safari keeps the list once its bullets are gone; each item is a native link, described by its note.
- Content: a label per link, an optional one-line note that wraps when long, and whether it leaves the product.
- States: none of its own; each `Link` draws its rest, hover, focus and pressed states, and an external one its arrow.
- Keyboard: Tab walks the links in order and Enter follows one.
- Pointer and touch: every link is `standalone`, so its hit area grows to 24px, and 44px on a phone or a touch screen, and the links stand far enough apart that the areas never meet.
- Focus: nothing here moves focus.
- Responsive: a long label or note wraps at its own edge; on a phone or a touch screen the links step one 44px touch target apart, a row's hairline between them, so they read as rows.
- Accessibility: a screen reader hears a list with its count; each note is the link's description, and an external link says "(opens another site)" after it; name the list with `aria-labelledby` when the page holds more than one.
- Localization: no words of its own beyond the labels and notes; `Link` carries the external note; the list starts at the inline start and the arrow mirrors in a right-to-left page.
- Performance: one link per item, with no script.
- Analytics: none of its own; each link is a plain `a`, so the page's navigation tracking hears it.
- Failure: with no links it draws nothing, so leave its heading out too or say so in one quiet sentence.
-->

{#if links.length > 0}
  <ul role="list" {...rest} class={['sui-link-list', className]}>
    {#each links as link, index (index)}
      <li class="sui-link-list-item">
        <span class="sui-link-list-link"
          ><Link
            href={link.href}
            external={link.external}
            standalone
            aria-describedby={link.note ? `${id}-${index}` : undefined}>{link.label}</Link
          ></span
        >
        {#if link.note}
          <span class="sui-link-list-note" id="{id}-{index}">{link.note}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .sui-link-list {
    --sui-local-link-target: var(--sui-field-target-min);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    list-style: none;
    margin: 0;
    min-inline-size: 0;
    padding: 0;
    row-gap: calc(var(--sui-local-link-target) - round(up, 1cap, 2px) + var(--sui-space-1));
  }

  .sui-link-list-item {
    display: grid;
    min-inline-size: 0;
    row-gap: var(--sui-row-copy-gap);
  }

  .sui-link-list-link,
  .sui-link-list-note {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .sui-link-list-note {
    color: var(--sui-text-muted);
    max-inline-size: var(--sui-measure);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  /* On a phone the links step one 44px target apart, their hit areas edge to edge, so the
     list keeps a row's pitch and no gap reads as a missing link. The area rounds out from an
     odd line box to 45px, so the step is a pixel past the target and the areas never overlap. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-link-list {
      --sui-local-link-target: var(--sui-touch-target);
      --sui-local-link-step: calc(var(--sui-touch-target) + 1px - round(up, 1cap, 2px));
      row-gap: var(--sui-local-link-step);
    }

    /* At a row's pitch the links read as rows, so a row's hairline parts them, as it parts a
       property list's rows, on a whole pixel in the step between them. A border, so it still
       draws under forced colors. */
    .sui-link-list-item + .sui-link-list-item {
      position: relative;
    }

    .sui-link-list-item + .sui-link-list-item::before {
      border-block-start: var(--sui-row-hairline) solid var(--sui-border-divider);
      content: '';
      inset-block-start: calc(-1 * round(down, var(--sui-local-link-step) / 2, 1px));
      inset-inline: 0;
      position: absolute;
    }
  }
</style>
