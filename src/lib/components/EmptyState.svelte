<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    title,
    description,
    action,
    class: className = '',
    ...rest
  }: {
    /** The state, plainly, without trailing punctuation. */
    title: string;
    /** One sentence on why, and what changes it. */
    description: string;
    /** The one next step, usually a `Button`. */
    action?: Snippet;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> = $props();
</script>

<!--
@component
What a collection says when it has nothing to show, standing where the content would be. It
names what happened and offers the next step, so it is never a dead end: a list that only
says "no results" leaves the reader to guess whether that is the filter, the access or the
data.

An empty list is not an error and is not drawn as one; a request that failed is
`ErrorState`. There is no decorative icon. The title sits above the explanation with the
8px copy gap.
-->

<div {...rest} class={['sui-empty-state', className]}>
  <div class="sui-empty-state-copy">
    <p class="sui-empty-state-title">{title}</p>
    <p class="sui-empty-state-description">{description}</p>
  </div>
  {#if action}
    <div class="sui-empty-state-action">{@render action()}</div>
  {/if}
</div>

<style>
  .sui-empty-state {
    background: var(--sui-surface-raised);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-3);
    justify-items: start;
    min-inline-size: 0;
    padding: var(--sui-space-4);
  }

  .sui-empty-state-copy {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  p {
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-empty-state-title {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-empty-state-description {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
  }

  .sui-empty-state-action {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }
</style>
