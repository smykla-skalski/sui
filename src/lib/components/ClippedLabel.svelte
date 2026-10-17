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

  /* A cut label inside no control becomes a tab stop of its own, so the keyboard can reach the
     rest of its words; inside a control, that control's focus shows them. */
  const alone = $derived(clipped && !element?.parentElement?.closest(FOCUSABLE));

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

- Semantics: a `span` whose words are the whole text, so a screen reader always hears all of it; a cut label inside no control becomes a tab stop.
- Content: one line of plain text, cut with an ellipsis at the end of its box.
- States: fits (a plain span), clipped (the ellipsis, and the tip on hover, long press and focus), and focused (the 2px ring when it is its own tab stop).
- Keyboard: a cut label inside a control shows its tip on that control's focus; a cut label alone takes Tab itself, and Escape closes the tip.
- Pointer and touch: hover shows the whole text after a pause, and a long press shows it on touch.
- Focus: it never moves focus; it takes focus only while cut and outside any control.
- Responsive: it shrinks with its row and measures again on every resize, so the tip comes and goes with the cut.
- Accessibility: the whole text stays in the accessibility tree, and the tip, which repeats it, stays out of it.
- Localization: the ellipsis falls at the inline end and the tip follows the reading direction.
- Performance: one resize observer per label, and a tooltip only while the label is cut.
- Analytics: none; a label reports no outcome.
- Failure: an empty `text` draws an empty line with no tip.
-->

<!-- A cut label outside any control must be reachable by keyboard to be read in full. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<span
  bind:this={element}
  {...rest}
  class={['sui-clipped-label', className]}
  tabindex={alone ? 0 : undefined}
  {@attach measured(text)}>{text}</span
>
{#if clipped}
  <Tooltip anchor={element} {text} {mono} />
{/if}

<style>
  .sui-clipped-label {
    block-size: var(--sui-block-snap);
    display: block;
    min-inline-size: 0;
    overflow-x: clip;
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-clipped-label:focus-visible {
    border-radius: var(--sui-radius-chip);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
