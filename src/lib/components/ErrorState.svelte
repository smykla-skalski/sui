<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Button from './Button.svelte';

  let {
    title,
    description,
    onretry,
    busy = false,
    overContent = false,
    class: className = '',
    ...rest
  }: {
    /** What could not be done, as a statement: "Repositories could not be loaded". */
    title: string;
    /** Why, and what the reader can do about it. */
    description: string;
    /** Draws "Try again", for a failure that repeating the request can fix. */
    onretry?: () => void;
    /** The retry is running, so a second press cannot be sent. */
    busy?: boolean;
    /** Loaded content stands behind the failure, so it becomes a line above it. */
    overContent?: boolean;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> = $props();
</script>

<!--
@component
A request that failed, announced as an alert, with a retry when repeating it can help. It is
the `EmptyState` panel in the danger tone, because it stands in the same place and answers
the same question: a thing that went wrong rather than a thing that is not there.

`overContent` keeps what is already loaded. A refresh that fails over a list has not made
the list wrong, so the failure becomes one line above the rows instead of a panel in place
of them. `busy` disables the retry while it runs.
-->

<div {...rest} class={['sui-error-state', className, { over: overContent }]} role="alert">
  <div class="sui-error-state-copy">
    <p class="sui-error-state-title">{title}</p>
    <p class="sui-error-state-description">{description}</p>
  </div>
  {#if onretry}
    <Button onclick={onretry} loading={busy}>{busy ? 'Trying again…' : 'Try again'}</Button>
  {/if}
</div>

<style>
  .sui-error-state {
    background: var(--sui-surface-raised);
    border: 1px solid color-mix(in srgb, var(--sui-danger) 35%, transparent);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-3);
    justify-items: start;
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }

  .sui-error-state-copy {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  p {
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-error-state-title {
    color: var(--sui-danger);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-error-state-description {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  /* One line sized to itself, so the rows under it keep their place. */
  .over {
    align-items: center;
    background: var(--sui-danger-tint);
    border-color: transparent;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: space-between;
    padding: var(--sui-space-2) var(--sui-space-3);
  }

  .over .sui-error-state-description {
    color: var(--sui-danger);
  }
</style>
