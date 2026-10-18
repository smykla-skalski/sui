<script lang="ts">
  import { mark } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    class: className = '',
    children,
    ...rest
  }: {
    /** Layout for the call site only, never the line's own paint. */
    class?: HTMLAttributes<HTMLSpanElement>['class'];
    /** The facts, each one element, such as `<span>main</span><span>84 files</span>`. */
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
Facts on one line parted by a middle dot: a branch and a count, an owner and a time. The dot
is drawn, never typed into the words, and stands `--sui-sep-space` from each fact, so nothing
beside it adds space. It is read as the language's comma, and a line may wrap after a dot.

A string-only place (a title, a tooltip's words, a placeholder, an accessible name, a native
option) keeps its own typed separator instead.

- Semantics: a `span` of inline facts; each fact is an element, the drawn dot is silent generated content, and each fact after the first starts with `marks.comma` as generated text with no size.
- Content: two or more short facts, each an element with no space around it in the markup.
- States: none of its own.
- Keyboard: none of its own; a fact may hold a link or a time.
- Pointer and touch: none of its own.
- Focus: none of its own.
- Responsive: the line wraps after a dot, never before one.
- Accessibility: the dot is read as the comma of `marks.comma`, so the facts are heard apart without a symbol read aloud.
- Localization: the spoken join is `marks.comma`; the dot and its spacing are logical and hold right to left.
- Performance: no script beyond the spoken join.
- Analytics: none.
- Failure: a fact that is not an element gets no dot after it, so wrap plain words in a `span`.
-->

<span
  {...rest}
  class={['sui-fact-line', className]}
  style:--sui-fact-join={JSON.stringify(mark('comma'))}>{@render children()}</span
>

<style>
  /* The dot ends the fact before it, with a break after it, so a wrapped line never starts with
     a dot, and its margins are the only space beside it (L-103). */
  .sui-fact-line > :global(:not(:last-child))::after {
    color: var(--sui-text-muted);
    content: '·\200B' / '';
    font-weight: var(--sui-weight-regular);
    margin-inline: var(--sui-sep-space);
  }

  /* The comma is heard and never drawn. Chrome puts a space before generated content that has
     alt text, so the dot stays silent and the comma is plain text with no size. */
  .sui-fact-line > :global(:not(:first-child))::before {
    content: var(--sui-fact-join);
    font-size: 0;
    line-height: 0;
  }
</style>
