<script lang="ts">
  import { mark, word } from '../words.js';
  import type { TransitionConfig } from 'svelte/transition';
  import Icon from '../icons/Icon.svelte';
  import {
    dismiss,
    hosts,
    toaster,
    toasts,
    type Toast,
    type ToastEnd,
    type ToastOptions
  } from '../internal/toasts.svelte.js';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    preview = false,
    items = [],
    dismissLabel,
    label,
    linger: lingerMs,
    hotkey
  }: {
    /** Draws `items` in the page's flow in place of the page's toasts, with no timers and no live region. */
    preview?: boolean;
    items?: readonly ToastOptions[];
    /** Each Dismiss button's name. Set on the page's `Toaster`, it holds for every dialog's toasts too. */
    dismissLabel?: string;
    /** The stack's landmark name. */
    label?: string;
    /** How long a toast without an action stays, in milliseconds, before it leaves. */
    linger?: number;
    /** The key (`KeyboardEvent.key`) that moves focus to the newest toast. */
    hotkey?: string;
  } = $props();

  // The page's Toaster speaks for every Toaster, so a dialog's own stack keeps its words.
  $effect(() => {
    if (preview) return;
    if (dismissLabel !== undefined) toaster.dismissLabel = dismissLabel;
    if (label !== undefined) toaster.label = label;
    if (lingerMs !== undefined) toaster.linger = lingerMs;
    if (hotkey !== undefined) toaster.hotkey = hotkey;
  });

  const words = $derived({
    dismiss: dismissLabel ?? toaster.dismissLabel ?? word('Toaster.dismissLabel', 'Dismiss'),
    region: label ?? toaster.label ?? word('Toaster.label', 'Notifications'),
    linger: lingerMs ?? toaster.linger,
    hotkey: hotkey ?? toaster.hotkey
  });

  let stack = $state<HTMLElement | null>(null);
  let hovered = $state(false);
  let focused = $state(false);
  // Where focus was before it entered the stack, so closing a toast can hand it back.
  let before: HTMLElement | null = null;

  const host = $derived(stack?.closest('dialog') ?? null);
  const top = $derived(!preview && stack !== null && (hosts.at(-1) ?? null) === host);
  // Negative ids never match a live toast, so Dismiss in a preview takes nothing back.
  const shown = $derived<Toast[]>(
    preview
      ? items.map((item, index) => ({
          ...item,
          tone: item.tone ?? 'neutral',
          id: -1 - index,
          host: null
        }))
      : top
        ? toasts
        : []
  );
  // Each toast is announced once, by the regions of the layer that was topmost when it came.
  const heard = $derived(
    preview || stack === null ? [] : toasts.filter((item) => item.host === host)
  );

  $effect(() => {
    if (!stack || preview) return;
    const visible = stack.matches(':popover-open');
    if (top && shown.length > 0 && !visible) stack.showPopover();
    else if (!top && visible) stack.hidePopover();
  });

  // A stack taller than the screen scrolls, and the newest toast, at its end, stays in view
  // unless the reader is working inside the stack.
  $effect(() => {
    if (!stack || preview || shown.length === 0 || focused) return;
    stack.scrollTop = stack.scrollHeight;
  });

  // The hotkey reaches the newest toast from anywhere, as a landmark jump would.
  $effect(() => {
    if (!top || !stack) return;
    const into = stack;
    const onkeydown = (event: KeyboardEvent) => {
      if (event.key !== words.hotkey || event.defaultPrevented) return;
      const newest = [...into.querySelectorAll<HTMLElement>('.sui-toast')].at(-1);
      const control = newest?.querySelector<HTMLElement>('button');
      if (!control) return;
      event.preventDefault();
      control.focus();
    };
    addEventListener('keydown', onkeydown);
    return () => removeEventListener('keydown', onkeydown);
  });

  // The stack leaves the top layer once the last toast has faded.
  function settle(): void {
    if (shown.length === 0 && stack?.matches(':popover-open')) stack.hidePopover();
  }

  // A neutral toast's clock restarts in full once the reader stops hovering or focusing the stack.
  function linger(item: Toast) {
    return () => {
      if (preview || hovered || focused || item.tone === 'danger' || item.action) return;
      const timer = setTimeout(() => dismiss(item.id, 'expired'), words.linger);
      return () => clearTimeout(timer);
    };
  }

  function onfocusin(event: FocusEvent): void {
    focused = true;
    const from = event.relatedTarget;
    if (!(from instanceof Node && stack?.contains(from)))
      before = from instanceof HTMLElement ? from : null;
  }

  // Escape hands focus back to where it came from, and stops here so a dialog around the
  // stack stays open.
  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !before?.isConnected) return;
    event.preventDefault();
    event.stopPropagation();
    before.focus();
  }

  // Focus on a removed button falls to the body, so it goes back to where it came from, or to
  // the next toast's Dismiss when that place is gone.
  function close(item: Toast, event: MouseEvent, reason: ToastEnd): void {
    const leaving = (event.currentTarget as HTMLElement).closest<HTMLElement>('.sui-toast');
    if (stack && leaving?.contains(document.activeElement)) {
      before?.focus();
      if (!before || document.activeElement !== before) {
        // The neighbours come from the stack as drawn, skipping any toast that is fading out.
        const all = [...stack.querySelectorAll<HTMLElement>('.sui-toast')];
        const at = all.indexOf(leaving);
        const live = (node: HTMLElement) =>
          node !== leaving && toasts.some((other) => String(other.id) === node.dataset.toast);
        const next = all.slice(at + 1).find(live) ?? all.slice(0, at).findLast(live);
        next?.querySelector<HTMLElement>('[data-dismiss]')?.focus();
      }
      // A removed element never reports losing focus, so the hold is let go by hand.
      focused = !leaving.contains(document.activeElement) && stack.contains(document.activeElement);
    }
    dismiss(item.id, reason);
  }

  // The toast leaves before its action runs, so an action that raises the next toast or takes
  // this one back finds the stack already settled.
  function run(item: Toast, event: MouseEvent): void {
    close(item, event, 'acted');
    item.action?.run();
  }

  // Exit reads the fast duration token and keeps only the fade when motion is reduced.
  function leave(node: Element): TransitionConfig {
    const duration = parseFloat(getComputedStyle(node).getPropertyValue('--sui-duration-fast'));
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      duration,
      css: (t) =>
        still ? `opacity: ${t}` : `opacity: ${t}; translate: 0 calc(${1 - t} * var(--sui-space-2))`
    };
  }
</script>

<!--
@component
The page's toasts, stacked at the block-end, inline-end corner in the top layer. Mount it once
on the page and call `toast()` from anywhere; `dismiss(id)` takes one back. A modal dialog makes
the page under it inert, so every `Modal` draws the toasts inside itself while it is the topmost,
with the words and timing set on the page's `Toaster`.

A toast says what just happened, with at most one way back such as Undo. A neutral toast leaves
after five seconds, and the clock holds while the pointer or focus is on the stack. A toast with
an action stays until the reader runs it or dismisses it, so a keyboard can always reach it.
A `danger` toast reports a failure and stays too.

- Semantics: a `region` landmark named by `label`, with `aria-keyshortcuts` for its hotkey; each toast is announced once from hidden `status` and `alert` regions kept apart from the stack.
- Content: a title, one description that never repeats it, at most one action, and Dismiss; a failure carries its symbol; words wrap at 24rem.
- States: entering (rises 8px and fades in), shown, held while hovered or focused, leaving (fades), `danger` with its symbol in a danger tile, and drawn in place with `preview`.
- Keyboard: the hotkey (F8) moves focus to the newest toast, Tab moves through its action and Dismiss, and Escape returns focus to where it was.
- Pointer and touch: the action and Dismiss are 34px targets, 44px on a phone or touch screen; the corner around the toasts lets presses through to the page.
- Focus: closing a toast returns focus to where it was before it entered the stack, or to the next toast's Dismiss when that place is gone.
- Responsive: the stack is at most the viewport's width less 32px and its height, and scrolls inside past that with the newest toast kept in view. On a phone it spans the screen. Dismiss keeps the inline-end corner; the action moves under the copy when the copy would get less than 8rem beside it, and the copy moves under a failure's symbol when it would get less than 8rem beside that.
- Accessibility: a failure is announced as an alert and anything else politely, each once, and the stack is a landmark a reader can jump to.
- Localization: `dismissLabel`, `label` and `hotkey` carry the built-in words and key, the stack stands at the inline end, mirrored in a right-to-left page, and its padding is logical.
- Performance: one stack per page and per open dialog; each toast holds one timer, and the motion is opacity and translate, a fade alone under reduced motion.
- Analytics: each toast's `ondismiss` reports `dismissed`, `expired`, `acted` or `withdrawn`.
- Failure: a failure toast stays until dismissed, and more toasts than the screen holds scroll inside the stack instead of leaving it.
-->

{#if !preview}
  <VisuallyHidden role="status" aria-atomic="false">
    {#each heard as item (item.id)}
      {#if item.tone !== 'danger'}
        <span class="sui-toast-said"
          >{item.title}{#if item.description}{mark('comma')}{item.description}{/if}</span
        >
      {/if}
    {/each}
  </VisuallyHidden>
  <VisuallyHidden role="alert" aria-atomic="false">
    {#each heard as item (item.id)}
      {#if item.tone === 'danger'}
        <span class="sui-toast-said"
          >{item.title}{#if item.description}{mark('comma')}{item.description}{/if}</span
        >
      {/if}
    {/each}
  </VisuallyHidden>
{/if}

<div
  bind:this={stack}
  class={['sui-toaster', { preview }]}
  popover={preview ? undefined : 'manual'}
  role={preview ? undefined : 'region'}
  aria-label={preview ? undefined : words.region}
  aria-keyshortcuts={preview ? undefined : words.hotkey}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  {onfocusin}
  {onkeydown}
  onfocusout={(event) => {
    focused =
      event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget);
  }}
>
  {#each shown as item (item.id)}
    <div
      class="sui-toast"
      data-toast={item.id}
      {@attach linger(item)}
      out:leave
      onoutroend={settle}
    >
      <div class="sui-toast-body">
        {#if item.tone === 'danger'}
          <span class="sui-toast-mark"><Icon name="failure" size="base" /></span>
        {/if}
        <div class="sui-toast-main">
          <div class="sui-toast-copy">
            <p class="sui-toast-title">{item.title}</p>
            {#if item.description}<p class="sui-toast-description">{item.description}</p>{/if}
          </div>
          {#if item.action}
            <Button onclick={(event) => run(item, event)}>{item.action.label}</Button>
          {/if}
        </div>
      </div>
      <!-- As tall as the action, so the first line stays even (L-101). -->
      <IconButton
        icon="close"
        toolbar
        label={words.dismiss}
        data-dismiss
        onclick={(event) => close(item, event, 'dismissed')}
      />
    </div>
  {/each}
</div>

<style>
  /* The stack's own padding is the 16px gap to the screen's corner, so the toasts' shadows sit
     inside the box that scrolls them and are never cut at its edge. */
  .sui-toaster {
    align-items: flex-end;
    background: none;
    border: 0;
    box-sizing: border-box;
    color: inherit;
    flex-direction: column;
    gap: var(--sui-space-2);
    inset: auto;
    inset-block-end: calc(
      max(var(--sui-space-4), env(safe-area-inset-bottom)) - var(--sui-space-4)
    );
    inset-inline-end: 0;
    margin: 0;
    max-block-size: 100dvh;
    max-inline-size: 100vw;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--sui-space-4);
    pointer-events: none;
    position: fixed;
  }

  /* Only an open stack takes a box, so the browser's hidden popover stays hidden. */
  .sui-toaster:popover-open,
  .preview {
    display: flex;
  }

  /* Drawn in place, the toasts start where any content would; only the live stack hangs from
     the screen's inline end. */
  .preview {
    align-items: flex-start;
    max-block-size: none;
    max-inline-size: 100%;
    overflow: visible;
    padding: 0;
    position: static;
  }

  /* One line each, so the hidden regions never run two toasts into one word. */
  .sui-toast-said {
    display: block;
  }

  /* Dismiss holds the inline-end corner and never wraps. What is beside it wraps instead, so
     the copy keeps a readable width: first the action moves under the copy, starting at its
     start edge (L-90), and then, on a very narrow toast, the copy moves under the symbol. The
     symbol, the title's first line, the action and Dismiss hang on one first line as tall as
     the buttons, so they centre on one another however far the copy runs (L-56). */
  .sui-toast {
    align-items: flex-start;
    background-color: var(--sui-popover-bg);
    border: var(--sui-stroke) solid var(--sui-popover-border);
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: flex;
    gap: var(--sui-space-3);
    max-inline-size: 24rem;
    opacity: 1;
    /* One inset all round, measured to the ink (L-33). */
    padding: var(--sui-space-3);
    pointer-events: auto;
    transition:
      opacity var(--sui-duration-normal) var(--sui-ease-out),
      translate var(--sui-duration-normal) var(--sui-ease-out);
    translate: 0 0;
  }

  @starting-style {
    .sui-toast {
      opacity: 0;
      translate: 0 var(--sui-space-2);
    }
  }

  /* The failure symbol stands in a tile of the danger tone, at the tile's 18px glyph. */
  .sui-toast-mark {
    --sui-icon-base: var(--sui-icon-md);
    align-items: center;
    background: var(--sui-danger-tint);
    block-size: var(--sui-symbol-tile);
    border-radius: var(--sui-radius-control);
    color: var(--sui-danger);
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-symbol-tile);
    justify-content: center;
    margin-block: calc((var(--sui-control-height-compact) - var(--sui-symbol-tile)) / 2);
  }

  .sui-toast-body {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    min-inline-size: 0;
  }

  .sui-toast-main {
    align-items: flex-start;
    display: flex;
    flex: 1 1 8rem;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    min-inline-size: 0;
  }

  .sui-toast-copy {
    display: grid;
    flex: 1 1 8rem;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  /* On a phone the stack spans the screen and each toast takes its width. */
  @media (max-width: 47.9375rem) {
    .sui-toaster {
      inset-inline-start: 0;
    }

    .sui-toast {
      inline-size: 100%;
    }
  }

  .sui-toast-title,
  .sui-toast-description {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  /* The first line's cap centres on the even first line, so it snaps even too. */
  .sui-toast-title {
    block-size: var(--sui-block-snap-even);
    font-weight: var(--sui-weight-semibold);
    margin-block-start: calc((var(--sui-control-height-compact) - round(up, 1cap, 2px)) / 2);
  }

  .sui-toast-description {
    color: var(--sui-text-secondary);
  }

  /* A preview is drawn once at load and never enters. */
  .preview .sui-toast {
    transition: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-toast {
      transition: opacity var(--sui-duration-normal) var(--sui-ease-out);
    }
  }
</style>
