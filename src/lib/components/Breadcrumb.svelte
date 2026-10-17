<script module lang="ts">
  /** One ancestor on the way back up. */
  export interface BreadcrumbItem {
    label: string;
    href: string;
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';

  let {
    items,
    current,
    label = 'Where this page sits',
    onnavigate,
    class: className = '',
    ...rest
  }: {
    /** The page's ancestors, root first. The page itself is not one of them. */
    items: readonly BreadcrumbItem[];
    /** The name of the page itself, drawn last as text with `aria-current="page"`. */
    current?: string;
    /** The navigation landmark's name. */
    label?: string;
    /** Called when an ancestor is followed, for a router that handles the click itself. */
    onnavigate?: (event: MouseEvent, item: BreadcrumbItem) => void;
    /** Layout for the call site only, never the path's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'aria-label'> = $props();
</script>

<!--
@component
The way back up: hierarchy, not history. A page below its root opens with its ancestors,
each one a link, and the last of them is Up. The browser keeps Back, and the two answer
different questions. A path with one ancestor and no `current` leads with a chevron, so it
reads as Up.

`current` names the page itself as the last item, as text with `aria-current="page"` and
never a link, because a link to the page it sits on goes nowhere. A root page has no
ancestors, and an empty `items` renders nothing rather than an empty strip. Each link bleeds
its hit area into the space around it, so the path takes one cap line of layout and fits the
eyebrow's place in a `PageHeader`.

- Semantics: a `nav` landmark named by `label`, holding an ordered list of links and, last, the page's own name with `aria-current="page"`.
- Content: ancestor labels and the page's name, which wrap at any point; the separators and the Up chevron are hidden from assistive technology.
- States: rest, hover (a row ground), pressed (the pressed row ground), focus (a 2px flush ring) and the current page as plain text.
- Keyboard: Tab moves through the ancestors and Enter follows one; the page's own name is not a stop.
- Pointer and touch: each link is 24px tall on a desktop pointer and 44px on a phone or a coarse pointer, and wrapped lines stand one target apart, so no two hit areas overlap.
- Focus: following a link moves to its page; nothing here moves focus.
- Responsive: the path wraps onto more lines, each line spaced to the target height.
- Accessibility: the links carry their own words, the separators are hidden and the page's own name holds 4.5:1.
- Localization: `label` is a prop with an English default; the path follows the reading direction and the Up chevron mirrors in a right-to-left page.
- Performance: static links with a colour transition only.
- Analytics: `onnavigate(event, item)` reports every followed ancestor.
- Failure: an empty `items` renders nothing, and a page without `current` ends at its nearest ancestor.
-->

{#if items.length > 0}
  <nav {...rest} class={['sui-breadcrumb', className]} aria-label={label}>
    <ol class="sui-breadcrumb-list">
      {#each items as item, index (index)}
        <li class="sui-breadcrumb-item">
          {#if index > 0}
            <span class="sui-breadcrumb-separator" aria-hidden="true">/</span>
          {/if}
          <a
            class="sui-breadcrumb-link"
            href={item.href}
            onclick={(event) => onnavigate?.(event, item)}
          >
            {#if items.length === 1 && !current}<Icon name="chevron-left" size="sm" />{/if}
            <span class="sui-breadcrumb-label">{item.label}</span>
          </a>
        </li>
      {/each}
      {#if current}
        <li class="sui-breadcrumb-item">
          <span class="sui-breadcrumb-separator" aria-hidden="true">/</span>
          <span class="sui-breadcrumb-label sui-breadcrumb-current" aria-current="page"
            >{current}</span
          >
        </li>
      {/if}
    </ol>
  </nav>
{/if}

<style>
  .sui-breadcrumb {
    --sui-local-crumb-target: var(--sui-control-height-chip);
    min-inline-size: 0;
  }

  /* A wrapped line stands one target below the last, so the hit areas of two lines meet
     instead of overlapping. The list is set in the links' face so its cap is theirs. */
  .sui-breadcrumb-list {
    align-items: center;
    column-gap: var(--sui-space-2);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    list-style: none;
    margin: 0;
    padding: 0;
    row-gap: calc(var(--sui-local-crumb-target) - round(up, 1cap, 1px));
  }

  .sui-breadcrumb-item {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-breadcrumb-link {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: inline-flex;
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-1);
    /* The 24px box hands its height back down to the line's rounded cap, the odd pixel at the
       end, so every line is as tall as the row gap counts and wrapped hit areas only meet. */
    --sui-local-crumb-start: round(
      down,
      calc((round(up, 1cap, 1px) - var(--sui-control-height-chip)) / 2),
      1px
    );
    margin-block: var(--sui-local-crumb-start)
      calc(round(up, 1cap, 1px) - var(--sui-control-height-chip) - var(--sui-local-crumb-start));
    margin-inline: calc(var(--sui-space-2) * -1);
    min-block-size: var(--sui-control-height-chip);
    min-inline-size: 0;
    padding-inline: var(--sui-space-2);
    position: relative;
    text-decoration: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  @media (hover: hover) {
    .sui-breadcrumb-link:hover:not(:active) {
      background: var(--sui-row-hover);
      color: var(--sui-text-primary);
    }
  }

  .sui-breadcrumb-link:active {
    background: var(--sui-row-pressed);
    color: var(--sui-text-primary);
  }

  .sui-breadcrumb-link:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-breadcrumb-label {
    block-size: var(--sui-block-snap);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-breadcrumb-current {
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-flat)
      var(--sui-sans);
    min-inline-size: 0;
  }

  .sui-breadcrumb-separator {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-flat)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  /* A finger needs 44px, so the hit area grows past the drawn box without moving the path. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-breadcrumb {
      --sui-local-crumb-target: var(--sui-touch-target);
    }

    .sui-breadcrumb-link::after {
      content: '';
      inset-block: calc((100% - var(--sui-touch-target)) / 2);
      inset-inline: 0;
      position: absolute;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-breadcrumb-link {
      transition: none;
    }
  }
</style>
