<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import Tooltip from './Tooltip.svelte';

  let {
    text,
    mono = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    text: string;
    /** Draws the tip in the mono face, for a label whose whole text is one identifier. */
    mono?: boolean;
    element?: HTMLSpanElement | null;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();

  /* A negative tabindex is focus a script moves, such as the page's main landmark after a
     skip link: a reader never tabs there, and it holds every label on the page. */
  const FOCUSABLE =
    "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^='-'])";

  let clipped = $state(false);

  /* The tip shows on keyboard focus too, so it hangs on the control the label sits in
     when there is one: a bare span never takes focus. */
  const anchor = $derived(element?.closest<HTMLElement>(FOCUSABLE) ?? element);

  /* Keyed to the text so a swapped label measures again; the observer covers the other
     way the cut changes, the box resizing. */
  function measured(_text: string): Attachment<HTMLElement> {
    return (node) => {
      const check = () => {
        clipped = node.scrollWidth > node.clientWidth + 1;
      };
      const watcher = new ResizeObserver(check);
      watcher.observe(node);
      return () => watcher.disconnect();
    };
  }
</script>

<!--
@component
A one-line label that knows when it has been cut. While the text fits it is a plain span;
once the ellipsis shows, hovering the label, or focusing the control it sits in, answers
with the whole text in the shared `Tooltip`. A tip that repeats what is fully visible is
noise, so it exists only while the label is clipped.

The label trims itself to the cap height and the baseline and clips on the inline axis
only, so descenders below the trimmed box still paint. It shrinks inside a flex row; give
it a bounded width anywhere else.
-->

<span
  bind:this={element}
  {...rest}
  class={['sui-clipped-label', className]}
  {@attach measured(text)}>{text}</span
>
{#if clipped}
  <Tooltip {anchor} {text} {mono} />
{/if}

<style>
  .sui-clipped-label {
    display: block;
    min-inline-size: 0;
    overflow-x: clip;
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
