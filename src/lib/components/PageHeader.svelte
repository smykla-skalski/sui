<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    id,
    eyebrow,
    kicker,
    description,
    level = 1,
    actions,
    class: className = '',
    ...rest
  }: {
    title: string;
    /** The title's id, for a page landmark that points at it with `aria-labelledby`. */
    id?: string;
    /** Where the page is, above its title: a scope and a section, joined by " · ". */
    eyebrow?: string;
    /** Drawn in the eyebrow's place, such as a `Breadcrumb` or a `BackLink`. */
    kicker?: Snippet;
    /** One line saying what the page is for. Not every page owes one. */
    description?: string;
    /** The page title is the page's `h1`. Lower it only to show a header inside a page. */
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    /** The controls that act on the whole page. */
    actions?: Snippet;
    /** Layout for the call site only, never the header's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title' | 'id'> = $props();
</script>

<!--
@component
The top of a page: where it is, what it is called, what it is for, and the controls that
act on it. The copy is one stack (eyebrow, title, description) and the actions are a
second column centred against the whole stack. On a phone the actions move under the copy,
12px below it and packed to the start.

The eyebrow stands 8px of ink above the title and the description 8px below it. The title
is 28px, 24px on a phone, and is the page's one `h1`. The header leaves 24px to the first
surface under it (20px on a phone). A container that already spaces its children with a gap
sets `--sui-head-exit-gap` to that gap, and the header owes only the difference.
-->

<header {...rest} class={['sui-page-header', className]}>
  <div class="sui-page-header-copy">
    {#if kicker}
      {@render kicker()}
    {:else if eyebrow !== undefined}
      <p class="sui-page-header-eyebrow">{eyebrow}</p>
    {/if}
    <svelte:element this={`h${level}`} class="sui-page-header-title" {id}>{title}</svelte:element>
    {#if description !== undefined}
      <p class="sui-page-header-description">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="sui-page-header-actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .sui-page-header {
    align-items: center;
    column-gap: var(--sui-space-3);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    margin: 0 0 calc(var(--sui-rhythm-head-surface-wide) - var(--sui-head-exit-gap, 0px));
    min-inline-size: 0;
    row-gap: var(--sui-rhythm-head-actions-stacked);
  }

  .sui-page-header-copy {
    display: flex;
    flex-direction: column;
    gap: var(--sui-rhythm-head-copy);
    min-inline-size: 0;
  }

  .sui-page-header-eyebrow {
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-page-header-title {
    color: var(--sui-text-primary);
    font: 700 var(--sui-font-size-page-title) / var(--sui-leading-page) var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  .sui-page-header-description {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-body) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-page-header-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-content: flex-end;
  }

  @media (max-width: 47.9375rem) {
    .sui-page-header {
      grid-template-columns: minmax(0, 1fr);
      margin-block-end: calc(
        var(--sui-rhythm-head-surface-compact) - var(--sui-head-exit-gap, 0px)
      );
    }

    .sui-page-header-actions {
      justify-content: flex-start;
    }
  }
</style>
