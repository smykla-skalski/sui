<script lang="ts">
  import { word } from '../words.js';
  import { untrack, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { tabStops } from '../internal/focus.js';
  import BackLink from './BackLink.svelte';
  import EmptyState from './EmptyState.svelte';

  let {
    list,
    detail,
    label,
    current,
    backHref,
    backLabel,
    onback,
    landmark = 'none',
    contained = false,
    emptyTitle = word('ListDetail.emptyTitle', 'Nothing open'),
    emptyDescription = word(
      'ListDetail.emptyDescription',
      'What you open in the list shows here with its details'
    ),
    emptyStep = word('ListDetail.emptyStep', 'Choose an item in the list'),
    class: className = '',
    ...rest
  }: {
    /** The items, usually an `ObjectList` whose rows link to each item's own address. */
    list: Snippet;
    /**
     * The open item, given only while one is open. It receives the way back, which it draws as
     * its `PageHeader` kicker; the way back shows only while one pane shows at a time.
     */
    detail?: Snippet<[back: Snippet]>;
    /** Names the list's navigation landmark, and the way back unless `backLabel` is given. */
    label: string;
    /** The address of the open item, the `href` of its row, so focus can return to that row. */
    current?: string;
    /** The list's own address, which the way back leads to. */
    backHref: string;
    /** The way back's words, the list's own name in its own case. Defaults to `label`. */
    backLabel?: string;
    /** Called when the way back is followed, for a router that handles the click itself. */
    onback?: (event: MouseEvent) => void;
    /** `main` makes the detail the page's one main landmark, when the page has no other. */
    landmark?: 'main' | 'none';
    /** Fills a bounded box, as a preview does, instead of the viewport's height. */
    contained?: boolean;
    /** Says that nothing is open, in the detail's place beside the list. */
    emptyTitle?: string;
    /** One sentence on what the detail shows. */
    emptyDescription?: string;
    /** The next step, in words. */
    emptyStep?: string;
    /** Layout for the call site only, never the layout's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

  let root = $state<HTMLElement | null>(null);
  let listPane = $state<HTMLElement | null>(null);
  let detailPane = $state<HTMLElement | null>(null);

  // The item last seen open. Only a change from it moves focus, so a page opened at an item's
  // address keeps the browser's own first focus.
  let shown = untrack(() => current);
  // Focus moves only for a reader acting in the pair, or one whose focused control just left.
  let held = false;
  // Where a narrow pair had scrolled its list to, so the way back lands there again. It is read
  // before the detail replaces the list, which would clamp the scroll to its own height.
  let place = 0;

  /** What scrolls a narrow pair's one pane: its own bounded box, or else the page. */
  const scroller = () => (contained ? root : document.scrollingElement);

  $effect.pre(() => {
    if (current === shown) return;
    const active = document.activeElement;
    held = active instanceof Element && (root?.contains(active) ?? false);
    if (shown === undefined) place = scroller()?.scrollTop ?? 0;
  });

  $effect(() => {
    const next = current;
    if (next === shown) return;
    const left = shown;
    shown = next;
    if (!root || !listPane || !detailPane) return;
    if (next !== undefined) {
      root.scrollTop = 0;
      detailPane.scrollTop = 0;
      if (held) land(detailPane.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? detailPane);
    } else {
      const box = scroller();
      if (box) box.scrollTop = place;
      const opener = listPane.querySelector<HTMLElement>(`a[href="${CSS.escape(left ?? '')}"]`);
      if (held) (opener ?? tabStops(listPane)[0])?.focus();
    }
  });

  /** Moves focus to a heading or a pane, so the next Tab starts there. */
  function land(target: HTMLElement): void {
    if (!target.hasAttribute('tabindex')) {
      target.tabIndex = -1;
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus();
  }
</script>

<!--
@component
A list beside the detail of the item open from it, as a mail app or a run history shows them.
Every item has its own address: the rows are the caller's links, so the browser's back, a new
tab and a shared link all work, and the caller passes the open item as `detail` and its
address as `current`.

Once the layout itself is 56rem wide or wider, the list stands at the start, `clamp(20rem,
32%, 26rem)` wide, the detail fills the rest, and one hairline parts them. Each pane scrolls on
its own there, the one exception to a page's single scroll, so the list keeps its place while
the detail changes. The pair fills the viewport's height, or with `contained` the box around
it. The open item's row marks it as current (`ObjectRow current`), and with nothing open the
detail says so in an `EmptyState`.

Narrower, one pane shows at a time and the page keeps one scroll: the list, or the open item
with a way back to the list in its header, where the `detail` snippet draws the `back` it
receives as its `PageHeader` kicker. The way back shows only there, since beside the list it
has nowhere to go.

Opening an item moves focus to the detail's title, and closing it, by the way back, the
browser's back or anything else that clears `current`, returns focus to the row that opened
it, or to the list's first control when that row is gone, with the list scrolled back to where
it stood. Focus moves only when the reader was in the pair or the focused control just left, so
a change made elsewhere never pulls it. A router that resets focus and scroll after a
navigation leaves both to the pair, as SvelteKit does with `data-sveltekit-reset="false"`
around it.

- Semantics: the list is a `nav` landmark named by `label`; the detail is a plain box, or the page's `main` with `landmark="main"` when the page has no other; the way back is a `BackLink`.
- Content: a `list` of links to each item's address, usually an `ObjectList`, and the open item's `detail`, usually a `PageHeader` over a `DetailLayout`.
- States: nothing open (beside the list, an `EmptyState` with `emptyTitle`, `emptyDescription` and `emptyStep`), an item open, and its row current (`ObjectRow current`) while both panes show; the panes draw no state of their own.
- Keyboard: Tab walks the list, then the detail; the way back is a link that Enter follows; nothing traps focus, since the pair is not modal.
- Pointer and touch: none of its own; the rows and the way back keep their own targets, 44px on a phone.
- Focus: opening an item moves focus to the detail's first heading, and closing it returns focus to the row that opened it, or the list's first control.
- Responsive: a container query on the layout's own width shows both panes from 56rem (`--sui-breakpoint-detail`), the detail keeping at least 36rem, each scrolling on its own, and one pane at a time below it, the open item over the list; a pane holds its scroll at its end only when the pair fills the viewport, and a `contained` pair lets the wheel run on into the page.
- Accessibility: the list is a named navigation landmark a reader can jump to, the current row is announced as the current page, the hairline holds the shell's structural contrast, and the hidden pane is out of the accessibility tree.
- Localization: `label`, `backLabel` and the empty words are props with English defaults; the list stands at the inline start and the way back's chevron mirrors in a right-to-left page.
- Performance: layout by container query with no script; focus work runs once per change of `current`, and the list is never rendered again when the detail changes.
- Analytics: `onback(event)` reports the way back; the rows report what the reader opens through their own links.
- Failure: a `current` that matches no row returns focus to the list's first control; a missing item is the caller's `ErrorState` in the detail, under its header and way back; without `current` focus stays where it is.
-->

{#snippet back()}
  <span class="sui-list-detail-back">
    <BackLink href={backHref} label={backLabel ?? label} onclick={onback} />
  </span>
{/snippet}

<div bind:this={root} {...rest} class={['sui-list-detail', className, { contained }]}>
  <div class={['sui-list-detail-panes', { open: detail !== undefined }]}>
    <nav bind:this={listPane} class="sui-list-detail-list" aria-label={label}>
      {@render list()}
    </nav>
    <svelte:element
      this={landmark === 'main' ? 'main' : 'div'}
      bind:this={detailPane}
      class="sui-list-detail-detail"
    >
      {#if detail}
        {@render detail(back)}
      {:else}
        <div class="sui-list-detail-empty">
          <EmptyState title={emptyTitle} description={emptyDescription} step={emptyStep} />
        </div>
      {/if}
    </svelte:element>
  </div>
</div>

<style>
  .sui-list-detail {
    container: sui-list-detail / inline-size;
    min-inline-size: 0;
  }

  /* A bounded box scrolls the one pane a narrow pair shows, and the two panes of a wide one
     fill it. */
  .contained {
    block-size: 100%;
    overflow-y: auto;
  }

  .sui-list-detail-panes {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .sui-list-detail-list,
  .sui-list-detail-detail {
    min-inline-size: 0;
  }

  .sui-list-detail-back {
    display: contents;
  }

  .sui-list-detail-empty {
    padding: var(--sui-rhythm-pane-gutter);
  }

  /* One pane at a time: the open item over the list, or the list while nothing is open. */
  @container sui-list-detail not (min-width: 56rem) {
    .open > .sui-list-detail-list,
    .sui-list-detail-panes:not(.open) > .sui-list-detail-detail {
      display: none;
    }
  }

  /* Side by side, each pane scrolls on its own, so the list keeps its place while the detail
     changes. */
  @container sui-list-detail (min-width: 56rem) {
    /* The list's share is rounded to the pixel, so the hairline between the panes draws crisp. */
    .sui-list-detail-panes {
      block-size: 100dvh;
      grid-template-columns: clamp(20rem, round(32%, 1px), 26rem) minmax(0, 1fr);
    }

    .contained > .sui-list-detail-panes {
      block-size: 100%;
    }

    .sui-list-detail-list,
    .sui-list-detail-detail {
      overflow-y: auto;
    }

    /* A pair that fills the viewport is the page's whole scrolling area, so a pane holds its
       scroll at its end rather than nudging what little stands above it. A bounded pair sits
       in a page that scrolls on, so the wheel runs on into the page at a pane's end. */
    .sui-list-detail:not(.contained) :is(.sui-list-detail-list, .sui-list-detail-detail) {
      overscroll-behavior: contain;
    }

    /* The hairline is the list's end edge, as the shell's sidebar draws its own, so it reads as
       the boundary between two panes and never as a strip on the detail's start (L-17). */
    .sui-list-detail-list {
      border-inline-end: var(--sui-stroke) solid var(--sui-border-subtle);
      scrollbar-width: thin;
    }

    .sui-list-detail-back {
      display: none;
    }
  }
</style>
