<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { follow, place, placedAt, type Placement } from '../internal/anchor.js';
  import { themeAt } from '../internal/theme.svelte.js';

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
    closeOnLeave = false,
    element = $bindable(null),
    class: className = '',
    onclose,
    ontoggle: ontoggleProp,
    onbeforetoggle: onbeforetoggleProp,
    onfocusout: onfocusoutProp,
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
    /** `auto` closes on Escape and on an outside press; `manual` stays through outside presses and closes on Escape or when told. */
    dismiss?: 'auto' | 'manual';
    /** Draws the same box in the page's flow, with no top layer, placement or light dismiss, for a preview. */
    inline?: boolean;
    /** Closes the layer when focus leaves it, as a Tab out does. A press on the anchor toggles it instead. */
    closeOnLeave?: boolean;
    element?: HTMLElement | null;
    class?: HTMLAttributes<HTMLDivElement>['class'];
    onclose?: () => void;
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'popover'> = $props();

  const placement = $derived({ side, align, offset });

  // A press on the anchor moves focus to it before its click toggles the layer, so that focus
  // move is not the reader leaving: closing here would let the click open the layer again.
  let pressingAnchor = false;

  $effect(() => {
    if (!closeOnLeave || !anchor) return;
    // The anchor a binding held when this ran; by teardown the binding may already be null.
    const target = anchor;
    // The press ends when the pointer lifts, so a later Tab or Shift+Tab onto the anchor is the
    // reader leaving again.
    const release = () => (pressingAnchor = false);
    const press = () => {
      pressingAnchor = true;
      addEventListener('pointerup', release, { capture: true, once: true });
      addEventListener('pointercancel', release, { capture: true, once: true });
    };
    target.addEventListener('pointerdown', press);
    return () => {
      target.removeEventListener('pointerdown', press);
      removeEventListener('pointerup', release, { capture: true });
      removeEventListener('pointercancel', release, { capture: true });
    };
  });

  function onfocusout(event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    onfocusoutProp?.(event);
    if (!closeOnLeave) return;
    const pressed = pressingAnchor;
    pressingAnchor = false;
    const next = event.relatedTarget;
    if (!(next instanceof Node) || element?.contains(next)) return;
    if (pressed && anchor?.contains(next)) return;
    open = false;
  }

  // The browser hands focus back from an auto popover by itself, but not from a manual one.
  let returnTo: HTMLElement | null = null;
  let focusInside = false;

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

  // A trigger that opens the layer through `popovertarget` is read as expanded, but the browser
  // writes no attribute for it, so the trigger says it here and can draw its open state.
  $effect(() => {
    if (!(anchor instanceof HTMLButtonElement) || anchor.popoverTargetElement !== element) return;
    anchor.setAttribute('aria-expanded', String(open));
  });

  // The transform that folds the box into a line on its own edge that faces the trigger, as
  // long as the trigger is along that edge: the shape it grows out of on open and folds back
  // into on close. The line stays on the box's side of the gap, so it never covers the trigger.
  function atTrigger(box: HTMLElement, trigger: Element): string | null {
    const from = trigger.getBoundingClientRect();
    const at = placedAt(box);
    const width = box.offsetWidth;
    const height = box.offsetHeight;
    if (!from.width || !from.height || !width || !height || !at) return null;
    const { left, top } = at;
    const side = box.dataset.side;
    if (side === 'inline-start' || side === 'inline-end') {
      // The edge that faces the trigger, whichever side the reading direction put the box on.
      const x = left >= from.right - 0.5 ? 0 : width;
      return `translate(${x}px, ${from.top - top}px) scale(0, ${from.height / height})`;
    }
    const y = side === 'block-start' ? height : 0;
    return `translate(${from.left - left}px, ${y}px) scale(${from.width / width}, 0)`;
  }

  const growth = (shape: string): Keyframe[] => [
    { opacity: 0, transform: shape },
    { opacity: 1, offset: 0.3 },
    { transform: 'none' }
  ];

  // Entry runs through the Web Animations API because its first frame needs the placed box's
  // measured size and side, which a stylesheet's starting style cannot know. Only transform and
  // opacity move, so the compositor runs it and input is never held. The box is fully opaque
  // within the first third, while still small, so its words are read only once nearly unscaled.
  function grow(box: HTMLElement, trigger: Element): void {
    const look = getComputedStyle(box);
    const time = (name: string) => parseFloat(look.getPropertyValue(name));
    const easing = look.getPropertyValue('--sui-ease-standard').trim();
    let shape = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? null
      : atTrigger(box, trigger);
    if (!shape) {
      box.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: time('--sui-duration-press'),
        easing
      });
      return;
    }
    const animation = box.animate(growth(shape), {
      duration: time('--sui-duration-open'),
      easing
    });
    // Content that measures itself after its first frame, such as a segmented control choosing
    // its form, can resize the box while it grows; the start shape follows the new size, so the
    // growth still begins at the trigger.
    const steer = () => {
      if (animation.playState !== 'running') return;
      const next = atTrigger(box, trigger);
      if (next && next !== shape) {
        shape = next;
        (animation.effect as KeyframeEffect).setKeyframes(growth(next));
      }
      requestAnimationFrame(steer);
    };
    requestAnimationFrame(steer);
  }

  function onbeforetoggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    onbeforetoggleProp?.(event);
    if (!element || !anchor) return;
    const target = element;
    const against = anchor;
    // The browser shows the box only after this event, and a microtask can still run before
    // that; the next frame's callbacks run after the show and before the first paint, so the
    // box is placed and starts growing before it is ever drawn.
    if (event.newState === 'open') {
      const from = document.activeElement;
      returnTo = from instanceof HTMLElement && !target.contains(from) ? from : null;
      requestAnimationFrame(() => {
        place(target, against, placement);
        grow(target, against);
      });
    } else {
      focusInside = target.contains(document.activeElement);
      for (const animation of target.getAnimations()) animation.cancel();
      target.style.setProperty('--sui-popover-from', atTrigger(target, against) ?? 'none');
    }
  }

  function ontoggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    ontoggleProp?.(event);
    open = event.newState === 'open';
    if (open) return;
    if (dismiss === 'manual' && focusInside) {
      const back = returnTo?.isConnected ? returnTo : anchor;
      if (back instanceof HTMLElement) back.focus({ preventScroll: true });
    }
    focusInside = false;
    onclose?.();
  }

  // A manual layer ignores outside presses, so Escape is the reader's way out of it, wherever
  // focus is. It listens last, so a control that handles its own Escape, such as a combobox's
  // field, or a tooltip, takes it first; a dialog around the layer lets it through.
  $effect(() => {
    if (!open || inline || dismiss !== 'manual') return;
    const onkeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // A menu or picker open inside the layer closes first; `:is()` keeps a browser without
      // `:open` from rejecting the selector.
      if (element?.querySelector(':is([popover]:popover-open, select:open)')) return;
      event.preventDefault();
      event.stopPropagation();
      open = false;
    };
    addEventListener('keydown', onkeydown);
    return () => removeEventListener('keydown', onkeydown);
  });
</script>

<!--
@component
The one floating layer. It lives in the browser's top layer through the Popover API, so it
is never clipped by a scrolling card and never fights a z-index. A trigger whose
`popovertarget` names this `id` toggles it natively; the browser then keeps that trigger out
of light dismiss and returns focus to it on close. `open` can also be driven directly. It is a
surface of its own, so it wears the theme of the page or of a subtree themed on purpose, never
a tone the place it opens from restates, such as a changed setting row's gold.

The box is placed beside `anchor`, flips to the other side when that one has more room, and
stays inside the viewport. It is as tall as the room it has and scrolls inside itself.
Menus, listboxes and pickers put their own content and keyboard model inside it. With `inline`
the same box sits in the page's flow instead, so a preview shows it without a click.

A panel of content that is not a menu or listbox takes `role="dialog"` and an `aria-labelledby`
pointing at its heading, and its trigger says `aria-expanded`. `dismiss="manual"` is for a layer
that must survive an outside press, such as one holding a half-typed value: give it a visible
close control, because only Escape and that control end it.

- Semantics: a `popover` box with no role of its own; the content brings its role (`menu`, `listbox`, or `dialog` with a name) and the trigger points at it with `popovertarget` or `aria-controls`.
- Content: any content, at most the viewport's width less 16px and as tall as the room beside the trigger, scrolling inside past that.
- States: closed, opening (it grows out of a line on its edge that faces the trigger), open, closing (it folds back into that line), flipped to the other side, and inline in the page's flow.
- Keyboard: Escape closes it, auto or manual, and the content's own keys work inside; the Escape stops at this layer.
- Pointer and touch: an outside press closes an auto layer and never a manual one, and a press inside closes only a picker open inside it; the trigger's own target sizes apply.
- Focus: an `[autofocus]` element inside takes focus on open; on close, focus inside returns to the element that had it before, or to the anchor. With `closeOnLeave`, focus moving out of the layer closes it, as a Tab out does, a press on its words or padding focuses the box itself, so it is never the reader leaving, and a press on the anchor toggles it closed rather than closing and reopening it.
- Responsive: it flips to the side with more room, stays 8px inside the viewport, caps its height to the room it has and scrolls inside.
- Accessibility: in the top layer it is never inert under a dialog; the content's role and the trigger's `aria-expanded` carry its meaning.
- Localization: `start` and `end` alignment and the inline sides follow the reading direction, so a right-to-left page hangs it from the mirrored edge.
- Performance: the box scrolls with the page in the same frame as its trigger. While open it reads the trigger's box once a frame and is placed again only when the trigger moves within the page (a scrolling container, content above that changes height), the viewport resizes or either box changes size, keeping the side it opened on; a scroll inside the box never moves it. The growth runs on transform and opacity only, and only fades under reduced motion.
- Analytics: `onclose` reports every close, and `ontoggle` reports both directions.
- Failure: with no `anchor` it opens without placement or growth; content taller than the room scrolls inside instead of leaving the screen.
-->
<!-- A press on words or padding focuses the nearest focusable ancestor, which for a box in the
     top layer is a page ancestor, such as a `main` with `tabindex="-1"`, so a layer that closes
     when focus leaves takes that focus itself. Any other box stays out of focus, so one that
     scrolls with nothing focusable inside remains a keyboard stop to scroll by. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={element}
  {id}
  popover={inline ? undefined : dismiss}
  tabindex={closeOnLeave ? -1 : undefined}
  data-sui-theme={themeAt(element?.parentElement)}
  class={['sui-popover', { inline }, className]}
  data-width={width}
  {onbeforetoggle}
  {ontoggle}
  {onfocusout}
  {...rest}
>
  {@render children()}
</div>

<style>
  .sui-popover {
    background: var(--sui-popover-bg);
    border: var(--sui-stroke) solid var(--sui-popover-border);
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
    /* In the top layer this is the page, so the box scrolls with the page and its trigger. */
    position: absolute;
    transform-origin: 0 0;
  }

  /* Closing shrinks the box back into its trigger, faster than it grew (L-74). `overlay` and
     `display` hold it in the top layer until the shrink ends. */
  .sui-popover[popover]:not(:popover-open) {
    opacity: 0;
    transform: var(--sui-popover-from, none);
    transition:
      opacity var(--sui-duration-press) var(--sui-ease-standard),
      transform var(--sui-duration-press) var(--sui-ease-standard),
      overlay var(--sui-duration-press) allow-discrete,
      display var(--sui-duration-press) allow-discrete;
  }

  /* In flow the room a list has is the viewport, so a listbox keeps its 20rem cap. */
  .sui-popover.inline {
    --sui-floating-available-block: 100dvh;
    max-inline-size: 100%;
    position: static;
  }

  .sui-popover[data-width='trigger'] {
    inline-size: var(--sui-floating-anchor-inline);
  }

  .sui-popover[data-width='min-trigger'] {
    min-inline-size: var(--sui-floating-anchor-inline);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-popover[popover]:not(:popover-open) {
      transform: none;
      transition: none;
    }
  }
</style>
