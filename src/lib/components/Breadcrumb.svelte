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
    label = 'Where this page sits',
    class: className = '',
    ...rest
  }: {
    /** The page's ancestors, root first. The page itself is not one of them. */
    items: readonly BreadcrumbItem[];
    /** The navigation landmark's name. */
    label?: string;
    /** Layout for the call site only, never the path's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'aria-label'> = $props();
</script>

<!--
@component
The way back up: hierarchy, not history. A page below its root opens with its ancestors,
each one a link, and the last of them is Up. The browser keeps Back, and the two answer
different questions. A path with one ancestor leads with a chevron, so it reads as Up.

The current page is not in the path, because a link to the page it sits on goes nowhere. A
root page has no ancestors, and an empty `items` renders nothing rather than an empty
strip. Each link bleeds its 24px hit area into the space around it, so the path takes one
cap line of layout and fits the eyebrow's place in a `PageHeader`.
-->

{#if items.length > 0}
  <nav {...rest} class={['sui-breadcrumb', className]} aria-label={label}>
    <ol class="sui-breadcrumb-list">
      {#each items as item, index (index)}
        <li class="sui-breadcrumb-item">
          {#if index > 0}
            <span class="sui-breadcrumb-separator" aria-hidden="true">/</span>
          {/if}
          <a class="sui-breadcrumb-link" href={item.href}>
            {#if items.length === 1}<Icon name="chevron-left" size="sm" />{/if}
            <span class="sui-breadcrumb-label">{item.label}</span>
          </a>
        </li>
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .sui-breadcrumb {
    min-inline-size: 0;
  }

  .sui-breadcrumb-list {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
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
    font: 500 var(--sui-font-size-meta) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    margin: calc((1cap - var(--sui-control-height-chip)) / 2) calc(var(--sui-space-2) * -1);
    min-block-size: var(--sui-control-height-chip);
    min-inline-size: 0;
    padding-inline: var(--sui-space-2);
    text-decoration: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-breadcrumb-link:hover:not(:active) {
    background: var(--sui-row-hover);
    color: var(--sui-text-primary);
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
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-breadcrumb-separator {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-flat) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-breadcrumb-link {
      transition: none;
    }
  }
</style>
