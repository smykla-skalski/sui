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

- Semantics: a `<span>` with no role, whose text joins the name or the sentence it sits in; a caller may give it `role="status"` to speak changes.
- Content: plain words or inline content, read in order with the visible words around it.
- States: none; it is never drawn.
- Keyboard: none; it holds nothing focusable, and focusable content belongs in `SkipLink`.
- Pointer and touch: none; a one-pixel clip takes no press.
- Focus: none; it never takes or moves focus.
- Responsive: none; it takes no room at any width and never wraps the line it sits in.
- Accessibility: its words stay in the accessibility tree and in `innerText`, so a name built from them holds, and a live role on it is announced.
- Localization: its words come from the caller, so they follow the page's language.
- Performance: one clipped span with no script.
- Analytics: none, because it takes no action.
- Failure: empty content adds nothing to a name, and it never hides content from assistive technology.
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
