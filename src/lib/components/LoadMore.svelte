<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { formatCount } from '../internal/locale.js';
  import Button from './Button.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    more,
    shown,
    total,
    loading = false,
    problem = null,
    onmore,
    moreLabel = 'Load more',
    loadingLabel = 'Loading…',
    retryLabel = 'Try again',
    endLabel = (shown: string) => `All ${shown} shown`,
    arrivedLabel = (count: number, arrived: string, shown: string, total?: string) =>
      `${arrived} more loaded, ${total === undefined ? shown : `${shown} of ${total}`} shown`
  }: {
    /** Another page exists. Without one the button gives way to an end-of-list note. */
    more: boolean;
    /** How many rows the list shows now. The status counts the rows that arrive against it. */
    shown: number;
    /** How many rows exist, when the server knows. */
    total?: number;
    /** A page is on its way, so the button stays focused and ignores presses. */
    loading?: boolean;
    /** Why the last page failed. The button becomes a retry until the caller clears it. */
    problem?: string | null;
    /** Ask for the next page. */
    onmore: () => void;
    moreLabel?: string;
    loadingLabel?: string;
    retryLabel?: string;
    /** The end-of-list note, given the row count already formatted in the page's language. */
    endLabel?: (shown: string) => string;
    /**
     * The polite status once rows arrive: `count` for plural rules, then the arrived, shown and
     * total counts formatted in the page's language.
     */
    arrivedLabel?: (count: number, arrived: string, shown: string, total?: string) => string;
  } = $props();

  let root = $state<HTMLElement>();
  /* The row count when the reader last asked, so the status can say how many came back. */
  let asked = $state<number | null>(null);
  let refocus = false;

  const arrived = $derived(
    asked !== null && shown > asked
      ? arrivedLabel(
          shown - asked,
          formatCount(shown - asked),
          formatCount(shown),
          total === undefined ? undefined : formatCount(total)
        )
      : ''
  );

  /* A pre-effect runs before the button leaves the page, while it can still hold focus. */
  $effect.pre(() => {
    if (!more) refocus = root?.contains(document.activeElement) ?? false;
  });

  const takeFocus: Attachment<HTMLElement> = (node) => {
    if (refocus) node.focus();
    refocus = false;
  };

  function press() {
    asked = shown;
    onmore();
  }
</script>

<!--
@component
What a long list has instead of infinite scroll: a "Load more" button after the last row. The
reader decides when the next page comes, so keyboard focus keeps its place and the footer stays
in reach. Numbered pages belong to a data table, never to a list of rows.

A failure does not try again on its own, which could hammer a server that is already
struggling. The reason shows beside the button, which offers `retryLabel` until the caller
clears `problem`. Clear it when the retry starts.

It pads 12px above and below like a row, and drops the bottom padding when it ends its
container, so its button closes on a card's inset (L-33) as a list's last row does.

- Semantics: a native `button`, a polite status region, an alert for a failure, and an end-of-list paragraph.
- Content: the button's words, the failure's reason, and the end note with its count.
- States: ready (`moreLabel`), loading (`loadingLabel`, busy, presses ignored), failed (the reason beside a `retryLabel` button), and ended (`endLabel`).
- Keyboard: Enter or Space on the button asks for the next page.
- Pointer and touch: the button is 34px tall, 44px on a phone.
- Focus: stays on the button while a page loads; when the last page lands while the button has focus, focus moves to the end note instead of falling to the page.
- Responsive: the reason and the button wrap onto two lines when the room is short, centred.
- Accessibility: arrivals are said through a polite status with how many came and how many show; set `aria-busy` on the list while `loading` is true, so assistive technology waits for the new rows.
- Localization: every word is a prop, the counted ones functions that receive counts already grouped in the page's language, and the plain count for plural rules.
- Performance: no cost while idle; the caller decides the page size.
- Analytics: `onmore` hears every request, a retry included.
- Failure: `problem` shows its reason as an alert and turns the button into a retry; nothing retries on its own.
-->

<div class="sui-load-more" bind:this={root}>
  {#if more}
    {#if problem}
      <p class="sui-load-more-copy" role="alert">{problem}</p>
    {/if}
    <Button {loading} onclick={press}>
      {loading ? loadingLabel : problem ? retryLabel : moreLabel}
    </Button>
  {:else if asked !== null}
    <p class="sui-load-more-copy sui-load-more-end" tabindex="-1" {@attach takeFocus}>
      {endLabel(formatCount(shown))}
    </p>
  {/if}
  <VisuallyHidden role="status">{arrived}</VisuallyHidden>
</div>

<style>
  .sui-load-more {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: center;
    padding-block: var(--sui-space-3);
  }

  .sui-load-more:last-child {
    padding-block-end: 0;
  }

  .sui-load-more-copy {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-load-more-end:focus-visible {
    border-radius: var(--sui-radius-control);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
