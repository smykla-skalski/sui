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
facts) and the actions stand 24px beside it, centred on the cap band of the title's first line
as a card's head controls are, so they lend the copy no height. Once the header itself is
36rem wide or narrower, as in a narrow pane, and on a phone, the actions move under the copy,
12px below it and packed to the start, and tabs under them stand 16px further down, so the
page's views never read as more of its actions.

The title is 32px on 36px lines at -0.022em, 24px on 28px lines at a dialog title's -0.015em on a
phone or once the header itself is 36rem wide or narrower, and is the page's one `h1`. A wide
title balances its lines, and a compact one fills its narrow column and only keeps its last
word from standing alone.
The eyebrow, 12px uppercase at 600, stands 8px of ink above it, and a `Breadcrumb` or `BackLink` 16px, so its hover
veil stands 9px clear of the title. The description stands one 8px copy gap further below
the title than the title's own lines stand apart, 19px of ink (18px on a phone), so a title
that wraps reads as one block and the description as the next. The gap follows the title's
line height, so it holds when a reader raises line spacing. The description stops at about 65
characters a line and wraps at 20px leading, 22px on a phone, as a dialog's does (L-24).

A `status` says the thing's state in words beside the title, such as a `Pill`: it takes the
title's face, so it centres on the cap band of the title's first line, and a pill there takes
control type on a 24px mark, a step up from a pill in a row, and a title too long
to share its line with it puts it 12px under its last line, nearer
than the description, since it is part of the heading. It sits in a polite status region that is there from the
first render, so a change of state is said once, without moving focus, and a render that
leaves it alone says nothing. `facts` are two to five headline facts, an inline `FactList`,
24px of ink under the description, further than the description stands under the title, so
they read as a group of their own and never as one more line of the description, and the
band's gutter also reaches their ink.

The header is a band of the surface ground over the page's canvas, and its foot is one
hairline (`--sui-border-band`) the band's full width, painted over `--sui-border-band-ground`
where a holder sets one, as the shell does so the foot meets its sidebar's edge in one ink, so the view under it starts on a clean
cut, as a page's body starts below a toolbar, and the cut still shows where the band and the
page share one ground. Place it flush with the top and sides of the page's content area: the
band pads by the pane gutter on every side, 24px and 16px on a phone, the inset the page gives its content, so its words
line up with the view's. A page whose column sits inside a wider band sets
`--sui-local-head-inset` to its column's inset. With `tabs`, the tabs' own line is the foot, so
one boundary draws one line (L-109): the header runs their row to the band's edges in the
band's line colour, with the first tab's words and bar on the copy's start and its veil
reaching 8px past them, as a breadcrumb's does, and the current tab's bar sits on the foot. The header leaves 24px from its foot to the view's first ink (20px on a phone). A
container that already spaces its children with a gap sets `--sui-head-exit-gap` to that gap,
and the header owes only the difference. A holder that hides the kicker at some width sets
`--sui-head-kicker-shown: 0` there, so the title stands at the top with the actions beside it.

- Semantics: a `header` holding the title as a heading at `level` (the page's `h1` by default), with `id` for a landmark that points at it.
- Content: a title, an optional eyebrow or a `kicker` such as a `Breadcrumb` or `BackLink` in its place, an optional `status` in words, an optional one-line description, optional inline `facts`, optional actions and optional `tabs` at its foot.
- States: none of its own; `status` says the thing's state in its own words, and the controls in `actions` draw theirs.
- Keyboard: none of its own; Tab reaches the kicker's links and the actions in reading order.
- Pointer and touch: none of its own; the actions keep their own targets.
- Focus: nothing here moves focus; a script may move focus to the title as a reading position, after a navigation or from a `ListDetail`, and since it is not a control it draws no ring.
- Responsive: the header answers to its own width, so the title takes the phone's size at 36rem or narrower, the actions wrap under the copy, packed to the start, at that width too; the title balances its lines, the status moves under a title that leaves it no room, as on a phone, and the copy and the facts wrap.
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
  <div
    class={[
      'sui-page-header-layout',
      { led: kicker !== undefined || eyebrow !== undefined, kicked: kicker !== undefined }
    ]}
  >
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
    container: sui-page-header / inline-size;
    margin: 0 0 calc(var(--sui-rhythm-head-surface) - var(--sui-head-exit-gap, 0px));
    min-inline-size: 0;
    padding: var(--sui-rhythm-pane-gutter)
      var(--sui-local-head-inset, var(--sui-rhythm-pane-gutter));
  }

  /* One line at the foot, the band's full width, where the band meets the view, whatever the
     two grounds are. With tabs, their own line is the foot: the row runs to the band's edges,
     its first tab's words still on the copy's start, so the current tab's bar sits on the foot. */
  .sui-page-header:not(.tabbed) {
    background:
      linear-gradient(
          var(--sui-border-band-ground, transparent),
          var(--sui-border-band-ground, transparent)
        )
        bottom / 100% var(--sui-stroke) no-repeat border-box,
      var(--sui-surface-base);
    border-block-end: var(--sui-stroke) solid var(--sui-border-band);
  }

  .tabbed {
    padding-block-end: 0;
  }

  .sui-page-header-tabs {
    --sui-local-tabs-inset: calc(
      var(--sui-local-head-inset, var(--sui-rhythm-pane-gutter)) - var(--sui-space-2)
    );
    --sui-local-tabs-line: var(--sui-border-band);
    margin-block-start: var(--sui-rhythm-head-surface);
    margin-inline: calc(-1 * var(--sui-local-head-inset, var(--sui-rhythm-pane-gutter)));
  }

  /* The actions centre on the title's cap band, as a card's head controls do (L-34): the copy's
     parts and the actions share one grid, the actions in the title's row, in a box as tall as
     the title's cap that lends the row no height, so the copy stands where it stands with no
     actions and a title that wraps keeps them by its first line. */
  .sui-page-header-layout {
    align-items: start;
    column-gap: var(--sui-space-6);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .sui-page-header-layout:not(:has(> .sui-page-header-actions)) {
    grid-template-columns: minmax(0, 1fr);
  }

  .sui-page-header-copy {
    display: contents;
  }

  .sui-page-header-copy > :global(*) {
    grid-column: 1;
    min-inline-size: 0;
  }

  .sui-page-header-layout > .sui-page-header-copy > :global(* + *) {
    margin-block-start: var(--sui-rhythm-head-copy);
  }

  /* A breadcrumb's or a back link's veil reaches about 7px past its words, so the title's cap
     stands 16px under their ink, two steps further than under an eyebrow, and a lit link's
     veil stays 9px clear of the title's ink. */
  .kicked > .sui-page-header-copy > :global(:first-child + *) {
    margin-block-start: calc(var(--sui-head-kicker-shown, 1) * var(--sui-space-4));
  }

  .sui-page-header-eyebrow {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-sans);
    letter-spacing: 0.05em;
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }

  .sui-page-header-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-bold) var(--sui-font-size-page-title) / var(--sui-leading-page)
      var(--sui-sans);
    /* Type tracks tighter as it grows, so the 32px title draws closer than a 20px dialog
       title's -0.015em, which the compact title keeps. */
    letter-spacing: -0.022em;
    margin: 0;
    /* A long title stops at the measure, so it never runs past the copy under it. */
    max-inline-size: var(--sui-measure);
    overflow-wrap: break-word;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* A script lands focus on the title as a reading position after a navigation, so it draws
     no ring. A ListDetail landing marks it and it wears the kit's heading ring. */
  .sui-page-header-title:focus:not([data-sui-landed]) {
    outline: none;
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
     line cannot hold goes 12px under the title's last line, nearer than the description,
     since it belongs to the heading. */
  .sui-page-header-heading {
    align-items: start;
    column-gap: var(--sui-space-3);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-bold) var(--sui-font-size-page-title) / var(--sui-leading-page)
      var(--sui-sans);
    min-inline-size: 0;
    row-gap: var(--sui-space-3);
  }

  .sui-page-header-heading > .sui-page-header-title {
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
  }

  /* A thing's state beside its page title is said a step up from a pill in a row, in control
     type on a 24px mark, as GitHub sets the state beside an issue's title, so it holds its own
     beside 32px words. */
  .sui-page-header-status {
    --sui-local-pill-size: var(--sui-font-size-control);
    --sui-local-pill-tier: var(--sui-control-height-chip);
    align-items: center;
    block-size: round(up, 1cap, 2px);
    display: flex;
    flex: none;
    gap: var(--sui-space-2);
  }

  /* A `FactList` trims its lines to its words, so the gap over the facts and the band's
     gutter reach their ink. */
  .sui-page-header-facts {
    min-inline-size: 0;
  }

  .sui-page-header-layout
    > .sui-page-header-copy
    > .sui-page-header-description
    + .sui-page-header-facts {
    margin-block-start: var(--sui-space-6);
  }

  .sui-page-header-description {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-note)
      var(--sui-sans);
    margin: 0;
    max-inline-size: var(--sui-measure);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
    text-wrap: pretty;
  }

  .sui-page-header-actions {
    align-items: center;
    block-size: round(up, 1cap, 2px);
    display: flex;
    font: var(--sui-weight-bold) var(--sui-font-size-page-title) / var(--sui-leading-page)
      var(--sui-sans);
    gap: var(--sui-space-2);
    grid-area: 1 / 2;
    margin-block-end: calc(-1 * round(up, 1cap, 2px));
  }

  /* In the title's row the actions start where the title does, past the gap above it. */
  .led > .sui-page-header-actions {
    grid-row: 2;
    margin-block-start: var(--sui-rhythm-head-copy);
  }

  .kicked > .sui-page-header-actions {
    grid-row: calc(1 + var(--sui-head-kicker-shown, 1));
    margin-block-start: calc(var(--sui-head-kicker-shown, 1) * var(--sui-space-4));
  }

  .sui-page-header-actions > :global(*) {
    flex: none;
  }

  /* In a shell as narrow as a phone, as on a wide screen's split pane, the header takes the
     phone's title and spacing by the shell's own width, as the shell's bars do. */
  @container sui-shell (max-width: 47.9375rem) {
    .sui-page-header-title {
      letter-spacing: -0.015em;
      text-wrap: pretty;
    }

    .sui-page-header {
      margin-block-end: calc(
        var(--sui-rhythm-head-surface-compact) - var(--sui-head-exit-gap, 0px)
      );
    }

    .sui-page-header-title,
    .sui-page-header-heading,
    .sui-page-header-actions {
      font: var(--sui-weight-bold) var(--sui-font-size-page-title-compact) /
        var(--sui-leading-page-compact) var(--sui-sans);
    }
  }

  /* A header as narrow as a compact card (--sui-breakpoint-card), as in a list's detail pane,
     takes the phone's title too, so a 32px title never fills a column a phone's width. */
  @container sui-page-header (max-width: 36rem) {
    .sui-page-header-title {
      letter-spacing: -0.015em;
      text-wrap: pretty;
    }

    .sui-page-header-title,
    .sui-page-header-heading {
      font: var(--sui-weight-bold) var(--sui-font-size-page-title-compact) /
        var(--sui-leading-page-compact) var(--sui-sans);
    }

    /* The actions take a line of their own under the copy, packed to its start edge, so the
       title keeps the column's width. */
    .sui-page-header-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .sui-page-header-actions,
    .led > .sui-page-header-actions,
    .kicked > .sui-page-header-actions {
      block-size: auto;
      flex-wrap: wrap;
      grid-area: auto / 1;
      margin-block: var(--sui-rhythm-head-actions-stacked) 0;
    }

    /* Under actions on a line of their own the tabs follow as the next row of controls, their
       box 16px under the actions' box, a step further than the actions stand under the copy, so
       the page's views never read as more of its actions; on a fine pointer the tab row's track
       already stands 4px over its tabs. */
    .sui-page-header-layout:has(> .sui-page-header-actions) + .sui-page-header-tabs {
      margin-block-start: calc(var(--sui-space-4) - var(--sui-space-1));
    }

    @media (pointer: coarse) {
      .sui-page-header-layout:has(> .sui-page-header-actions) + .sui-page-header-tabs {
        margin-block-start: var(--sui-space-4);
      }
    }
  }

  /* A phone's 44px controls beside a 24px title would reach up past the line above it, so on a
     phone the actions stand under the copy at any width. */
  @media (max-width: 47.9375rem) {
    .sui-page-header-title {
      letter-spacing: -0.015em;
      text-wrap: pretty;
    }

    .sui-page-header-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .sui-page-header-actions,
    .led > .sui-page-header-actions,
    .kicked > .sui-page-header-actions {
      block-size: auto;
      flex-wrap: wrap;
      grid-area: auto / 1;
      margin-block: var(--sui-rhythm-head-actions-stacked) 0;
    }

    /* A phone's tab row has no lead over its tabs, so the tabs stand the whole 16px under. */
    .sui-page-header-layout:has(> .sui-page-header-actions) + .sui-page-header-tabs {
      margin-block-start: var(--sui-space-4);
    }
  }
</style>
