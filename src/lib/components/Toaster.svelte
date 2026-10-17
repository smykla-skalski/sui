<script lang="ts">
  import type { TransitionConfig } from 'svelte/transition';
  import Icon from '../icons/Icon.svelte';
  import {
    dismiss,
    hosts,
    toasts,
    type Toast,
    type ToastOptions
  } from '../internal/toasts.svelte.js';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const LINGER_MS = 5000;

  let {
    preview = false,
    items = []
  }: {
    /** Draws `items` in the page's flow in place of the page's toasts, with no timers and no live region. */
    preview?: boolean;
    items?: readonly ToastOptions[];
  } = $props();

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

  // The stack leaves the top layer once the last toast has faded.
  function settle(): void {
    if (shown.length === 0 && stack?.matches(':popover-open')) stack.hidePopover();
  }

  // A neutral toast's clock restarts in full once the reader stops hovering or focusing the stack.
  function linger(item: Toast) {
    return () => {
      if (preview || hovered || focused || item.tone === 'danger' || item.action) return;
      const timer = setTimeout(() => dismiss(item.id), LINGER_MS);
      return () => clearTimeout(timer);
    };
  }

  function onfocusin(event: FocusEvent): void {
    focused = true;
    const from = event.relatedTarget;
    if (!(from instanceof Node && stack?.contains(from)))
      before = from instanceof HTMLElement ? from : null;
  }

  // Focus on a removed button falls to the body, so it goes back to where it came from, or to
  // the next toast's Dismiss when that place is gone.
  function close(item: Toast, event: MouseEvent): void {
    const leaving = (event.currentTarget as HTMLElement).closest<HTMLElement>('.sui-toast');
    if (stack && leaving?.contains(document.activeElement)) {
      before?.focus();
      if (!before || document.activeElement !== before) {
        // The action may already have taken its own toast back, so the neighbours come from
        // the stack as drawn, skipping any toast that is fading out.
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
    dismiss(item.id);
  }

  function run(item: Toast, event: MouseEvent): void {
    item.action?.run();
    close(item, event);
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
the page under it inert, so every `Modal` draws the toasts inside itself while it is the topmost.

A toast says what just happened, with at most one way back such as Undo. A neutral toast leaves
after five seconds, and the clock holds while the pointer or focus is on the stack. A toast with
an action stays until the reader runs it or dismisses it, so a keyboard can always reach it.
A `danger` toast reports a failure and stays too.

Closing a toast returns focus to wherever it was before it entered the stack. Each toast is
announced once, from regions kept apart from the stack: a failure as an alert, anything else
politely. `preview` draws `items` in the page's flow instead, silent and still, for a review.
-->

{#if !preview}
  <VisuallyHidden role="status" aria-atomic="false">
    {#each heard as item (item.id)}
      {#if item.tone !== 'danger'}
        <span class="sui-toast-said"
          >{item.title}{#if item.description}, {item.description}{/if}</span
        >
      {/if}
    {/each}
  </VisuallyHidden>
  <VisuallyHidden role="alert" aria-atomic="false">
    {#each heard as item (item.id)}
      {#if item.tone === 'danger'}
        <span class="sui-toast-said"
          >{item.title}{#if item.description}, {item.description}{/if}</span
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
  aria-label={preview ? undefined : 'Notifications'}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  {onfocusin}
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
      {#if item.tone === 'danger'}
        <span class="sui-toast-mark"><Icon name="failure" size="base" /></span>
      {/if}
      <div class="sui-toast-copy">
        <p class="sui-toast-title">{item.title}</p>
        {#if item.description}<p class="sui-toast-description">{item.description}</p>{/if}
      </div>
      {#if item.action}
        <Button onclick={(event) => run(item, event)}>{item.action.label}</Button>
      {/if}
      <IconButton
        icon="close"
        label="Dismiss"
        data-dismiss
        onclick={(event) => close(item, event)}
      />
    </div>
  {/each}
</div>

<style>
  .sui-toaster {
    align-items: flex-end;
    background: none;
    border: 0;
    color: inherit;
    flex-direction: column;
    gap: var(--sui-space-2);
    inset: auto;
    inset-block-end: max(var(--sui-space-4), env(safe-area-inset-bottom));
    inset-inline-end: var(--sui-space-4);
    margin: 0;
    max-inline-size: calc(100vw - 2 * var(--sui-space-4));
    overflow: visible;
    padding: 0;
    pointer-events: none;
    position: fixed;
  }

  /* Only an open stack takes a box, so the browser's hidden popover stays hidden. */
  .sui-toaster:popover-open,
  .preview {
    display: flex;
  }

  .preview {
    max-inline-size: 100%;
    position: static;
  }

  /* One line each, so the hidden regions never run two toasts into one word. */
  .sui-toast-said {
    display: block;
  }

  .sui-toast {
    align-items: center;
    background-color: var(--sui-popover-bg);
    border: 1px solid var(--sui-popover-border);
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: flex;
    gap: var(--sui-space-3);
    max-inline-size: 24rem;
    opacity: 1;
    padding: var(--sui-space-2) var(--sui-space-2) var(--sui-space-2) var(--sui-space-4);
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

  .sui-toast-mark {
    color: var(--sui-danger);
    display: inline-flex;
    flex: none;
  }

  .sui-toast-copy {
    display: grid;
    flex: 1 1 auto;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
    padding-block: var(--sui-space-2);
  }

  .sui-toast-title,
  .sui-toast-description {
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-toast-title {
    font-weight: 600;
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
