<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import { hostToasts } from '../internal/toasts.svelte.js';
  import IconButton from './IconButton.svelte';
  import Toaster from './Toaster.svelte';

  const uid = $props.id();

  let {
    open = $bindable(false),
    title,
    description,
    size = 'dialog',
    role = 'dialog',
    beforeClose,
    onclose,
    preview = false,
    element = $bindable(null),
    class: className = '',
    children,
    footer,
    ...rest
  }: {
    open?: boolean;
    /** The 20px heading, and the dialog's accessible name. */
    title: string;
    /** What the dialog is for, said once under the title and read as its description. */
    description?: string;
    /** `dialog` asks a question or holds a short form, `inspector` edits a record beside the page, `wide` holds a task that needs room. */
    size?: 'dialog' | 'inspector' | 'wide';
    /** `alertdialog` for a question that interrupts the reader, as `ConfirmDialog` asks. */
    role?: 'dialog' | 'alertdialog';
    /** Asked before Escape, an outside press or the close button ends the dialog; `false` keeps it open. */
    beforeClose?: () => boolean;
    /** Runs once the dialog has closed, whatever closed it. */
    onclose?: () => void;
    /** Draws the box in the page's flow at its width, capped to its container, with no scrim, focus trap or `open`. */
    preview?: boolean;
    element?: HTMLDialogElement | null;
    class?: HTMLDialogAttributes['class'];
    children?: Snippet;
    /** Actions that stay in view below the scrolling body, trailing edge first in reading order. */
    footer?: Snippet;
  } & Omit<HTMLDialogAttributes, 'open' | 'title' | 'role' | 'children' | 'class'> = $props();

  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-description`;

  const TABBABLE =
    ':is(a[href], button, input, select, textarea, [contenteditable], [tabindex]):not(:disabled, [tabindex^="-"], [contenteditable="false"], [type="hidden"], [type="radio"]:not(:checked))';
  const EDITABLE =
    'input:not([type="hidden"]), textarea, select, [contenteditable]:not([contenteditable="false"])';

  let opener: Element | null = null;
  let pressedOutside = false;
  let body = $state<HTMLElement | null>(null);
  let foot = $state<HTMLElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);

  const firstIn = (root: HTMLElement | null) =>
    [...(root?.querySelectorAll<HTMLElement>(TABBABLE) ?? [])].find((node) =>
      node.checkVisibility()
    );

  $effect(() => {
    if (!element) return;
    if (open && !element.open) {
      opener = document.activeElement;
      element.showModal();
      // The browser would focus the first control in tree order, which is Close in the head.
      if (!element.querySelector('[autofocus]'))
        (firstIn(body) ?? firstIn(foot) ?? closeButton)?.focus();
    } else if (!open && element.open) element.close();
  });

  $effect(() => {
    if (open && element) return hostToasts(element);
  });

  function dismiss(): void {
    if (beforeClose?.() === false) return;
    open = false;
  }

  // A press on the backdrop targets the dialog itself, outside the box it draws.
  function outside(event: MouseEvent): boolean {
    if (!element || event.target !== element) return false;
    const box = element.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }

  // An open auto popover inside the dialog (a menu, a listbox) takes Escape and outside
  // presses first, and the dialog stays.
  // `:is()` keeps a browser without `:open` from rejecting the whole selector.
  const layered = () =>
    element?.querySelector(':is([popover="auto"]:popover-open, select:open)') != null;

  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || layered()) return;
    // Handled here rather than through `cancel`, which the browser stops letting a page refuse
    // after the first Escape without a click in between.
    event.preventDefault();
    dismiss();
  }

  function oncancel(event: Event): void {
    event.preventDefault();
    dismiss();
  }

  // A stray press must never throw away a half-filled form, so only a dialog without fields
  // closes on one.
  function onpointerdown(event: PointerEvent): void {
    pressedOutside = outside(event) && !layered() && !element?.querySelector(EDITABLE);
  }

  // `closedby="any"` would do this natively, but Safari does not support it yet. A press that
  // starts inside the box and ends outside it, as a text selection does, never closes.
  function onclick(event: MouseEvent): void {
    if (pressedOutside && outside(event)) dismiss();
    pressedOutside = false;
  }

  function closed(): void {
    open = false;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    opener = null;
    onclose?.();
  }
</script>

<!--
@component
A task that has to be finished or abandoned before the page under it can be used again. It holds
fields and a way to commit or cancel them. Reading belongs on a page or in a panel, never here.
There are three widths. `dialog` asks a question or holds a short form. `inspector` edits a
record from the inline end at full height. `wide` holds a task that needs room, such as writing
release notes. Something a reader can carry on past belongs in a callout beside the work.

It is a native `<dialog>` opened with `showModal()`, so the browser traps focus, makes the page
inert and keeps it in the top layer. Escape and the close button ask `beforeClose` first, which
can refuse; confirm there only when closing would discard work. A press outside the box asks
too, but only while the dialog holds no field, so a stray click never loses a half-filled form.
An Escape that a layer inside it already handled, such as a menu or a tooltip, leaves it open.
Setting `open` to false always closes it.

Focus opens on an `[autofocus]` element, else on the first control in the body, then in the
footer, and on the close button last. It returns to whatever had it when the dialog opened. The
page's toasts draw inside the topmost dialog, so they are never inert under it. The body scrolls
and `footer` stays in view under it. `preview` draws the same box in the page's flow instead,
for a review that needs no click.
-->

{#snippet box()}
  <header class={['sui-modal-head', { alone: !children }]}>
    <div class="sui-modal-heading">
      <h2 id={titleId} class="sui-modal-title">{title}</h2>
      <span class="sui-modal-close"
        ><IconButton
          bind:element={closeButton}
          icon="close"
          label="Close"
          onclick={dismiss}
        /></span
      >
    </div>
    {#if description}<p id={descriptionId} class="sui-modal-description">{description}</p>{/if}
  </header>
  {#if children}<div bind:this={body} class="sui-modal-body">{@render children()}</div>{/if}
  {#if footer}<footer bind:this={foot} class="sui-modal-foot">{@render footer()}</footer>{/if}
{/snippet}

{#if preview}
  <div
    {role}
    class={['sui-modal', 'preview', className]}
    data-size={size}
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
  >
    {@render box()}
  </div>
{:else}
  <dialog
    bind:this={element}
    {...rest}
    class={['sui-modal', className]}
    role={role === 'alertdialog' ? role : undefined}
    data-size={size}
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
    {onkeydown}
    {oncancel}
    {onpointerdown}
    {onclick}
    onclose={closed}
  >
    {@render box()}
    <Toaster />
  </dialog>
{/if}

<style>
  .sui-modal {
    background-color: var(--sui-dialog-bg);
    border: 1px solid var(--sui-dialog-border);
    border-radius: var(--sui-radius-dialog);
    box-shadow: var(--sui-shadow-dialog);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    inline-size: 34rem;
    max-block-size: calc(100dvh - 2 * var(--sui-space-4));
    max-inline-size: calc(100vw - 2 * var(--sui-space-4));
    overflow: hidden;
    padding: 0;
  }

  /* Open without the entry animation, which would replay on every page load. */
  .sui-modal.preview {
    display: flex;
    flex-direction: column;
    max-inline-size: 100%;
  }

  .sui-modal[open] {
    animation: sui-modal-in var(--sui-duration-normal) var(--sui-ease-out);
    display: flex;
    flex-direction: column;
  }

  .sui-modal::backdrop {
    backdrop-filter: blur(var(--sui-scrim-blur));
    background-color: var(--sui-scrim);
  }

  .sui-modal[data-size='wide'] {
    inline-size: 46rem;
  }

  /* Docked to the edge only in the top layer; in flow an inspector keeps the whole frame. */
  .sui-modal[data-size='inspector']:not(.preview) {
    block-size: 100dvh;
    border-block: 0;
    border-inline-end: 0;
    border-radius: 0;
    inline-size: 40rem;
    margin-block: 0;
    margin-inline: auto 0;
    max-block-size: none;
    max-inline-size: 92vw;
  }

  .sui-modal[open][data-size='inspector'] {
    animation-name: sui-inspector-in;
  }

  .sui-modal-head {
    display: grid;
    flex: none;
    gap: var(--sui-row-copy-gap);
    padding: var(--sui-space-6) var(--sui-space-6) var(--sui-space-3);
  }

  .alone {
    padding-block-end: var(--sui-space-6);
  }

  .sui-modal-heading {
    align-items: center;
    display: flex;
    gap: var(--sui-space-4);
    justify-content: space-between;
    min-inline-size: 0;
  }

  .sui-modal-title {
    font: 700 var(--sui-font-size-dialog-title) / var(--sui-leading-title) var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  /* A box with no height of its own, so the close button centres on the title's cap band and
     never makes the head row taller than the title. */
  .sui-modal-close {
    align-items: center;
    block-size: 0;
    display: flex;
    flex: none;
  }

  .sui-modal-description {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-modal-body {
    align-content: start;
    display: grid;
    flex: 1 1 auto;
    gap: var(--sui-space-4);
    grid-template-columns: minmax(0, 1fr);
    min-block-size: 0;
    overflow-y: auto;
    padding: var(--sui-space-3) var(--sui-space-6) var(--sui-space-6);
  }

  .sui-modal-foot {
    align-items: center;
    background-color: var(--sui-dialog-bg);
    border-block-start: 1px solid var(--sui-border-divider);
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-content: flex-end;
    margin-block-start: auto;
    padding: var(--sui-space-4) var(--sui-space-6);
  }

  @keyframes sui-modal-in {
    from {
      opacity: 0;
      translate: 0 var(--sui-space-2);
    }
  }

  @keyframes sui-inspector-in {
    from {
      opacity: 0;
      translate: var(--sui-space-4) 0;
    }
  }

  @media (max-width: 38rem) {
    .sui-modal {
      inline-size: 100%;
      max-block-size: calc(100dvh - 2 * var(--sui-space-2));
      max-inline-size: calc(100vw - 2 * var(--sui-space-2));
    }

    .sui-modal[data-size='inspector'] {
      inline-size: 100%;
      max-block-size: none;
      max-inline-size: none;
    }

    .sui-modal-head,
    .sui-modal-body,
    .sui-modal-foot {
      padding-inline: var(--sui-space-4);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-modal[open] {
      animation: none;
    }
  }
</style>
