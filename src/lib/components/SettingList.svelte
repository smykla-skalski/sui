<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    class: className = '',
    children,
    ...rest
  }: {
    class?: HTMLAttributes<HTMLUListElement>['class'];
    /** `SettingRow`s, one per setting. */
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLUListElement>, 'children'> = $props();
</script>

<!--
@component
The settings of one card, as a real `ul` of `SettingRow`s. Put it in a `Card`: the rows reach
8px past the list on both sides, so their names keep the card title's edge while a changed row's
fill stands clear of the text, and the list hands back the last row's bottom padding so the last
line closes on the card's own frame. When it opens the card it hands back the first row's top
padding too, so the first line stands the card's inset below the keyline.

- Semantics: a `ul` with `role="list"`, so Safari keeps the list once its bullets are gone.
- Content: `SettingRow`s only, one per setting.
- States: none of its own; each row draws its unsaved, pending, failed, disabled and read-only states.
- Keyboard: Tab walks each row's controls in order.
- Pointer and touch: each row is at least 44px tall, and its controls keep their own targets.
- Focus: none moves; a row keeps focus inside itself when its reset leaves.
- Responsive: rows take the full width and drop their controls under the copy when the row is narrow.
- Accessibility: a screen reader hears a list with its count, and each row names its controls.
- Localization: everything it says is its rows'; it follows the reading direction.
- Performance: no script; every row renders, which suits the dozen settings of a card.
- Analytics: none of its own; rows report resets through `onclear`.
- Failure: while the settings load, draw a `Skeleton` in its place; when they fail, an `ErrorState` with a retry; with nothing to set, an `EmptyState`; without permission to change them, keep the rows with `readonly` and a `reason` on each, so the values can still be read.
-->

<ul role="list" {...rest} class={['sui-setting-list', className]}>{@render children()}</ul>

<style>
  .sui-setting-list {
    display: grid;
    list-style: none;
    margin: 0 calc(-1 * var(--sui-space-2));
    min-inline-size: 0;
    padding: 0;
  }

  /* The last row's bottom padding carries the hairline's pixel too, so the list hands back both,
     and the card's inset ends at the row's ink (L-33). */
  .sui-setting-list:has(> :global(li)) {
    margin-block-end: calc(-1 * (var(--sui-row-pad-default) + var(--sui-row-hairline)));
  }

  .sui-setting-list:first-child:has(> :global(li)) {
    margin-block-start: var(--sui-local-row-lead, 0px);
  }
</style>
