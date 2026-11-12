<script module lang="ts">
  /** What the bar says: an update to let in, one being let in, or the network's state. */
  export type ServiceWorkerNotice = 'ready' | 'reloading' | 'offline' | 'online';
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ServiceWorkerState } from '../internal/service-worker.svelte.js';
  import { clearance } from '../internal/clearance.js';
  import { footing, hosts } from '../internal/toasts.svelte.js';
  import Button from './Button.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const titleId = $props.id();

  let {
    worker,
    preview,
    readyTitle = word('ServiceWorkerStatus.readyTitle', 'A new version is ready'),
    readyDescription = word(
      'ServiceWorkerStatus.readyDescription',
      'This page stays as it is until you reload'
    ),
    reloadLabel = word('ServiceWorkerStatus.reloadLabel', 'Reload'),
    reloadingLabel = word('ServiceWorkerStatus.reloadingLabel', 'Reloading…'),
    laterLabel = word('ServiceWorkerStatus.laterLabel', 'Reload Later'),
    offlineTitle = word('ServiceWorkerStatus.offlineTitle', 'You are offline'),
    offlineDescription = word(
      'ServiceWorkerStatus.offlineDescription',
      'Pages saved on this device still open'
    ),
    onlineTitle = word('ServiceWorkerStatus.onlineTitle', 'You are back online'),
    dismissLabel = word('ServiceWorkerStatus.dismissLabel', 'Dismiss'),
    onreload,
    ondismiss,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** What `registerServiceWorker` returned. */
    worker?: ServiceWorkerState;
    /** Draws this notice in the page's flow in place of the worker's, with no live region. */
    preview?: ServiceWorkerNotice;
    readyTitle?: string;
    readyDescription?: string;
    reloadLabel?: string;
    reloadingLabel?: string;
    /** Sets the update aside until the next page load. */
    laterLabel?: string;
    offlineTitle?: string;
    offlineDescription?: string;
    /** Said for 5 seconds once the network answers again. */
    onlineTitle?: string;
    /** Sets the offline notice aside until the network comes back and goes again. */
    dismissLabel?: string;
    /** Hears each press of Reload, before the new version takes over. */
    onreload?: () => void;
    /** Hears each notice the reader sets aside. */
    ondismiss?: (notice: 'ready' | 'offline') => void;
    element?: HTMLElement | null;
    /** Layout for the call site only, never the bar's own paint. */
    class?: HTMLAttributes<HTMLElement>['class'];
  } & Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'hidden' | 'popover'> = $props();

  /** How long a notice with nothing to press stays, as a toast does (L-60). */
  const LINGER_MS = 5000;

  let setAside = $state({ ready: false, offline: false });
  let back = $state(false);
  let hovered = $state(false);
  let within = $state(false);
  // Where focus came into the bar from, where it goes back when the bar's buttons leave.
  let before: HTMLElement | null = null;

  const live = $derived.by((): ServiceWorkerNotice | null => {
    if (!worker) return null;
    if (worker.reloading) return 'reloading';
    if (worker.waiting && !setAside.ready) return 'ready';
    if (worker.offline) return setAside.offline ? null : 'offline';
    return back ? 'online' : null;
  });
  const notice = $derived(preview ?? live);
  // A modal dialog makes the page under it inert, so the bar waits until the dialog closes.
  const shown = $derived(notice !== null && (preview !== undefined || hosts.length === 0));
  // The words stay while the bar fades out, so it never fades out empty. Derived, so a server
  // render draws the notice it was given, a preview included.
  let last: ServiceWorkerNotice = 'ready';
  const drawn = $derived.by(() => (notice ? (last = notice) : last));

  const title = $derived(
    drawn === 'offline' ? offlineTitle : drawn === 'online' ? onlineTitle : readyTitle
  );
  const description = $derived(
    drawn === 'offline' ? offlineDescription : drawn === 'online' ? '' : readyDescription
  );
  // Said once each time the bar comes with new words; letting the update in says nothing new.
  const said = $derived(
    preview !== undefined || !shown ? '' : [title, description].filter(Boolean).join(mark('comma'))
  );

  let wasOffline = false;
  $effect(() => {
    if (worker?.offline) {
      wasOffline = true;
      back = false;
    } else if (wasOffline) {
      wasOffline = false;
      setAside.offline = false;
      back = true;
    }
  });

  $effect(() => {
    if (!back || hovered || within) return;
    const timer = setTimeout(() => (back = false), LINGER_MS);
    return () => clearTimeout(timer);
  });

  let block = $state(0);
  $effect(() => {
    if (preview !== undefined) return;
    footing.block = block;
    return () => (footing.block = 0);
  });

  $effect(() => {
    if (!element || preview !== undefined) return;
    if (shown === element.matches(':popover-open')) return;
    if (shown) element.showPopover();
    else element.hidePopover();
  });

  // The notice covers the page's foot as a toast does, so a control the reader tabs to scrolls
  // clear above it (WCAG 2.4.11), and the control that raised it, still focused, scrolls clear as
  // it comes. It holds at most half the screen, so the page keeps room to show focus.
  function clearPage(box: HTMLElement) {
    if (preview !== undefined || !shown) return;
    const page = clearance(document.documentElement);
    const observer = new ResizeObserver(([entry]) => {
      const inset = parseFloat(getComputedStyle(box).insetBlockEnd) || 0;
      const tall = entry.borderBoxSize[0].blockSize;
      page.hold({ end: Math.min(tall + inset, innerHeight / 2) });
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || box.contains(focused)) return;
      // The notice may still be rising into place, and a rise fires no resize, so its edges
      // are read where it settles, not where it is drawn now.
      const at = focused.getBoundingClientRect();
      const { left, right } = box.getBoundingClientRect();
      const bottom = document.documentElement.clientHeight - inset;
      const meets =
        Math.min(at.right, right) > Math.max(at.left, left) &&
        Math.min(at.bottom, bottom) > Math.max(at.top, bottom - tall);
      if (meets) focused.scrollIntoView({ block: 'nearest' });
    });
    observer.observe(box);
    return () => {
      observer.disconnect();
      page.release();
    };
  }

  function reload(): void {
    if (!worker) return;
    onreload?.();
    worker.update();
  }

  // Focus on a button that leaves falls to the page, so it goes back where it came from, else to
  // the notice that takes this one's place (L-89).
  async function putAside(which: 'ready' | 'offline'): Promise<void> {
    if (!worker) return;
    const focused = element?.contains(document.activeElement) ?? false;
    setAside[which] = true;
    ondismiss?.(which);
    await tick();
    if (!focused) return;
    if (before?.isConnected) before.focus();
    else if (shown) element?.querySelector<HTMLElement>('.actions button')?.focus();
  }

  function onfocusin(event: FocusEvent): void {
    within = true;
    const from = event.relatedTarget;
    if (!(from instanceof Node && element?.contains(from)))
      before = from instanceof HTMLElement ? from : null;
  }

  function onfocusout(event: FocusEvent): void {
    const to = event.relatedTarget;
    within = to instanceof Node && Boolean(element?.contains(to));
  }

  // Escape hands focus back to where it came from, as the toasts do, and leaves the notice up.
  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !before?.isConnected) return;
    event.preventDefault();
    event.stopPropagation();
    before.focus();
  }
</script>

<!--
@component
The app's service worker as the reader meets it: a new version that waits for their consent, and
a network that stopped answering. Mount it once in the root layout with the state that
`registerServiceWorker` returns. It floats in the top layer at the block-end, inline-start corner,
across from the toasts.

A new version never takes over a page on its own (L-111). The bar says it is ready, and the old
version keeps serving the page until the reader presses Reload, which lets the new version in and
reloads the page once it is in control. Reload Later sets the update aside for this page; the next load
offers it again. Offline is a lasting state, so it stays until the network answers or the reader
dismisses it, and the return says "You are back online" for five seconds.

- Semantics: an `aside` named by its title, in the top layer as a manual popover, with native buttons; each notice is said once from a hidden `status` region kept apart from the bar.
- Content: a title and a description for an update or for offline, a title alone for the return; at most two buttons; words wrap within a toast's 24rem.
- States: ready (Reload Later and Reload in the signal tone), reloading (Reload busy with `reloadingLabel`, at the width it held, so Reload Later never moves, and Reload Later held), offline (Dismiss, its edge a quarter of the warning ink), back online (its edge a quarter of the success ink, no buttons, leaves after five seconds, held while hovered or focused), hidden while a modal dialog is open, and drawn in place with `preview`.
- Keyboard: Tab reaches the bar's buttons after the page's own; Enter or Space presses them; Escape returns focus to where it came from and leaves the notice up.
- Pointer and touch: the buttons are 34px tall on a pointer and 44px on a phone or touch screen; nothing needs a drag.
- Focus: opening never takes focus, and a focused control it would cover scrolls clear above it, as the next one Tab reaches does; when a pressed button leaves, focus returns to where it came from, else to the next notice's first button.
- Responsive: 24rem wide, as every toast is, or the room it has, the buttons wrapping under the copy at their words' width; on a phone it spans the screen less 16px a side, above the safe area, and Reload Later and Reload share their line in halves, as a dialog's footer does. Below the wide breakpoint the toasts stand above it.
- Accessibility: the update, offline and return are each announced politely once; the bar's name is its title; text holds 4.5:1 on the popover ground; forced colors keep its edge.
- Localization: every word is a prop with an English default; the bar stands at the inline start and its buttons end the line in the reading direction, mirrored in a right-to-left page.
- Performance: one element and one timer; it rises 8px and fades in, and fades out, and under reduced motion it comes and goes at once.
- Analytics: `onreload` hears each press of Reload and `ondismiss` each notice set aside.
- Failure: without a worker, or where the browser has none, it shows only offline from the device's own state; an update that fails to install never reaches it, because the old version keeps serving.
-->

{#if preview === undefined}
  <VisuallyHidden role="status">{said}</VisuallyHidden>
{/if}

<aside
  bind:this={element}
  bind:offsetHeight={block}
  {...rest}
  class={[
    'sui-service-worker-status',
    className,
    { preview: preview !== undefined, offline: drawn === 'offline', online: drawn === 'online' }
  ]}
  popover={preview === undefined ? 'manual' : undefined}
  aria-labelledby={titleId}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  {onfocusin}
  {onfocusout}
  {onkeydown}
  {@attach clearPage}
>
  <div class="copy">
    <p id={titleId} class="title">{title}</p>
    {#if description}<p class="description">{description}</p>{/if}
  </div>
  {#if drawn === 'ready' || drawn === 'reloading'}
    <div class="actions pair">
      <Button disabled={drawn === 'reloading'} onclick={() => putAside('ready')}
        >{laterLabel}</Button
      >
      <Button
        tone="signal"
        loading={drawn === 'reloading'}
        busyLabel={reloadingLabel}
        onclick={reload}>{reloadLabel}</Button
      >
    </div>
  {:else if drawn === 'offline'}
    <div class="actions">
      <Button onclick={() => putAside('offline')}>{dismissLabel}</Button>
    </div>
  {/if}
</aside>

<style>
  /* One inset all round, measured to the ink (L-33), as the save bar keeps it. It floats in the
     corner across from the toasts as one of them, so it takes a toast's edge, lift and width
     (L-54). */
  .sui-service-worker-status {
    align-items: center;
    background: var(--sui-popover-bg);
    border: var(--sui-stroke) solid var(--sui-toast-border, var(--sui-popover-border));
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-toast, var(--sui-shadow-popover));
    box-sizing: border-box;
    color: var(--sui-text-primary);
    flex-wrap: wrap;
    gap: var(--sui-space-3) var(--sui-space-5);
    inline-size: min(24rem, 100%);
    justify-content: space-between;
    padding: var(--sui-space-4);
  }

  /* The network's state carries its tone in the edge, a quarter of the warning ink while
     offline and of the success ink once back, as a failed toast's edge carries the danger ink,
     so the two read apart at a glance and not by their words alone (L-72). */
  .offline {
    border-color: color-mix(
      in oklch,
      var(--sui-warning) var(--sui-toast-failure-edge),
      var(--sui-toast-border, var(--sui-popover-border))
    );
  }

  .online {
    border-color: color-mix(
      in oklch,
      var(--sui-success) var(--sui-toast-failure-edge),
      var(--sui-toast-border, var(--sui-popover-border))
    );
  }

  /* The toasts hold the inline-end corner, so the bar holds the other one. */
  .sui-service-worker-status:not(.preview) {
    inset: auto;
    inset-block-end: max(var(--sui-space-4), env(safe-area-inset-bottom));
    inset-inline-start: max(var(--sui-space-4), var(--sui-safe-start));
    margin: 0;
    max-inline-size: min(
      24rem,
      100vw - max(var(--sui-space-4), var(--sui-safe-start)) -
        max(var(--sui-space-4), var(--sui-safe-end))
    );
    opacity: 0;
    overflow: visible;
    position: fixed;
    transition:
      opacity var(--sui-duration-fast) var(--sui-ease-out),
      translate var(--sui-duration-fast) var(--sui-ease-out),
      display var(--sui-duration-fast) allow-discrete,
      overlay var(--sui-duration-fast) allow-discrete;
    translate: 0 var(--sui-space-2);
  }

  .sui-service-worker-status:popover-open,
  .preview {
    display: flex;
  }

  .sui-service-worker-status:popover-open {
    opacity: 1;
    transition-duration: var(--sui-duration-normal);
    translate: 0 0;
  }

  @starting-style {
    .sui-service-worker-status:popover-open {
      opacity: 0;
      translate: 0 var(--sui-space-2);
    }
  }

  /* The copy asks for its one-line width, so the buttons move under it as soon as it would wrap
     beside them. Snapped to an even height, it splits the spare pixel above and under its words
     (L-102). */
  .copy {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    display: grid;
    flex: 1 1 auto;
    gap: var(--sui-title-copy-gap);
    min-inline-size: 0;
  }

  .title,
  .description {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* Set as a toast's title is, a step of weight over the description at its size. */
  .title {
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  /* Wrapped, the reason reads as a toast's does, a note and not a dense block, and fills its
     lines, as one beside an action does (L-24). */
  .description {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-note)
      var(--sui-sans);
    text-wrap: pretty;
  }

  /* The actions end the line they share with the copy and start the line they wrap to (L-90).
     Both are framed, so the bar's ink meets its inset at either end of the line they stand on
     (L-33), and Reload, the answer the notice asks for, wears the signal tone (L-39). */
  .actions {
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  /* On a phone the bar spans the screen, as the toasts do, and Reload Later and Reload share
     their line in halves, as a dialog's footer does there, so the pair never leaves a ragged
     gap at the end of a line that wide. Wider, each keeps its words' width, so the deferral
     never weighs as much as the answer. */
  @media (max-width: 47.9375rem) {
    .sui-service-worker-status:not(.preview) {
      inline-size: auto;
      inset-inline-end: max(var(--sui-space-4), var(--sui-safe-end));
      max-inline-size: none;
    }

    .pair {
      --sui-local-button-span: 100%;
      flex-grow: 1;
    }

    .pair > :global(*) {
      flex: 1 1 0;
      min-inline-size: fit-content;
    }
  }

  /* The bar arrives and leaves where it rests, at once (L-75). */
  @media (prefers-reduced-motion: reduce) {
    .sui-service-worker-status:not(.preview) {
      transition: none;
      translate: 0 0;
    }
  }
</style>
