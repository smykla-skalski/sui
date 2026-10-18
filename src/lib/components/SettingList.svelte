<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import EmptyState from './EmptyState.svelte';
  import ErrorState from './ErrorState.svelte';
  import Skeleton from './Skeleton.svelte';

  let {
    loading = false,
    error,
    onretry,
    retrying = false,
    empty = false,
    loadingLabel = word('SettingList.loadingLabel', 'Loading the settings…'),
    failedTitle = word('SettingList.failedTitle', 'The settings could not load'),
    emptyTitle = word('SettingList.emptyTitle', 'Nothing to set here'),
    emptyDescription = word('SettingList.emptyDescription', 'This part has no settings of its own'),
    emptyStep = word('SettingList.emptyStep', 'Settings show here once there are any'),
    class: className = '',
    children,
    ...rest
  }: {
    /** The settings are on their way; placeholder rows stand where they will be. */
    loading?: boolean;
    /** Why the settings could not load; draws a failure with `onretry` in place of the rows. */
    error?: string;
    onretry?: () => void;
    /** A retry is running. */
    retrying?: boolean;
    /** There is nothing to set; draws an empty state with its next step. */
    empty?: boolean;
    loadingLabel?: string;
    failedTitle?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    /** The next step, in words, for a list with nothing to set. */
    emptyStep?: string;
    class?: HTMLAttributes<HTMLUListElement>['class'];
    /** `SettingRow`s, one per setting. */
    children?: Snippet;
  } & Omit<HTMLAttributes<HTMLUListElement>, 'children'> = $props();
</script>

<!--
@component
The settings of one group, as a real `ul` of `SettingRow`s. Put it in a `Section`, never in a
card or a plate (L-55): it hangs there with no frame, so the rows' names stand on the section
title's edge while a changed row's plate and a hover reach 8px past it into the pane's gutter.
Give it a holder that leaves that room and never clips or scrolls it sideways (L-61). Its rows,
grounds and all, start 16px under the title's ink, as any section content does, so a changed
first row's plate never presses on the heading, as the rows of an `ObjectList` start; it hands
back the last row's bottom padding, so the space after it runs from its last line (L-108).

- Semantics: a `ul` with `role="list"`, so Safari keeps the list once its bullets are gone.
- Content: `SettingRow`s only, one per setting.
- States: loaded (the rows), loading (placeholder rows, said once), failed (`error` with a retry), empty (`empty`, with the next step in words), and no permission (keep the rows with `readonly` and a `reason` on each, so the values can still be read); each row draws its own unsaved, pending, failed, disabled and read-only states.
- Keyboard: Tab walks each row's controls in order.
- Pointer and touch: each row is at least 44px tall, and its controls keep their own targets.
- Focus: none moves; a row keeps focus inside itself when its reset leaves.
- Responsive: rows take the full width and drop their controls under the copy when the row is narrow.
- Accessibility: a screen reader hears a list with its count, and each row names its controls.
- Localization: everything it says is its rows'; it follows the reading direction.
- Performance: no script; every row renders, which suits the dozen settings of a section.
- Analytics: none of its own; rows report resets through `onclear`.
- Failure: `loading` draws placeholder rows, `error` an alert with a retry, and `empty` the empty state, each in the rows' place; without permission to change them, keep the rows with `readonly` and a `reason` on each.
-->

{#if error}
  <ErrorState title={failedTitle} description={error} {onretry} busy={retrying} />
{:else if loading}
  <Skeleton rows={3} label={loadingLabel} />
{:else if empty || !children}
  <EmptyState title={emptyTitle} description={emptyDescription} step={emptyStep} />
{:else}
  <ul role="list" {...rest} class={['sui-setting-list', className]}>{@render children()}</ul>
{/if}

<style>
  .sui-setting-list {
    display: grid;
    list-style: none;
    margin: 0 calc(-1 * var(--sui-space-2));
    min-inline-size: 0;
    padding: 0;
  }

  /* The last row's bottom padding carries the hairline's pixel too, so the list hands back both
     and what follows stands its own gap from the last line's ink (L-108). */
  .sui-setting-list:has(> :global(li)) {
    margin-block-end: calc(-1 * (var(--sui-row-pad-default) + var(--sui-row-hairline)));
  }
</style>
