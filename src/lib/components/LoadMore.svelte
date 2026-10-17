<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import Button from './Button.svelte';

  let {
    more,
    loading = false,
    problem = null,
    onmore
  }: {
    /** Another page exists. Without one there is nothing to watch for. */
    more: boolean;
    /** A page is on its way, so the trigger waits for it. */
    loading?: boolean;
    /** Why the last page failed. While set, the trigger stays off and a retry shows instead. */
    problem?: string | null;
    /** Ask for the next page. */
    onmore: () => void;
  } = $props();

  /* A margin of a few rows asks for the next page before the reader reaches the end. */
  const watch: Attachment<HTMLElement> = (node) => {
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onmore();
      },
      { rootMargin: '384px 0px' }
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  };
</script>

<!--
@component
What a long list has instead of a pager: a marker after the last row that asks for the next
page as the reader nears the end. There are no page numbers and no page size to pick.

After a failure it does not try again on its own, which could hammer a server that is
already struggling. It stays off and puts the reason and a "Try again" button at the list
boundary until the caller clears `problem`. It draws nothing while a page loads or once the
list has ended.
-->

{#if problem}
  <div class="sui-load-more-problem" role="alert">
    <span class="sui-load-more-copy">{problem}</span>
    <Button onclick={onmore}>Try again</Button>
  </div>
{:else if more && !loading}
  <div class="sui-load-more" aria-hidden="true" {@attach watch}></div>
{/if}

<style>
  .sui-load-more {
    block-size: 1px;
    pointer-events: none;
  }

  .sui-load-more-problem {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: center;
    padding-block: var(--sui-space-3);
  }

  .sui-load-more-copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
