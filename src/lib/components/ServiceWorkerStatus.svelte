<script module lang="ts">
  /** What the bar says: an update to let in, one being let in, or the network's state. */
  export type ServiceWorkerNotice = 'ready' | 'reloading' | 'offline' | 'online';
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ServiceWorkerState } from '../internal/service-worker.svelte.js';
  import { hosts } from '../internal/toasts.svelte.js';
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
    laterLabel = word('ServiceWorkerStatus.laterLabel', 'Later'),
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

  $effect(() => {
    if (!element || preview !== undefined) return;
    if (shown === element.matches(':popover-open')) return;
    if (shown) element.showPopover();
    else element.hidePopover();
  });

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
reloads the page once it is in control. Later sets the update aside for this page; the next load
offers it again. Offline is a lasting state, so it stays until the network answers or the reader
dismisses it, and the return says "You are back online" for five seconds.

- Semantics: an `aside` named by its title, in the top layer as a manual popover, with native buttons; each notice is said once from a hidden `status` region kept apart from the bar.
- Content: a title and a description for an update or for offline, a title alone for the return; at most two buttons; words wrap within 28rem.
- States: ready (Later and Reload), reloading (Reload busy with `reloadingLabel`, Later held), offline (Dismiss), back online (no buttons, leaves after five seconds, held while hovered or focused), hidden while a modal dialog is open, and drawn in place with `preview`.
- Keyboard: Tab reaches the bar's buttons after the page's own; Enter or Space presses them; Escape returns focus to where it came from and leaves the notice up.
- Pointer and touch: the buttons are 34px tall on a pointer and 44px on a phone or touch screen; nothing needs a drag.
- Focus: opening never takes focus; when a pressed button leaves, focus returns to where it came from, else to the next notice's first button.
- Responsive: as wide as its words up to 28rem, the buttons wrapping under the copy; on a phone it spans the screen less 16px a side, above the safe area.
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
  {...rest}
  class={['sui-service-worker-status', className, { preview: preview !== undefined }]}
  popover={preview === undefined ? 'manual' : undefined}
  aria-labelledby={titleId}
  onpointerenter={() => (hovered = true)}
  onpointerleave={() => (hovered = false)}
  {onfocusin}
  {onfocusout}
  {onkeydown}
>
  <div class="copy">
    <p id={titleId} class="title">{title}</p>
    {#if description}<p class="description">{description}</p>{/if}
  </div>
  {#if drawn === 'ready' || drawn === 'reloading'}
    <div class="actions">
      <Button disabled={drawn === 'reloading'} onclick={() => putAside('ready')}
        >{laterLabel}</Button
      >
      <Button loading={drawn === 'reloading'} onclick={reload}
        >{drawn === 'reloading' ? reloadingLabel : reloadLabel}</Button
      >
    </div>
  {:else if drawn === 'offline'}
    <div class="actions">
      <Button onclick={() => putAside('offline')}>{dismissLabel}</Button>
    </div>
  {/if}
</aside>

<style>
  /* One inset all round, measured to the ink (L-33), as the save bar keeps it. */
  .sui-service-worker-status {
    align-items: center;
    background: var(--sui-popover-bg);
    border: var(--sui-stroke) solid var(--sui-popover-border);
    border-radius: var(--sui-radius-surface);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    flex-wrap: wrap;
    gap: var(--sui-space-3) var(--sui-space-5);
    inline-size: max-content;
    justify-content: space-between;
    max-inline-size: min(28rem, 100%);
    padding: var(--sui-space-4);
  }

  /* The toasts hold the inline-end corner, so the bar holds the other one. */
  .sui-service-worker-status:not(.preview) {
    inset: auto;
    inset-block-end: max(var(--sui-space-4), env(safe-area-inset-bottom));
    inset-inline-start: var(--sui-space-4);
    margin: 0;
    max-inline-size: min(28rem, 100vw - 2 * var(--sui-space-4));
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
     beside them, and a bar as wide as its words never wraps them by a rounding. */
  .copy {
    display: grid;
    flex: 1 1 auto;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .title,
  .description {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .title {
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  .description {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
  }

  /* The actions end the line they share with the copy and start the line they wrap to (L-90).
     Both are framed, one emphasis as Material's banner gives its two actions, so the bar's ink
     meets its inset at either end of the line they stand on (L-33). */
  .actions {
    display: flex;
    flex: 0 1 auto;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  /* On a phone the bar spans the screen, as the toasts do. */
  @media (max-width: 47.9375rem) {
    .sui-service-worker-status:not(.preview) {
      inline-size: auto;
      inset-inline-end: var(--sui-space-4);
      max-inline-size: none;
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
