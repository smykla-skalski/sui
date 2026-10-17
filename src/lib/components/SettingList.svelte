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

  .sui-setting-list:has(> :global(li)) {
    margin-block-end: calc(-1 * var(--sui-row-pad-default));
  }

  .sui-setting-list:first-child:has(> :global(li)) {
    margin-block-start: var(--sui-local-row-lead, 0px);
  }
</style>
