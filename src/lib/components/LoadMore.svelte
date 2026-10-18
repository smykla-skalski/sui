<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '../icons/Icon.svelte';
  import { formatCount } from '../internal/locale.js';
  import { word } from '../words.js';
  import Button from './Button.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const id = $props.id();

  let {
    list,
    more,
    shown,
    total,
    loading = false,
    problem = null,
    onmore,
    moreLabel = word('LoadMore.moreLabel', 'Load more'),
    loadingLabel = word('LoadMore.loadingLabel', 'Loading…'),
    retryLabel = word('LoadMore.retryLabel', 'Try again'),
    countLabel = word(
      'LoadMore.countLabel',
      (shown: number, total: number | undefined, shownText: string, totalText?: string) =>
        totalText === undefined ? `${shownText} shown` : `${shownText} of ${totalText} shown`
    ),
    endLabel = word('LoadMore.endLabel', (count: number, shown: string) => `All ${shown} shown`),
    arrivedLabel = word(
      'LoadMore.arrivedLabel',
      (count: number, arrived: string, shown: string, total?: string) =>
        `${arrived} more loaded, ${total === undefined ? shown : `${shown} of ${total}`} shown`
    )
  }: {
    /** The id of the list it extends. The button controls it, and focus moves into its new rows. */
    list: string;
    /** Another page exists. Without one the row says the list is whole. */
    more: boolean;
    /** How many rows the list shows now. */
    shown: number;
    /** How many rows exist, when the server knows. */
    total?: number;
    /** A page is on its way, so the button stays focused and refuses presses. */
    loading?: boolean;
    /** Why the last page failed. It takes the count's place and the button retries, until the caller clears it. */
    problem?: string | null;
    /** Ask for the next page. */
    onmore: () => void;
    moreLabel?: string;
    loadingLabel?: string;
    retryLabel?: string;
    /** How far the reader is: the shown and total counts for plural rules, then the same counts formatted. */
    countLabel?: (
      shown: number,
      total: number | undefined,
      shownText: string,
      totalText?: string
    ) => string;
    /** The note once the list is whole: the row count for plural rules, then formatted. */
    endLabel?: (count: number, shown: string) => string;
    /**
     * The polite status once rows arrive: `count` for plural rules, then the arrived, shown and
     * total counts formatted.
     */
    arrivedLabel?: (count: number, arrived: string, shown: string, total?: string) => string;
  } = $props();

  const TABBABLE =
    ':is(a[href], button, input, select, textarea, summary, [tabindex]):not(:disabled, [tabindex^="-"])';

  let root = $state<HTMLElement>();
  /* The row count when the reader last asked, so the status can say how many came back. */
  let asked = $state<number | null>(null);
  /* A page was asked for and focus has not been handed on to it yet. */
  let landing = false;
  let held = false;

  const count = $derived(
    countLabel(
      shown,
      total,
      formatCount(shown),
      total === undefined ? undefined : formatCount(total)
    )
  );

  const said = $derived(
    asked !== null && shown > asked
      ? arrivedLabel(
          shown - asked,
          formatCount(shown - asked),
          formatCount(shown),
          total === undefined ? undefined : formatCount(total)
        )
      : ''
  );

  /* Before the page changes, while the button that may leave can still say it holds focus. */
  $effect.pre(() => {
    void [shown, more];
    held = root?.contains(document.activeElement) ?? false;
  });

  $effect(() => {
    void [shown, more];
    untrack(land);
  });

  function land() {
    if (!landing || asked === null || (shown <= asked && more)) return;
    landing = false;
    if (!held) return;
    const first = document
      .getElementById(list)
      ?.querySelectorAll<HTMLElement>(':scope > li, :scope > tbody > tr')[asked];
    const target = first?.matches(TABBABLE) ? first : first?.querySelector<HTMLElement>(TABBABLE);
    (target ?? (more ? null : document.getElementById(`${id}-words`)))?.focus();
  }

  function press() {
    asked = shown;
    landing = true;
    onmore();
  }
</script>

<!--
@component
What a long list has instead of infinite scroll: the list's last row, which says how far the
reader is and holds the button that loads the next page. The reader decides when the next page
comes, so the footer stays in reach and the keyboard keeps its place. Numbered pages belong to
a data table that readers search or return to.

Place it right after the `ObjectList` it extends, inside the same card, and give the list an
`id` for `list`. The list then keeps its last row's padding and draws the hairline above this
row, so it reads as one more row: the words at the start, the button at the end.

A failure does not try again on its own, which could hammer a server that is already
struggling. The reason takes the count's place and the button retries until the caller clears
`problem`; clear it when the retry starts.

- Semantics: a native `button` that controls the list, a paragraph that describes it, an alert for a failure, and a polite status.
- Content: the count of rows shown, of the total when known, the button's words, a failure's reason, and the end note.
- States: ready (`countLabel` and `moreLabel`), loading (the button's spinner and `loadingLabel`, dimmed and busy), failed (the reason in danger ink beside `retryLabel`) and whole (`endLabel` alone).
- Keyboard: Enter or Space on the button asks for the next page.
- Pointer and touch: the button is 34px tall, 44px on a phone or a touch screen.
- Focus: the button keeps focus while a page loads; when it lands, focus moves to the first new row's link or control (WCAG 2.4.3), or stays on the button when that row has none, and moves to the end note when the button leaves.
- Responsive: the words lead and the button ends their line; when both do not fit, the button takes the next line from the start, so words beside it never wrap.
- Accessibility: the count describes the button, arrivals are said through a polite status with how many came and how many show, and a failure is an alert in words beside an icon; set `aria-busy` on the list while `loading` is true.
- Localization: every word is a prop, and the counted ones are functions given the counts for plural rules and formatted in the page's language; the row follows the reading direction.
- Performance: no cost while idle, and one lookup in the list when a page lands; the caller decides the page size.
- Analytics: `onmore` hears every request, a retry included.
- Failure: `problem` shows its reason as an alert and turns the button into a retry; nothing retries on its own.
-->

<div class="sui-load-more" bind:this={root}>
  {#if !more}
    <p id="{id}-words" class="sui-load-more-words sui-load-more-end" tabindex="-1">
      <span class="sui-load-more-text">{endLabel(shown, formatCount(shown))}</span>
    </p>
  {:else if problem}
    <p id="{id}-words" class="sui-load-more-words sui-load-more-problem" role="alert">
      <span class="sui-load-more-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-load-more-text">{problem}</span>
    </p>
  {:else}
    <p id="{id}-words" class="sui-load-more-words">
      <span class="sui-load-more-text">{count}</span>
    </p>
  {/if}
  {#if more}
    <Button {loading} aria-controls={list} aria-describedby="{id}-words" onclick={press}>
      {loading ? loadingLabel : problem ? retryLabel : moreLabel}
    </Button>
  {/if}
  <VisuallyHidden role="status">{said}</VisuallyHidden>
</div>

<style>
  /* The words lead and the button ends the line, and when both do not fit the button takes the
     next line from the start, so words beside it never wrap. */
  .sui-load-more {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3) var(--sui-space-4);
    justify-content: space-between;
    padding-block: var(--sui-row-pad-default);
  }

  .sui-load-more:last-child {
    padding-block-end: 0;
  }

  .sui-load-more-words {
    align-items: start;
    color: var(--sui-text-muted);
    display: flex;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    gap: var(--sui-space-2);
    margin: 0;
    min-inline-size: 0;
  }

  .sui-load-more-problem {
    color: var(--sui-danger);
  }

  /* The box hugs the ink to the pixel, so the words stand one row gap under the hairline as a
     row's words do, and centring on the button splits what is left evenly. */
  .sui-load-more-text {
    align-content: center;
    block-size: var(--sui-block-snap);
    font-variant-numeric: tabular-nums;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-load-more-mark {
    display: flex;
    flex: none;
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-xs)) / 2);
  }

  .sui-load-more-end:focus-visible {
    border-radius: var(--sui-radius-control);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
