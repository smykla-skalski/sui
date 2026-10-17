<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    message,
    class: className = '',
    ...rest
  }: {
    /** What the server said. Nothing renders while it is empty. */
    message: string | null | undefined;
    class?: HTMLAttributes<HTMLParagraphElement>['class'];
  } & Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> = $props();
</script>

<!--
@component
What a form says when the server refused it. The part that matters is the part easiest to
leave off, `role="alert"`: without it the line paints and nothing announces it, so a reader
who cannot see the form is told nothing happened.

It renders only when there is something to say, so a caller needs no guard. It has no
margins of its own; the form that holds it sets the gap above it.
-->

{#if message}
  <p {...rest} class={['sui-form-error', className]} role="alert">{message}</p>
{/if}

<style>
  .sui-form-error {
    block-size: var(--sui-block-snap);
    color: var(--sui-danger);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
