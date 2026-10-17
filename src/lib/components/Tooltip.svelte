<script lang="ts">
  import { follow, place, type Placement } from '../internal/anchor.js';

  let {
    anchor,
    text,
    describe = false,
    mono = false,
    side = 'block-start',
    align = 'center',
    open = $bindable(false),
    preview = false
  }: {
    /** The interactive element the tip explains. */
    anchor: HTMLElement | null | undefined;
    text: string;
    /** Link the tip to the anchor as its description. Leave off when the tip repeats the anchor's own name. */
    describe?: boolean;
    /** For a tip whose whole text is one identifier. */
    mono?: boolean;
    side?: Placement['side'];
    align?: Placement['align'];
    /** Lets a caller open the tip itself, as a tap on a help mark does. */
    open?: boolean;
    /** Draws the tip in the page's flow where the component sits, with no timers or placement. */
    preview?: boolean;
  } = $props();

  const id = $props.id();
  const SHOW_DELAY = 250;
  const LEAVE_GRACE = 120;
  const PRESS_HOLD = 500;
  const PRESS_LINGER = 1500;

  let element = $state<HTMLElement | null>(null);
  let showTimer = 0;
  let hideTimer = 0;
  let pressTimer = 0;

  function show(delay: number): void {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = window.setTimeout(() => (open = true), delay);
  }

  function hide(delay: number): void {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => (open = false), delay);
  }

  function close(): void {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    clearTimeout(pressTimer);
    open = false;
  }

  // Touch has no hover: its pointers enter and leave only around a press.
  const hovers = (event: PointerEvent) => event.pointerType !== 'touch';

  // A tip shown by keyboard focus stays while the anchor has it, wherever the pointer goes.
  function leave(event: PointerEvent): void {
    if (hovers(event) && !anchor?.matches(':focus-visible')) hide(LEAVE_GRACE);
  }

  $effect(() => {
    const target = anchor;
    if (!target || preview) return;
    const onenter = (event: PointerEvent) => {
      if (hovers(event)) show(SHOW_DELAY);
    };
    const onfocus = () => {
      if (target.matches(':focus-visible')) show(0);
    };
    // A tap shows nothing and its click lands as usual. A hold shows the tip, which stays a
    // moment after the finger lifts.
    const ondown = (event: PointerEvent) => {
      close();
      if (!hovers(event)) pressTimer = window.setTimeout(() => (open = true), PRESS_HOLD);
    };
    const onup = (event: PointerEvent) => {
      if (hovers(event)) return;
      clearTimeout(pressTimer);
      if (open) hide(PRESS_LINGER);
    };
    // A tapped button takes no focus in Safari, so no blur would ever close a tip it opened.
    const onpress = (event: PointerEvent) => {
      const node = event.target as Node;
      if (open && !target.contains(node) && !element?.contains(node)) close();
    };
    // The tip is the innermost layer, so the Escape that closes it never reaches a dialog.
    const onkeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !open) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    // A scroll moves the anchor out from under a still pointer without a pointerleave.
    const onscroll = () => {
      if (!target.matches(':focus-visible')) close();
    };
    target.addEventListener('pointerenter', onenter);
    target.addEventListener('pointerleave', leave);
    target.addEventListener('focus', onfocus);
    target.addEventListener('blur', close);
    target.addEventListener('pointerdown', ondown);
    target.addEventListener('pointerup', onup);
    target.addEventListener('pointercancel', onup);
    document.addEventListener('pointerdown', onpress, { capture: true });
    addEventListener('keydown', onkeydown, { capture: true });
    addEventListener('scroll', onscroll, { capture: true, passive: true });
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(pressTimer);
      target.removeEventListener('pointerenter', onenter);
      target.removeEventListener('pointerleave', leave);
      target.removeEventListener('focus', onfocus);
      target.removeEventListener('blur', close);
      target.removeEventListener('pointerdown', ondown);
      target.removeEventListener('pointerup', onup);
      target.removeEventListener('pointercancel', onup);
      document.removeEventListener('pointerdown', onpress, { capture: true });
      removeEventListener('keydown', onkeydown, { capture: true });
      removeEventListener('scroll', onscroll, { capture: true });
    };
  });

  $effect(() => {
    const target = anchor;
    if (!describe || !target) return;
    const before = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', before ? `${before} ${id}` : id);
    return () => {
      if (before === null) target.removeAttribute('aria-describedby');
      else target.setAttribute('aria-describedby', before);
    };
  });

  $effect(() => {
    if (!element || preview) return;
    const shown = element.matches(':popover-open');
    if (open && !shown) element.showPopover();
    else if (!open && shown) element.hidePopover();
    if (!open || !anchor) return;
    const placement = { side, align, offset: 6 };
    place(element, anchor, placement);
    return follow(element, anchor, placement);
  });
</script>

<!--
@component
The one tooltip. It opens after a short pause on hover and at once on keyboard focus. On a touch
screen a long press opens it, and it stays a moment after the finger lifts. It stays while the
pointer moves onto it. It closes on Escape, on blur and on a press anywhere, as WCAG asks of
content that appears on hover or focus. The Escape that closes it stops there, so a dialog
around it stays open.

Anchor it only to an interactive element, and never put the one copy of something the reader
needs in it. A tip that repeats a control's accessible name, as an icon button's does, stays out
of the accessibility tree. A tip that adds a description sets `describe`, and the anchor then
points at it with `aria-describedby`.
-->

<div
  bind:this={element}
  {id}
  popover={preview ? undefined : 'manual'}
  role="tooltip"
  class="sui-tooltip"
  class:mono
  class:preview
  aria-hidden={describe ? undefined : 'true'}
  onpointerenter={(event) => {
    if (hovers(event)) clearTimeout(hideTimer);
  }}
  onpointerleave={leave}
>
  {text}
</div>

<style>
  .sui-tooltip {
    background: var(--sui-popover-bg);
    border: 1px solid var(--sui-popover-border);
    border-radius: var(--sui-radius-popover);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    inline-size: max-content;
    inset: auto;
    margin: 0;
    max-inline-size: min(17rem, calc(100vw - 3rem));
    opacity: 1;
    padding: var(--sui-space-2) var(--sui-space-3);
    position: fixed;
    text-align: start;
    transition:
      opacity var(--sui-duration-fast) var(--sui-ease-standard),
      overlay var(--sui-duration-fast) allow-discrete,
      display var(--sui-duration-fast) allow-discrete;
  }

  .sui-tooltip[popover]:not(:popover-open) {
    opacity: 0;
    transition-duration: var(--sui-duration-press);
  }

  @starting-style {
    .sui-tooltip:popover-open {
      opacity: 0;
    }
  }

  .preview {
    max-inline-size: min(17rem, 100%);
    position: static;
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--sui-font-size-micro);
    line-height: var(--sui-leading-micro);
    overflow-wrap: anywhere;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-tooltip {
      transition: none;
    }
  }
</style>
