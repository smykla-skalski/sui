<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    title,
    description,
    action,
    step,
    live = false,
    class: className = '',
    ...rest
  }: {
    /** The state, plainly, without trailing punctuation. */
    title: string;
    /** One sentence on why. */
    description: string;
    /** Announces the state once it appears, for a list that a search or filter has just emptied. */
    live?: boolean;
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & (
    | {
        /** The one next step, usually a `Button`. */
        action: Snippet;
        step?: never;
      }
    | {
        action?: never;
        /** The next step in words, when it happens elsewhere and no control here can take it, such as waiting for a first run. */
        step: string;
      }
  ) &
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> = $props();

  /* Many screen readers skip a live region that enters the page with its words, so the words
     arrive a moment after the region does. */
  const SETTLE = 100;

  let said = $state('');

  $effect(() => {
    if (!live) return;
    const words = [title, description, step].filter(Boolean).join(', ');
    const timer = setTimeout(() => (said = words), SETTLE);
    return () => clearTimeout(timer);
  });
</script>

<!--
@component
What a collection says when it has nothing to show, standing where the content would be. It
names what happened and offers the next step, so it is never a dead end: a list that only
says "no results" leaves the reader to guess whether that is the filter, the access or the
data. It takes exactly one of `action`, a control that takes the step, or `step`, the step in
words when it happens elsewhere, such as waiting for a first run; it cannot be drawn with
neither.

An empty list is not an error and is not drawn as one; a request that failed is
`ErrorState`. There is no decorative icon. The title sits above the explanation with the
8px copy gap.

- Semantics: a `div` of two paragraphs and the action; with `live` the title and description also reach a polite `status`.
- Content: a plain title, one sentence of explanation and one next step, as an `action` such as a `Button` that clears the filter, or as `step` when the step happens elsewhere.
- States: one drawn state, on the raised ground inside a hairline frame.
- Keyboard: none of its own; the action takes Tab.
- Pointer and touch: the action keeps its own 34px and 44px targets.
- Focus: it never takes focus; when a filter empties a list, focus stays on the field the reader typed in.
- Responsive: it fills its column, and the copy and the actions wrap.
- Accessibility: the words say why the list is empty, and `live` announces the state when a search or a filter brings it.
- Localization: every word is the caller's, and it starts at the inline start, mirrored in a right-to-left page.
- Performance: a static block; `live` sets one short timer when it appears or its words change.
- Analytics: none of its own; the action reports the reader's next step.
- Failure: it is itself the empty state; a failed request is an `ErrorState` and a slow first load is a `Skeleton`; its type takes no empty state without a next step.
-->

<div {...rest} class={['sui-empty-state', className]}>
  <div class="sui-empty-state-copy">
    <p class="sui-empty-state-title">{title}</p>
    <p class="sui-empty-state-description">{description}</p>
    {#if step}<p class="sui-empty-state-step">{step}</p>{/if}
  </div>
  {#if action}
    <div class="sui-empty-state-action">{@render action()}</div>
  {/if}
</div>
{#if live}
  <VisuallyHidden role="status">{said}</VisuallyHidden>
{/if}

<style>
  .sui-empty-state {
    background: var(--sui-surface-raised);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
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
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-empty-state-description {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-empty-state-step {
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-empty-state-action {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }
</style>
