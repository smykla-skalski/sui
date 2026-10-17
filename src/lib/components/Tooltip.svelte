<script lang="ts">
  import { follow, place, type Placement } from '../internal/anchor.js';

  let {
    anchor,
    text,
    describe = false,
    mono = false,
    side = 'block-start',
    align = 'center',
    open = $bindable(false)
  }: {
    /** The element the tip explains. It shows on hover after a short pause and at once on keyboard focus. */
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
  } = $props();

  const id = $props.id();
  const SHOW_DELAY = 250;
  const LEAVE_GRACE = 120;

  let element = $state<HTMLElement | null>(null);

  $effect(() => {
    const target = anchor;
    if (!target) return;
    let showTimer = 0;
    let hideTimer = 0;
    const show = (delay: number) => {
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      showTimer = window.setTimeout(() => (open = true), delay);
    };
    const hide = () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => (open = false), LEAVE_GRACE);
    };
    const onfocus = () => {
      if (target.matches(':focus-visible')) show(0);
    };
    const onkeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        clearTimeout(showTimer);
        open = false;
      }
    };
    const enter = () => show(SHOW_DELAY);
    // A scroll moves the anchor out from under a still pointer without a pointerleave.
    const onscroll = () => {
      if (!target.matches(':focus-visible')) close();
    };
    const close = () => {
      clearTimeout(showTimer);
      open = false;
    };
    target.addEventListener('pointerenter', enter);
    target.addEventListener('pointerleave', hide);
    target.addEventListener('focus', onfocus);
    target.addEventListener('blur', close);
    target.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onkeydown);
    addEventListener('scroll', onscroll, { capture: true, passive: true });
    return () => {
      removeEventListener('scroll', onscroll, { capture: true });
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      target.removeEventListener('pointerenter', enter);
      target.removeEventListener('pointerleave', hide);
      target.removeEventListener('focus', onfocus);
      target.removeEventListener('blur', close);
      target.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onkeydown);
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
    if (!element) return;
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
The one tooltip. It opens after a short pause on hover and at once on keyboard focus, stays
while the pointer moves onto it, and closes on Escape, on blur and on a press, which is what
WCAG asks of content that appears on hover or focus.

A tip that repeats a control's accessible name, as an icon button's does, stays out of the
accessibility tree. A tip that adds a description sets `describe`, and the anchor then
points at it with `aria-describedby`.
-->

<div
  bind:this={element}
  {id}
  popover="manual"
  role="tooltip"
  class="sui-tooltip"
  class:mono
  aria-hidden={describe ? undefined : 'true'}
  onpointerenter={() => (open = true)}
  onpointerleave={() => (open = false)}
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

  .sui-tooltip:not(:popover-open) {
    opacity: 0;
    transition-duration: var(--sui-duration-press);
  }

  @starting-style {
    .sui-tooltip:popover-open {
      opacity: 0;
    }
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
