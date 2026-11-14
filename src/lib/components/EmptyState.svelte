<script lang="ts">
  import { mark } from '../words.js';
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
    const words = [title, description, step].filter(Boolean).join(mark('comma'));
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
`ErrorState`. There is no decorative icon. The title sits 12px above the explanation, and
the next step, a control or words, stands a panel gap under it.

- Semantics: a `div` of two paragraphs and the action; with `live` the title and description also reach a polite `status`.
- Content: a plain title, one sentence of explanation and one next step, as an `action` such as a `Button` that clears the filter, or as `step` when the step happens elsewhere.
- States: one drawn state, on the raised ground inside a dashed frame that marks the room its content would fill.
- Keyboard: none of its own; the action takes Tab.
- Pointer and touch: the action keeps its own 34px and 44px targets.
- Focus: it never takes focus; when a filter empties a list, focus stays on the field the reader typed in.
- Responsive: it fills its column, the copy and the actions wrap, and on a phone the panel pads 20px so the words keep more of the width.
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
  </div>
  {#if step}<p class="sui-empty-state-step">{step}</p>{/if}
  {#if action}
    <div class="sui-empty-state-action">{@render action()}</div>
  {/if}
</div>
{#if live}
  <VisuallyHidden role="status">{said}</VisuallyHidden>
{/if}

<style>
  /* Stretched beside a taller panel, its words and its action keep to the top, the action one
     gap under the words it answers, never the panel's foot away from them (L-59). A dashed
     edge marks the room the content would fill, apart from a solid card; a dash shows only
     half its length, so it takes the control edge to read as firm as a hairline. */
  .sui-empty-state {
    align-content: start;
    background: var(--sui-surface-raised);
    border: var(--sui-stroke) solid transparent;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-5);
    justify-items: start;
    min-inline-size: 0;
    padding: var(--sui-space-8) var(--sui-space-6);
    position: relative;
  }

  /* A browser's own dashes stretch to fit each side and blur at their ends, so the edge is
     drawn in layers on whole pixels: a solid 1px quarter arc closes each 8px corner, centred
     half a pixel in as a 1px border's curve is, and between the arcs each
     side runs 4px dashes and 4px gaps from its own start. The arcs' radius follows
     --sui-radius-control. */
  .sui-empty-state::before {
    --sui-local-dash: currentcolor 0 4px, transparent 4px 8px;
    background: var(--sui-border-control);
    content: '';
    inset: calc(-1 * var(--sui-stroke));
    mask-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M0.5 8A7.5 7.5 0 0 1 8 0.5' fill='none' stroke='%23000'/%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M0 0.5A7.5 7.5 0 0 1 7.5 8' fill='none' stroke='%23000'/%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M7.5 0A7.5 7.5 0 0 1 0 7.5' fill='none' stroke='%23000'/%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M8 7.5A7.5 7.5 0 0 1 0.5 0' fill='none' stroke='%23000'/%3E%3C/svg%3E"),
      repeating-linear-gradient(to right, var(--sui-local-dash)),
      repeating-linear-gradient(to right, var(--sui-local-dash)),
      repeating-linear-gradient(to bottom, var(--sui-local-dash)),
      repeating-linear-gradient(to bottom, var(--sui-local-dash));
    mask-position:
      left top,
      right top,
      right bottom,
      left bottom,
      8px top,
      8px bottom,
      left 8px,
      right 8px;
    mask-repeat: no-repeat;
    mask-size:
      8px 8px,
      8px 8px,
      8px 8px,
      8px 8px,
      calc(100% - 16px) 1px,
      calc(100% - 16px) 1px,
      1px calc(100% - 16px),
      1px calc(100% - 16px);
    pointer-events: none;
    position: absolute;
  }

  @media (forced-colors: active) {
    .sui-empty-state {
      border: var(--sui-stroke) dashed CanvasText;
    }

    .sui-empty-state::before {
      display: none;
    }
  }

  /* The title stands a title gap above its words. A step in words takes the place a control
     would, a panel gap under them, so the reader's next move reads apart from why the list is
     empty (L-59). */
  .sui-empty-state-copy {
    display: grid;
    gap: var(--sui-title-copy-gap);
    min-inline-size: 0;
  }

  p {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .sui-empty-state-title {
    text-wrap: balance;
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-empty-state-description {
    color: var(--sui-text-secondary);
    max-inline-size: var(--sui-measure);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .sui-empty-state-step {
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    max-inline-size: var(--sui-measure);
  }

  .sui-empty-state-action {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  /* A phone's short screen takes the room around the words down to 20px all round. */
  @media (max-width: 47.9375rem) {
    .sui-empty-state {
      gap: var(--sui-space-4);
      padding: var(--sui-space-5);
    }
  }
</style>
