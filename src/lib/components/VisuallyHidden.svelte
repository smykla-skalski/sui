<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    class: className = '',
    children,
    ...rest
  }: {
    class?: HTMLAttributes<HTMLSpanElement>['class'];
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
Words a screen reader reads and the page does not show, such as the unit after a bare count
or the name of a row a control acts on. The text stays in the accessibility tree and in
`innerText`, so a control named by it keeps that name. It is clipped to one pixel, never
`display: none`, which would hide it from assistive technology too.

Reach for `aria-label` instead when the words replace a control's whole name, and for
`SkipLink` when the hidden thing must appear once it has focus.
-->

<span {...rest} class={['sui-visually-hidden', className]}>{@render children()}</span>

<style>
  .sui-visually-hidden {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
  }
</style>
