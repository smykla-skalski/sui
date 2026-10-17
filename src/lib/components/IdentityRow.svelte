<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import Avatar, { type AvatarShape } from './Avatar.svelte';
  import ClippedLabel from './ClippedLabel.svelte';

  let {
    name,
    handle,
    src,
    shape = 'person',
    size = 32,
    class: className = '',
    ...rest
  }: {
    name: string;
    /** The login, drawn in mono under the name. */
    handle?: string;
    /** The picture; without one the avatar draws initials. */
    src?: string | null;
    shape?: AvatarShape;
    /** The avatar's size in px. */
    size?: number;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
Who a row is about, in one row: the avatar, then the name with the handle in mono under it.
Both lines are trimmed to their ink and stand 8px apart, so the words, not their line
boxes, centre on the avatar.

A long name or handle ends in an ellipsis inside the space it is given and shows in full in
a tooltip, so it never runs under whatever stands beside the row.
-->

<span {...rest} class={['sui-identity-row', className]}>
  <Avatar {name} handle={handle ?? ''} {src} {shape} {size} />
  <span class="sui-identity-copy">
    <span class="sui-identity-name"><ClippedLabel text={name} /></span>
    {#if handle}
      <span class="sui-identity-handle"><ClippedLabel text={handle} mono /></span>
    {/if}
  </span>
</span>

<style>
  .sui-identity-row {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-identity-copy {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-identity-name {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    min-inline-size: 0;
  }

  .sui-identity-handle {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-mono);
    font-variant-numeric: tabular-nums;
    min-inline-size: 0;
  }
</style>
