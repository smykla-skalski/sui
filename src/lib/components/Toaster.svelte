<script lang="ts">
  import type { TransitionConfig } from 'svelte/transition';
  import Icon from '../icons/Icon.svelte';
  import { dismiss, toasts, type Toast } from '../internal/toasts.svelte.js';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';

  const LINGER_MS = 5000;

  let hovered = $state(false);
  let focused = $state(false);

  // A neutral toast's clock restarts in full once the reader stops hovering or focusing the stack.
  function linger(item: Toast) {
    return () => {
      if (hovered || focused || item.tone === 'danger' || item.sticky) return;
      const timer = setTimeout(() => dismiss(item.id), LINGER_MS);
      return () => clearTimeout(timer);
    };
  }

  // A removed element never reports losing focus, so the hold is let go by hand.
  function close(item: Toast): void {
    focused = false;
    dismiss(item.id);
  }

  function run(item: Toast): void {
    item.action?.run();
    close(item);
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
The page's toasts, stacked at the block-end, inline-end corner. Mount it once, where it outlives
any dialog, and call `toast()` from anywhere; `dismiss(id)` takes one back.

A toast says what just happened, with at most one way back such as Undo. A neutral toast leaves
after five seconds, and the clock holds while the pointer or focus is on the stack. A `danger`
toast reports a failure and stays, and so does a `sticky` one, for work not yet saved. The
stack is a polite status region, and a failure is announced as an alert.
-->

<div
  class="sui-toaster"
  role="status"
  aria-atomic="false"
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  onfocusin={() => (focused = true)}
  onfocusout={(event) => {
    focused =
      event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget);
  }}
>
  {#each toasts as item (item.id)}
    <div
      class="sui-toast"
      role={item.tone === 'danger' ? 'alert' : undefined}
      {@attach linger(item)}
      out:leave
    >
      {#if item.tone === 'danger'}
        <span class="sui-toast-mark"><Icon name="failure" size="base" /></span>
      {/if}
      <div class="sui-toast-copy">
        <p class="sui-toast-title">{item.title}</p>
        {#if item.description}<p class="sui-toast-description">{item.description}</p>{/if}
      </div>
      {#if item.action}
        <Button onclick={() => run(item)}>{item.action.label}</Button>
      {/if}
      <IconButton icon="close" label="Dismiss" onclick={() => close(item)} />
    </div>
  {/each}
</div>

<style>
  .sui-toaster {
    align-items: flex-end;
    display: flex;
    flex-direction: column;
    gap: var(--sui-space-2);
    inset-block-end: max(var(--sui-space-4), env(safe-area-inset-bottom));
    inset-inline-end: var(--sui-space-4);
    max-inline-size: calc(100vw - 2 * var(--sui-space-4));
    pointer-events: none;
    position: fixed;
    z-index: var(--sui-layer-toast);
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

  @media (prefers-reduced-motion: reduce) {
    .sui-toast {
      transition: opacity var(--sui-duration-normal) var(--sui-ease-out);
    }
  }
</style>
