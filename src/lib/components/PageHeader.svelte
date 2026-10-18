<script lang="ts">
  import type { Snippet } from 'svelte';
  import FactLine from './FactLine.svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    id,
    eyebrow,
    kicker,
    description,
    level = 1,
    status,
    facts,
    actions,
    tabs,
    class: className = '',
    ...rest
  }: {
    title: string;
    /** The title's id, for a page landmark that points at it with `aria-labelledby`. */
    id?: string;
    /** Where the page is, above its title, such as a scope and a section, parted by a drawn dot. */
    eyebrow?: string | readonly string[];
    /** Drawn in the eyebrow's place, such as a `Breadcrumb` or a `BackLink`. */
    kicker?: Snippet;
    /** One line saying what the page is for. Not every page owes one. */
    description?: string;
    /** The page title is the page's `h1`. Lower it only to show a header inside a page. */
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    /**
     * The thing's state in words beside the title, such as a `Pill`, said in a polite status
     * region when it changes. Pass it from the first render.
     */
    status?: Snippet;
    /** Two to five headline facts under the description, as an inline `FactList`. */
    facts?: Snippet;
    /** The controls that act on the whole page. */
    actions?: Snippet;
    /** The page's views, such as `Tabs`, at the band's foot, so their line is where the view starts. */
    tabs?: Snippet;
    /** Layout for the call site only, never the header's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title' | 'id'> = $props();
</script>

<!--
@component
The top of a page: where it is, what it is called, its state, what it is for, its headline
facts, and the controls that act on it. The copy is one stack (eyebrow, title, description,
facts) and the actions are a second column centred against the whole stack. Where the header itself leaves the copy less
than 20rem, as on a phone or in a narrow pane, the actions move under the copy, 12px below it
and packed to the start.

The title is 28px on 32px lines, 24px on 28px lines on a phone, and is the page's one `h1`.
The eyebrow stands 8px of ink above it. The description stands one 8px copy gap further below
the title than the title's own lines stand apart, 19px of ink (18px on a phone), so a title
that wraps reads as one block and the description as the next. The gap follows the title's
line height, so it holds when a reader raises line spacing. The description stops at about 65
characters a line.

A `status` says the thing's state in words beside the title, such as a `Pill`: it takes the
title's face, so it centres on the cap band of the title's first line, and a title too long
to share its line with it puts it under its last line, as far below as the title's lines
stand apart plus the 8px copy gap. It sits in a polite status region that is there from the
first render, so a change of state is said once, without moving focus, and a render that
leaves it alone says nothing. `facts` are two to five headline facts, an inline `FactList`,
one copy gap further below the description than its own lines stand apart, measured to the
words, so the band's gutter also reaches their ink.

The header is a band of the surface ground over the page's canvas, and its foot is one
hairline (`--sui-border-band`) the band's full width, so the view under it starts on a clean
cut, as a page's body starts below a toolbar, and the cut still shows where the band and the
page share one ground. Place it flush with the top and sides of the page's content area: the
band pads by the pane gutter on every side, the inset the page gives its content, so its words
line up with the view's. A page whose column sits inside a wider band sets
`--sui-local-head-inset` to its column's inset. With `tabs`, the tabs' own line is the foot, so
one boundary draws one line (L-109): the header runs their row to the band's edges in the
band's line colour, with the first tab on the copy's start, and the current tab's bar sits on
the foot. The header leaves 24px from its foot to the view's first ink (20px on a phone). A
container that already spaces its children with a gap sets `--sui-head-exit-gap` to that gap,
and the header owes only the difference.

- Semantics: a `header` holding the title as a heading at `level` (the page's `h1` by default), with `id` for a landmark that points at it.
- Content: a title, an optional eyebrow or a `kicker` such as a `Breadcrumb` or `BackLink` in its place, an optional `status` in words, an optional one-line description, optional inline `facts`, optional actions and optional `tabs` at its foot.
- States: none of its own; `status` says the thing's state in its own words, and the controls in `actions` draw theirs.
- Keyboard: none of its own; Tab reaches the kicker's links and the actions in reading order.
- Pointer and touch: none of its own; the actions keep their own targets.
- Focus: nothing here moves focus.
- Responsive: the header answers to its own width, so the actions wrap under the copy, packed to the start, once the copy would have under 20rem; the title balances its lines, the status moves under a title that leaves it no room, as on a phone, and the copy and the facts wrap.
- Accessibility: the title is a real heading and the copy holds 4.5:1 on the band; the status is a `role="status"` region, so a change is announced politely and never as part of the heading; the eyebrow is uppercase only for its few words; the foot's hairline is a border, so under forced colors, where the band and the page share one ground, it draws in the system's line colour.
- Localization: it draws no words of its own; the actions pack to the start, which mirrors in a right-to-left page.
- Performance: static text with no script.
- Analytics: none of its own, because it holds no control; its actions report their own outcomes.
- Failure: without a description or an eyebrow the stack is the title alone, and an empty eyebrow keeps its line; a status passed only after the first render may not be read, so render it from the start, even as a loading word.
-->

{#snippet heading()}
  <svelte:element this={`h${level}`} class="sui-page-header-title" {id}>{title}</svelte:element>
{/snippet}

<header {...rest} class={['sui-page-header', className, { tabbed: tabs !== undefined }]}>
  <div class="sui-page-header-layout">
    <div class="sui-page-header-copy">
      {#if kicker}
        {@render kicker()}
      {:else if eyebrow !== undefined}
        <p class="sui-page-header-eyebrow">
          {#if typeof eyebrow === 'string'}{eyebrow}{:else}<FactLine
              >{#each eyebrow as part, index (index)}<span>{part}</span>{/each}</FactLine
            >{/if}
        </p>
      {/if}
      {#if status}
        <div class="sui-page-header-heading">
          {@render heading()}
          <div class="sui-page-header-status" role="status">{@render status()}</div>
        </div>
      {:else}
        {@render heading()}
      {/if}
      {#if description !== undefined}
        <p class="sui-page-header-description">{description}</p>
      {/if}
      {#if facts}
        <div class="sui-page-header-facts">{@render facts()}</div>
      {/if}
    </div>
    {#if actions}
      <div class="sui-page-header-actions">{@render actions()}</div>
    {/if}
  </div>
  {#if tabs}
    <div class="sui-page-header-tabs">{@render tabs()}</div>
  {/if}
</header>

<style>
  .sui-page-header {
    background: var(--sui-surface-base);
    margin: 0 0 calc(var(--sui-rhythm-head-surface) - var(--sui-head-exit-gap, 0px));
    min-inline-size: 0;
    padding: var(--sui-rhythm-pane-gutter)
      var(--sui-local-head-inset, var(--sui-rhythm-pane-gutter));
  }

  /* One line at the foot, the band's full width, where the band meets the view, whatever the
     two grounds are. With tabs, their own line is the foot: the row runs to the band's edges,
     its first tab still on the copy's start, so the current tab's bar sits on the foot. */
  .sui-page-header:not(.tabbed) {
    border-block-end: var(--sui-stroke) solid var(--sui-border-band);
  }

  .tabbed {
    padding-block-end: 0;
  }

  .sui-page-header-tabs {
    --sui-local-tabs-inset: var(--sui-local-head-inset, var(--sui-rhythm-pane-gutter));
    --sui-local-tabs-line: var(--sui-border-band);
    margin-block-start: var(--sui-rhythm-head-surface);
    margin-inline: calc(-1 * var(--sui-local-head-inset, var(--sui-rhythm-pane-gutter)));
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
    align-content: center;
    block-size: var(--sui-block-snap-even);
    display: flex;
    flex: 1 1 20rem;
    flex-direction: column;
    gap: var(--sui-rhythm-head-copy);
    min-inline-size: 0;
  }

  /* The even height only centres the copy on the actions; alone, the spare pixel would sit
     under the last line and leave the band's foot a pixel further than its top. */
  .sui-page-header-copy:only-child {
    block-size: var(--sui-block-snap);
  }

  .sui-page-header-eyebrow {
    align-content: center;
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
    align-content: center;
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

  /* Proximity: a wrapped title's lines stand 1lh - 1cap apart in ink, so the description stands
     that far plus the copy gap, and the title reads as one block. Taken from the title's own
     line height, it still holds when a reader sets line height to 1.5 (WCAG 1.4.12). */
  .sui-page-header-title:has(+ :is(.sui-page-header-description, .sui-page-header-facts)),
  .sui-page-header-heading:has(+ :is(.sui-page-header-description, .sui-page-header-facts)) {
    margin-block-end: round(calc(1lh - 1cap), 1px);
  }

  /* In the title's face, so `1cap` and `1lh` are the title's: the status's seat is the cap
     band of the title's first line, and the title takes that band's even parity, so a pill
     centres on it to the pixel and the row is no taller than the title (L-34). A status the
     line cannot hold goes under the title's last line as the description would, one copy gap
     further than the title's lines stand apart. */
  .sui-page-header-heading {
    align-items: start;
    column-gap: var(--sui-space-3);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-bold) var(--sui-font-size-page-title) / var(--sui-leading-page)
      var(--sui-sans);
    min-inline-size: 0;
    row-gap: calc(round(calc(1lh - 1cap), 1px) + var(--sui-row-copy-gap));
  }

  .sui-page-header-heading > .sui-page-header-title {
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
  }

  .sui-page-header-status {
    align-items: center;
    block-size: round(up, 1cap, 2px);
    display: flex;
    flex: none;
    gap: var(--sui-space-2);
  }

  /* The facts stand one copy gap further below the description than its lines stand apart.
     A `FactList` trims its lines to its words, so the gap and the band's gutter reach their
     ink. */
  .sui-page-header-facts {
    min-inline-size: 0;
  }

  .sui-page-header-description + .sui-page-header-facts {
    margin-block-start: var(--sui-row-copy-gap);
  }

  .sui-page-header-description {
    align-content: center;
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

  /* In a shell as narrow as a phone, as on a wide screen's split pane, the header takes the
     phone's title and spacing by the shell's own width, as the shell's bars do. */
  @container sui-shell (max-width: 47.9375rem) {
    .sui-page-header {
      margin-block-end: calc(
        var(--sui-rhythm-head-surface-compact) - var(--sui-head-exit-gap, 0px)
      );
    }

    .sui-page-header-title,
    .sui-page-header-heading {
      font: var(--sui-weight-bold) var(--sui-font-size-page-title-compact) /
        var(--sui-leading-page-compact) var(--sui-sans);
    }
  }
</style>
