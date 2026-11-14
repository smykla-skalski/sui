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

  /* The spoken join as a CSS string, with a quote, a backslash or a control character escaped,
     so any language's mark reads as itself. */
  const cssString = (text: string) =>
    `"${text.replace(/[\\"]|[\u0000-\u001f\u007f]/g, (char) =>
      char === '\\' || char === '"' ? `\\${char}` : `\\${char.codePointAt(0)?.toString(16)} `
    )}"`;
</script>

<!--
@component
Facts on one line parted by a middle dot: a branch and a count, an owner and a time. The dot
is drawn, never typed into the words, and stands `--sui-sep-space` from each fact, so nothing
beside it adds space. It is read as the language's comma, and a line may wrap after a dot.

A string-only place (a title, a tooltip's words, a placeholder, an accessible name, a native
option) keeps its own typed separator instead.

- Semantics: a `span` of inline facts; each fact is an element, and the dot is generated content whose alternative text is `marks.comma`.
- Content: two or more short facts, each an element with no space around it in the markup.
- States: none of its own.
- Keyboard: none of its own; a fact may hold a link or a time.
- Pointer and touch: none of its own.
- Focus: none of its own.
- Responsive: the line wraps after a dot, never before one, and a fact moves to the next line whole; only a fact longer than the line, such as a long ID or address, breaks inside itself, so it never runs past its container.
- Accessibility: the dot is read as the comma of `marks.comma`, its alternative text, so the facts are heard apart without a symbol read aloud. In a name built from content, such as a link holding the line, Chrome puts a space before that comma.
- Localization: the spoken join is `marks.comma`; the dot and its spacing are logical and hold right to left.
- Performance: no script beyond the spoken join.
- Analytics: none.
- Failure: a fact that is not an element gets no dot after it, so wrap plain words in a `span`.
-->

<span
  {...rest}
  class={['sui-fact-line', className]}
  style:--sui-fact-join={cssString(mark('comma'))}>{@render children()}</span
>

<style>
  .sui-fact-line {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  /* Each fact is one box, so a short fact moves to the next line whole rather than leaving its
     last word alone there, and only a fact longer than the line breaks inside itself. Its width
     rounds up to the pixel and its last line keeps to its end edge, so the dot after its last
     word ends on a whole pixel. */
  .sui-fact-line > :global(*) {
    display: inline-block;
    inline-size: var(--sui-inline-snap);
    max-inline-size: 100%;
    text-align-last: end;
  }

  /* The dot ends the fact before it, so a wrapped line never starts with a dot. It is drawn, a
     2px circle on whole pixels on the middle of the words' x-height, where a typed dot's ink
     fell on any fraction of a pixel and drew lighter or darker by where the words ended (L-95).
     Its glyph stays only for the spoken join, clipped unseen, and its margins are the only
     space beside it (L-103). */
  .sui-fact-line > :global(:not(:last-child))::after {
    background: var(--sui-text-muted);
    block-size: var(--sui-stroke-bold);
    border-radius: var(--sui-radius-pill);
    color: transparent;
    content: '·' / var(--sui-fact-join);
    display: inline-block;
    inline-size: var(--sui-stroke-bold);
    margin-inline: var(--sui-sep-space);
    overflow: hidden;
    vertical-align: round(calc(0.5ex - var(--sui-stroke)), 1px);
  }

  @media (forced-colors: active) {
    .sui-fact-line > :global(:not(:last-child))::after {
      background: CanvasText;
      forced-color-adjust: none;
    }
  }
</style>
