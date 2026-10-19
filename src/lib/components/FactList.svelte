<script module lang="ts">
  import type { Snippet } from 'svelte';

  export type Fact = {
    label: string;
    /**
     * Words, or a snippet for a value that is a component, such as a `RelativeTime` or a `Chip`.
     * Null or empty says `missingLabel` instead.
     */
    value: string | Snippet | null | undefined;
    /** Makes the value a link to this address. */
    href?: string;
    /** For a technical value: an ID, a path, a version or a count. */
    mono?: boolean;
    /**
     * In `rows`, a control at the row's end that changes this fact, such as a "Change" link
     * whose name also says which fact it changes.
     */
    action?: Snippet;
  };
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import Link from './Link.svelte';

  let {
    facts,
    layout = 'inline',
    missingLabel = word('FactList.missingLabel', 'Not set'),
    class: className = '',
    ...rest
  }: {
    facts: readonly Fact[];
    /**
     * `inline` for a few headline facts that wrap one by one, `rows` for a thing's properties,
     * a label and its value on each row.
     */
    layout?: 'inline' | 'rows';
    /** Said in place of a value that is absent, so a fact never stands empty. */
    missingLabel?: string;
    class?: HTMLAttributes<HTMLDListElement>['class'];
  } & Omit<HTMLAttributes<HTMLDListElement>, 'children'> = $props();

  const absent = (fact: Fact) =>
    fact.value === null || fact.value === undefined || fact.value === '';
</script>

<!--
@component
Facts about a thing, each a label and its value, such as the branch, the version and when it
last synced. A setting a reader changes is a form row, not a fact.

`inline` is for two to five headline facts, as under a page title: they flow as words do,
side by side, and a line breaks between two facts, separated by space alone, so no generated
comma or dot is left at either end of a line. A line of plain facts keeps the copy's leading,
8px between its words and the next line's, and only a line that holds a target, a link or a
time that shows its instant, grows to the target's height. The list is trimmed to its first
cap and its last baseline, so a holder measures its rhythm to the facts' ink.

`rows` is a summary list of a thing's properties, as GOV.UK's summary list and Stripe's
property list draw them: the labels in a column as wide as the longest one, up to 16rem where a
longer label wraps, the values 24px after it, and an optional `action` per fact at the row's
end, such as a "Change" link. Rows pad 12px and a hairline parts each row from the next, never
above the first or under the last, so the list's first and last ink stand at its own edges.
Once the list itself is under 25rem wide, each label stands over its value, one copy gap
apart, and the action under the value.

- Semantics: a `dl` with one `dt` and one `dd` per fact, each pair in its own `div`; a row's action is a second `dd`, as in GOV.UK's summary list.
- Content: short labels and values; a value is words, a link through `href`, or a snippet such as a `RelativeTime`, a `Pill` or a `Chip`; in `rows`, an optional `action` per fact whose name says which fact it changes.
- States: plain, linked and mono values, and the missing value, which says `missingLabel` in muted words.
- Keyboard: a linked value and a row's action are tab stops, in reading order; nothing else is.
- Pointer and touch: inline, a fact that holds a target is at least 24px tall, and 44px on a phone or a coarse pointer, so its line holds the target and two targets on two lines never meet; a linked value is a standalone `Link`, whose hit area grows to that target size without moving its words; a row's action keeps its own target.
- Focus: none moves; a linked value and an action take focus in reading order.
- Responsive: inline facts wrap one by one at every width, a long value breaks inside its fact, and text at 200% wraps the same way; rows answer to the list's own width and stack each label over its value under 25rem.
- Accessibility: the label is muted and regular and the value medium, so they differ by weight as well as ink; both hold 4.5:1; in rows each label and value pair still reads as a term and its description.
- Localization: `missingLabel` is a prop with an English default; values come formatted by the caller in the page's language, and both layouts follow the reading direction.
- Performance: one element per fact with no script; rows share one grid through `subgrid`, so a column never measures twice.
- Analytics: none of its own; a linked value is a `Link` and an action reports its own outcome.
- Failure: an absent value says `missingLabel` instead of standing empty, and two facts may share a label without breaking the list.
-->

<dl {...rest} class={['sui-fact-list', layout, className]}>
  {#each facts as fact, index (index)}
    <div class="sui-fact-list-fact">
      <dt class="sui-fact-list-label">{fact.label}</dt>
      <dd class="sui-fact-list-value" class:mono={fact.mono} class:missing={absent(fact)}>
        {#if absent(fact)}
          {missingLabel}
        {:else if typeof fact.value === 'function'}
          {@render fact.value()}
        {:else if fact.href !== undefined}
          <Link href={fact.href} standalone>{fact.value}</Link>
        {:else}
          {fact.value}
        {/if}
      </dd>
      {#if layout === 'rows' && fact.action}
        <dd class="sui-fact-list-action">{@render fact.action()}</dd>
      {/if}
    </div>
  {/each}
</dl>

<style>
  .sui-fact-list {
    margin: 0;
    min-inline-size: 0;
  }

  /* Inline facts flow as words do: each fact is an inline box, so a line breaks between two
     facts and a long fact wraps inside itself. The line has no leading of its own, so only the
     facts set its height. The list trims its first line to the cap, so its ink starts at its
     top and a target on that line reaches past it with its room alone; its last line ends at
     its facts' own foot, so a fact that wraps on it stays inside the list. */
  .inline {
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-none)
      var(--sui-sans);
    text-box: trim-start cap alphabetic;
  }

  /* Its words stand at the top of their snapped box, so a fact's baseline is one cap below its
     top: every fact starts on a whole pixel, and a line of plain facts parts from the one above
     by the copy's leading, its words 8px from that line's. The first line's trim takes that
     room off the top. */
  .inline > .sui-fact-list-fact {
    align-items: baseline;
    block-size: var(--sui-block-snap);
    column-gap: var(--sui-space-2);
    display: inline-flex;
    flex-wrap: wrap;
    margin-block-start: calc(var(--sui-row-copy-leading) - round(up, 1cap, 2px));
    margin-inline-end: var(--sui-space-5);
    max-inline-size: 100%;
    row-gap: var(--sui-row-copy-gap);
    vertical-align: baseline;
  }

  .inline > .sui-fact-list-fact:last-child {
    margin-inline-end: 0;
  }

  .inline .sui-fact-list-label,
  .inline .sui-fact-list-value {
    align-content: start;
  }

  /* A fact that holds a target, a link or a time that shows its instant, is as tall as the
     target with its words on its middle, so its line grows to hold the target and two targets
     on two lines never reach into each other (L-38). A line of plain facts stays a line of
     words. */
  .inline
    > .sui-fact-list-fact:has(:global(:is(a[href], button, [tabindex]:not([tabindex^='-'])))) {
    align-content: center;
    min-block-size: var(--sui-field-target-min);
  }

  /* On the list's last line a target's room under its words reaches past the list, as on the
     first, so the list still ends at its words. */
  .inline
    > .sui-fact-list-fact:last-child:has(
      :global(:is(a[href], button, [tabindex]:not([tabindex^='-'])))
    ) {
    margin-block-end: calc((round(up, 1cap, 1px) - var(--sui-field-target-min)) / 2);
  }

  /* A pill or a chip centres its label on it, so the box lands on whole pixels (L-95). */
  .inline > .sui-fact-list-fact:has(> .sui-fact-list-value > :global(:is(.sui-pill, .sui-chip))) {
    align-items: center;
  }

  /* Every row shares the list's columns, so labels and values line up down the list whatever
     each row holds. The label column is as wide as the longest label, up to 16rem, where a
     longer label wraps, so the values stand one gap from the labels however wide the list. */
  .rows {
    column-gap: var(--sui-space-6);
    container: sui-fact-rows / inline-size;
    display: grid;
    grid-template-columns: fit-content(16rem) minmax(0, 1fr);
  }

  .rows:has(> div > .sui-fact-list-action) {
    grid-template-columns: fit-content(16rem) minmax(0, 1fr) auto;
  }

  /* The label and the value share a baseline, and the row rounds its height up to the pixel,
     so the two sizes meeting on one line never put a hairline on a fraction (L-95). */
  .rows > .sui-fact-list-fact {
    align-items: baseline;
    block-size: var(--sui-block-snap);
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    padding-block: var(--sui-row-pad-default);
  }

  .rows > .sui-fact-list-fact:not(:last-child) {
    border-block-end: var(--sui-row-hairline) solid var(--sui-border-divider);
  }

  /* The padding parts a row's words from a hairline, and the first and last rows have none
     on their outer side, so the list's ink starts and ends at its own edges. */
  .rows > .sui-fact-list-fact:first-child {
    padding-block-start: 0;
  }

  .rows > .sui-fact-list-fact:last-child {
    padding-block-end: 0;
  }

  .sui-fact-list-label,
  .sui-fact-list-value {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-fact-list-label {
    color: var(--sui-text-muted);
  }

  /* The value outweighs its label, so the pair reads apart without ink alone. */
  .sui-fact-list-value {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-medium);
    overflow-wrap: anywhere;
  }

  .rows .sui-fact-list-value {
    font: var(--sui-weight-medium) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  /* In the value's face and trimmed as it is, so a "Change" link shares the value's baseline
     beside it and stands one copy gap under it once the row stacks. */
  .sui-fact-list-action {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    justify-self: end;
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  /* A pill or chip given as the value is a box, not words: the value lays it out as a box, so
     its edge lands on whole pixels (L-95) where the words' baseline would set it on a
     fraction, and it stands one copy gap under its label as any box does. */
  .sui-fact-list-value:has(> :global(:is(.sui-pill, .sui-chip))) {
    align-items: center;
    display: flex;
  }

  .sui-fact-list-value.missing {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
  }

  .sui-fact-list-value.mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  /* Too narrow for two columns, each label stands over its value and the action under it, in
     reading order, as GOV.UK's summary list does on a phone. */
  @container sui-fact-rows (max-width: 25rem) {
    .rows > .sui-fact-list-fact {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--sui-row-copy-gap);
    }

    .sui-fact-list-action {
      justify-self: start;
    }
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .inline
      > .sui-fact-list-fact:has(:global(:is(a[href], button, [tabindex]:not([tabindex^='-'])))) {
      min-block-size: var(--sui-touch-target);
    }
  }
</style>
