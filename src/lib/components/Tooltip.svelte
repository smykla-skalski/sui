<script lang="ts">
  import { follow, place, type Placement } from '../internal/anchor.js';
  import { themeAt } from '../internal/theme.svelte.js';

  let {
    anchor,
    text,
    describe,
    mono = false,
    side = 'block-start',
    align = 'center',
    open = $bindable(false),
    preview = false
  }: {
    /** The element the tip explains and stands beside: a control, or a label inside one. */
    anchor: HTMLElement | null | undefined;
    text: string;
    /** Link the tip to its control as a description. Left out, it does so unless the control already carries the same words. */
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
  /* A negative tabindex is focus a script moves, such as the page's main landmark after a
     skip link: a reader never tabs there, and it holds every label on the page. */
  const FOCUSABLE =
    "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^='-'])";

  let element = $state<HTMLElement | null>(null);
  let showTimer = 0;
  let hideTimer = 0;
  let pressTimer = 0;

  /* The control whose keyboard focus shows the tip: the anchor, or the control a bare label
     inside it sits in, so a label's tip still answers the keyboard. */
  const owner = $derived(anchor?.closest<HTMLElement>(FOCUSABLE) ?? anchor);

  const words = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

  /* A tip that repeats words its control already carries, as an icon button's name does, stays
     out of the accessibility tree; anything else describes the control. */
  const describes = $derived.by(() => {
    if (describe !== undefined) return describe;
    if (!owner) return false;
    let said = words(`${owner.getAttribute('aria-label') ?? ''} ${owner.textContent ?? ''}`);
    // A tip drawn inside its own control would otherwise count as words the control carries.
    if (element && owner.contains(element)) said = said.replace(words(text), '');
    return !said.includes(words(text));
  });

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

  // A tip shown by keyboard focus stays while the control has it, wherever the pointer goes.
  function leave(event: PointerEvent): void {
    if (hovers(event) && !owner?.matches(':focus-visible')) hide(LEAVE_GRACE);
  }

  $effect(() => {
    const target = anchor;
    const control = owner;
    if (!target || !control || preview) return;
    const onenter = (event: PointerEvent) => {
      if (hovers(event)) show(SHOW_DELAY);
    };
    const onfocus = () => {
      if (control.matches(':focus-visible')) show(0);
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
      if (!control.matches(':focus-visible')) close();
    };
    // Chrome fires blur while it removes a focused control, inside the update that removes it,
    // where state cannot change, so the tip closes once that update is done, unless focus came
    // straight back.
    const onblur = () =>
      queueMicrotask(() => {
        if (!control.matches(':focus')) close();
      });
    target.addEventListener('pointerenter', onenter);
    target.addEventListener('pointerleave', leave);
    control.addEventListener('focus', onfocus);
    control.addEventListener('blur', onblur);
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
      control.removeEventListener('focus', onfocus);
      control.removeEventListener('blur', onblur);
      target.removeEventListener('pointerdown', ondown);
      target.removeEventListener('pointerup', onup);
      target.removeEventListener('pointercancel', onup);
      document.removeEventListener('pointerdown', onpress, { capture: true });
      removeEventListener('keydown', onkeydown, { capture: true });
      removeEventListener('scroll', onscroll, { capture: true });
    };
  });

  $effect(() => {
    const target = owner;
    if (!describes || !target) return;
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

Anchor it to an interactive element, or to a label inside one, and never put the one copy of
something the reader needs in it. A label's tip shows on the label's hover and on its control's
keyboard focus. A tip that repeats words its control already carries, as an icon button's name
does, stays out of the accessibility tree. Any other tip describes the control through
`aria-describedby`; `describe` forces either way.

- Semantics: a `tooltip` in the top layer, tied to its control by `aria-describedby` when it adds words, and `aria-hidden` when it repeats them.
- Content: one short line of plain text, wrapping at 17rem; `mono` for a tip that is one identifier.
- States: hidden, waiting (250ms on hover), shown, lingering (120ms after the pointer leaves, 1.5s after a long press), and drawn in place with `preview`.
- Keyboard: focus on its control shows it at once, blur hides it, and Escape hides it without reaching a dialog around it.
- Pointer and touch: hover shows it after a pause and the pointer may move onto it; on touch a 500ms press shows it and a tap passes through as a click.
- Focus: it never takes focus; the control keeps it.
- Responsive: placed beside the anchor, flipped to the side with room and held 8px inside the viewport; it wraps rather than widening past 17rem.
- Accessibility: hoverable, dismissable and persistent as WCAG 1.4.13 asks, read as a description only when it adds words.
- Localization: `text` is the caller's words, and the inline sides and `start`/`end` alignment follow the reading direction.
- Performance: one element per instance with listeners only on its anchor and control; placement runs only while shown, and the fade is opacity alone, removed under reduced motion.
- Analytics: none, because a tip reports no outcome; the control it explains reports its own.
- Failure: with no anchor it never shows; text too long for one line wraps instead of clipping.
-->

<div
  bind:this={element}
  {id}
  popover={preview ? undefined : 'manual'}
  data-sui-theme={themeAt(element?.parentElement)}
  role="tooltip"
  class="sui-tooltip"
  class:mono
  class:preview
  aria-hidden={describes ? undefined : 'true'}
  onpointerenter={(event) => {
    if (hovers(event)) clearTimeout(hideTimer);
  }}
  onpointerleave={leave}
>
  {text}
</div>

<style>
  .sui-tooltip {
    align-content: center;
    background: var(--sui-popover-bg);
    border: var(--sui-stroke) solid var(--sui-popover-border);
    border-radius: var(--sui-radius-popover);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    inline-size: max-content;
    inset: auto;
    margin: 0;
    max-inline-size: min(17rem, calc(100vw - 3rem));
    opacity: 1;
    /* A popover scrolls by default, and the trimmed words overhang the box, so the tip would be
       a scroller that Tab can enter. It is one short line that never scrolls. */
    overflow: visible;
    padding: var(--sui-space-2) var(--sui-space-3);
    /* The words run from their cap line to their baseline, so the padding is the room above
       and under them alike (L-102). */
    text-box: trim-both cap alphabetic;
    block-size: var(--sui-block-snap);
    /* In the top layer this is the page, so the tip scrolls with the page and its anchor. */
    position: absolute;
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
