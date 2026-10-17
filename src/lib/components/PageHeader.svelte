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
second column centred against the whole stack. Where the header itself leaves the copy less
than 20rem, as on a phone or in a narrow pane, the actions move under the copy, 12px below it
and packed to the start.

The eyebrow stands 8px of ink above the title and the description 8px below it. The title
is 28px, 24px on a phone, and is the page's one `h1`. The description stops at about 65
characters a line. The header leaves 24px to the first surface under it (20px on a phone). A
container that already spaces its children with a gap sets `--sui-head-exit-gap` to that
gap, and the header owes only the difference.

- Semantics: a `header` holding the title as a heading at `level` (the page's `h1` by default), with `id` for a landmark that points at it.
- Content: a title, an optional eyebrow or a `kicker` such as a `Breadcrumb` or `BackLink` in its place, an optional one-line description and optional actions.
- States: none of its own; the controls in `actions` draw theirs.
- Keyboard: none of its own; Tab reaches the kicker's links and the actions in reading order.
- Pointer and touch: none of its own; the actions keep their own targets.
- Focus: nothing here moves focus.
- Responsive: the header answers to its own width, so the actions wrap under the copy, packed to the start, once the copy would have under 20rem; the title balances its lines and the copy wraps.
- Accessibility: the title is a real heading and the copy holds 4.5:1; the eyebrow is uppercase only for its few words.
- Localization: it draws no words of its own; the actions pack to the start, which mirrors in a right-to-left page.
- Performance: static text with no script.
- Analytics: none of its own, because it holds no control; its actions report their own outcomes.
- Failure: without a description or an eyebrow the stack is the title alone, and an empty eyebrow keeps its line.
-->

<header {...rest} class={['sui-page-header', className]}>
  <div class="sui-page-header-layout">
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
  </div>
</header>

<style>
  .sui-page-header {
    margin: 0 0 calc(var(--sui-rhythm-head-surface) - var(--sui-head-exit-gap, 0px));
    min-inline-size: 0;
  }

  /* The header answers to its own width: the actions stand beside the copy while both fit,
     and wrap under it, at the start edge, once the copy would fall under 20rem, the room a
     title of a few words needs. */
  .sui-page-header-layout {
    align-items: center;
    column-gap: var(--sui-space-3);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    row-gap: var(--sui-rhythm-head-actions-stacked);
  }

  .sui-page-header-copy {
    block-size: var(--sui-block-snap-even);
    display: flex;
    flex: 1 1 20rem;
    flex-direction: column;
    gap: var(--sui-rhythm-head-copy);
    min-inline-size: 0;
  }

  .sui-page-header-eyebrow {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-page-header-title {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-bold) var(--sui-font-size-page-title) / var(--sui-leading-page)
      var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  .sui-page-header-description {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    max-inline-size: 65ch;
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-page-header-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }
</style>
