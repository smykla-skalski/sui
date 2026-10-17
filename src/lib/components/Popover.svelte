<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { follow, place, type Placement } from '../internal/anchor.js';

  const fallbackId = $props.id();

  let {
    open = $bindable(false),
    anchor,
    id = fallbackId,
    side = 'block-end',
    align = 'start',
    offset = 4,
    width = 'auto',
    dismiss = 'auto',
    inline = false,
    element = $bindable(null),
    class: className = '',
    onclose,
    ontoggle: ontoggleProp,
    onbeforetoggle: onbeforetoggleProp,
    children,
    ...rest
  }: {
    open?: boolean;
    /** The element the layer is placed against, usually its trigger. */
    anchor: Element | null | undefined;
    /** Point a trigger's `popovertarget` at this, so the browser toggles it natively. */
    id?: string;
    side?: Placement['side'];
    align?: Placement['align'];
    offset?: number;
    /** `trigger` matches the anchor's width, `min-trigger` never goes narrower than it. */
    width?: 'auto' | 'min-trigger' | 'trigger';
    /** `auto` closes on Escape and on an outside press; `manual` closes only when told. */
    dismiss?: 'auto' | 'manual';
    /** Draws the same box in the page's flow, with no top layer, placement or light dismiss, for a preview. */
    inline?: boolean;
    element?: HTMLElement | null;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    onclose?: () => void;
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'popover'> = $props();

  const placement = $derived({ side, align, offset });

  $effect(() => {
    if (!element || inline) return;
    const shown = element.matches(':popover-open');
    if (open && !shown) element.showPopover();
    else if (!open && shown) element.hidePopover();
  });

  $effect(() => {
    if (!open || !element || !anchor || inline) return;
    place(element, anchor, placement);
    return follow(element, anchor, placement);
  });

  function onbeforetoggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    onbeforetoggleProp?.(event);
    // The browser shows the box when this event returns; measuring in a microtask still
    // lands before the first paint, so the box never flashes at the centred default.
    if (event.newState === 'open' && element && anchor) {
      const target = element;
      const against = anchor;
      queueMicrotask(() => place(target, against, placement));
    }
  }

  function ontoggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    ontoggleProp?.(event);
    open = event.newState === 'open';
    if (!open) onclose?.();
  }
</script>

<!--
@component
The one floating layer. It lives in the browser's top layer through the Popover API, so it
is never clipped by a scrolling card and never fights a z-index. A trigger whose
`popovertarget` names this `id` toggles it natively; the browser then keeps that trigger out
of light dismiss and returns focus to it on close. `open` can also be driven directly.

The box is placed beside `anchor`, flips to the other side when that one has more room, and
stays inside the viewport. It is as tall as the room it has and scrolls inside itself.
Menus, listboxes and pickers put their own content and keyboard model inside it. With `inline`
the same box sits in the page's flow instead, so a preview shows it without a click.
-->

<div
  bind:this={element}
  {id}
  popover={inline ? undefined : dismiss}
  class={['sui-popover', { inline }, className]}
  data-width={width}
  {onbeforetoggle}
  {ontoggle}
  {...rest}
>
  {@render children()}
</div>

<style>
  .sui-popover {
    background: var(--sui-popover-bg);
    border: 1px solid var(--sui-popover-border);
    border-radius: var(--sui-radius-popover);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    inset: auto;
    margin: 0;
    max-block-size: var(--sui-floating-available-block, none);
    max-inline-size: calc(100vw - 2 * var(--sui-space-2));
    opacity: 1;
    overflow: auto;
    padding: 0;
    position: fixed;
    transition:
      opacity var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-fast) var(--sui-ease-standard),
      overlay var(--sui-duration-fast) allow-discrete,
      display var(--sui-duration-fast) allow-discrete;
    translate: 0 0;
  }

  .sui-popover[popover]:not(:popover-open) {
    opacity: 0;
    transition-duration: var(--sui-duration-press);
  }

  @starting-style {
    .sui-popover:popover-open {
      opacity: 0;
      translate: 0 calc(-1 * var(--sui-space-1));
    }
  }

  /* In flow the room a list has is the viewport, so a listbox keeps its 20rem cap. */
  .sui-popover.inline {
    --sui-floating-available-block: 100dvh;
    max-inline-size: 100%;
    position: static;
  }

  .sui-popover[data-side='block-start'] {
    transform-origin: bottom;
  }

  .sui-popover[data-width='trigger'] {
    inline-size: var(--sui-floating-anchor-inline);
  }

  .sui-popover[data-width='min-trigger'] {
    min-inline-size: var(--sui-floating-anchor-inline);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-popover {
      transition: none;
    }
  }
</style>
