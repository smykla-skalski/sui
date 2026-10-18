<script module lang="ts">
  /** How a dialog ended: Escape, its close button, a press outside it, or the caller setting `open`. */
  export type ModalCloseReason = 'escape' | 'close' | 'outside' | 'program';
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
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
    busy = false,
    error,
    closeLabel = word('Modal.closeLabel', 'Close'),
    beforeClose,
    returnFocus,
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
    /** The dialog's work is running, such as a save: it is `aria-busy` and refuses every way out but `open`. */
    busy?: boolean;
    /** Why the last submit failed, drawn above the footer and announced. The dialog stays open with its fields. */
    error?: string;
    /** The close button's name and tooltip. */
    closeLabel?: string;
    /** Asked before Escape, an outside press or the close button ends the dialog; `false` keeps it open. */
    beforeClose?: () => boolean;
    /** What takes focus on close when the control that opened the dialog is gone, such as the row after a deleted one. */
    returnFocus?: () => HTMLElement | null | undefined;
    /** Runs once the dialog has closed, with what closed it. */
    onclose?: (reason: ModalCloseReason) => void;
    /** Draws the box in the page's flow at its width, capped to its container, with no scrim, focus trap or `open`. */
    preview?: boolean;
    element?: HTMLDialogElement | null;
    class?: HTMLDialogAttributes['class'];
    children?: Snippet;
    /** Actions that stay in view below the scrolling body, trailing edge first in reading order. */
    footer?: Snippet;
  } & Omit<
    HTMLDialogAttributes,
    'open' | 'title' | 'role' | 'children' | 'class' | 'onclose'
  > = $props();

  const titleId = `${uid}-title`;
  const descriptionId = `${uid}-description`;

  const TABBABLE =
    ':is(a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]):not(:disabled, [tabindex^="-"], [contenteditable="false"], [type="hidden"], [type="radio"]:not(:checked))';
  const EDITABLE =
    'input:not([type="hidden"]), textarea, select, [contenteditable]:not([contenteditable="false"])';

  let opener: Element | null = null;
  // The opener's ancestors from the nearest out, each with the controls it held, ordered from
  // just after the opener outwards. Focus finds its way back through them when the opener
  // is gone by the time the dialog closes, as a deleted row's menu trigger is.
  let home: { place: Element; around: HTMLElement[] }[] = [];
  let reason: ModalCloseReason = 'program';
  let pressedOutside = false;
  let body = $state<HTMLElement | null>(null);
  let foot = $state<HTMLElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);

  const firstIn = (root: Element | null) =>
    [...(root?.querySelectorAll<HTMLElement>(TABBABLE) ?? [])].find((node) =>
      node.checkVisibility()
    );

  $effect(() => {
    if (!element) return;
    if (open && !element.open) {
      opener = document.activeElement;
      home = [];
      for (let at = opener?.parentElement; at && at !== document.body; at = at.parentElement) {
        const all = [...at.querySelectorAll<HTMLElement>(TABBABLE)];
        const index = all.indexOf(opener as HTMLElement);
        home.push({
          place: at,
          around: [...all.slice(index + 1), ...all.slice(0, Math.max(index, 0)).reverse()]
        });
      }
      reason = 'program';
      element.showModal();
      // The browser would focus the first control in tree order, which is Close in the head.
      if (!element.querySelector('[autofocus]'))
        (firstIn(body) ?? firstIn(foot) ?? closeButton)?.focus();
    } else if (!open && element.open) element.close();
  });

  $effect(() => {
    if (open && element) return hostToasts(element);
  });

  function dismiss(how: ModalCloseReason): void {
    if (busy || beforeClose?.() === false) return;
    reason = how;
    open = false;
  }

  // The opener when it is still there, else the caller's choice, else the nearest control left
  // where the opener stood.
  function successor(): HTMLElement | null | undefined {
    if (opener instanceof HTMLElement && opener.isConnected && opener.checkVisibility())
      return opener;
    const chosen = returnFocus?.();
    if (chosen) return chosen;
    // A control that took the opener's place since, such as a "Restore" button, counts too.
    for (const { place, around } of home) {
      if (!place.isConnected) continue;
      const found =
        around.find(
          (node) => node.isConnected && node.matches(TABBABLE) && node.checkVisibility()
        ) ?? firstIn(place);
      if (found) return found;
    }
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

  // An open layer inside the dialog (a menu, a listbox, a manual `Popover`) takes Escape and
  // outside presses first, and the dialog stays.
  // `:is()` keeps a browser without `:open` from rejecting the whole selector.
  const layered = () =>
    element?.querySelector(
      ':is([popover="auto"]:popover-open, .sui-popover:popover-open, select:open)'
    ) != null;

  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || layered()) return;
    // Handled here rather than through `cancel`, which the browser stops letting a page refuse
    // after the first Escape without a click in between.
    event.preventDefault();
    dismiss('escape');
  }

  function oncancel(event: Event): void {
    event.preventDefault();
    dismiss('escape');
  }

  // A stray press must never throw away a half-filled form, so only a dialog without fields
  // closes on one.
  function onpointerdown(event: PointerEvent): void {
    pressedOutside = outside(event) && !layered() && !element?.querySelector(EDITABLE);
  }

  // `closedby="any"` would do this natively, but Safari does not support it yet. A press that
  // starts inside the box and ends outside it, as a text selection does, never closes.
  function onclick(event: MouseEvent): void {
    if (pressedOutside && outside(event)) dismiss('outside');
    pressedOutside = false;
  }

  function closed(): void {
    open = false;
    successor()?.focus();
    opener = null;
    home = [];
    onclose?.(reason);
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

While a submit runs, set `busy`: the dialog refuses Escape, the close button and an outside
press until the work ends. When it fails, keep the dialog open and set `error`, so the reader
keeps what they typed and reads why above the footer. The page's toasts draw inside the topmost
dialog, so they are never inert under it.

- Semantics: a modal `<dialog>`, or `alertdialog` through `role`, named by its `<h2>` title and described by `description`.
- Content: a title, one description, the body's fields and a footer of actions with the primary action last; the title and the error wrap.
- States: closed, open, busy (`aria-busy`, every way out refused) and failed (`error` in the danger ink with its symbol); the inspector docks to the inline end at full height.
- Keyboard: Tab stays inside, Escape closes after `beforeClose` unless a layer inside took it, and Enter belongs to the focused control.
- Pointer and touch: the close button is a 34px target, 44px on a phone or touch screen, and a press outside closes only a dialog that holds no field.
- Focus: opens on an `[autofocus]` element, else the body's first control, then the footer's, then Close; returns to the opener, or to `returnFocus`, or to the first control left where the opener stood.
- Responsive: its parts stand 24px from each other and from every edge, 16px under 48rem, where it fills the width less 8px each side; a body taller than the box scrolls under the footer behind a line, and on a short screen (30rem tall or less) the head, body and footer scroll as one so the footer never covers the fields.
- Accessibility: the title names it and the description describes it, `error` is announced as an alert, and the scrim follows `--sui-scrim`.
- Localization: `closeLabel` names the close button, every other word is the caller's, and the inspector docks and slides in from the inline end, mirrored in a right-to-left page.
- Performance: the box enters with one 220ms fade and short slide on transform and opacity, removed under reduced motion; a closed dialog keeps no listeners.
- Analytics: `onclose` reports `escape`, `close`, `outside` or `program`, so a caller can tell a save from an abandon.
- Failure: a refused submit keeps the dialog open with `error`; a missing body draws the head alone with its full inset; a missing opener sends focus to `returnFocus` or the nearest control.
-->
{#snippet box()}
  <header class="sui-modal-head">
    <div class="sui-modal-heading">
      <h2 id={titleId} class="sui-modal-title">{title}</h2>
      <span class="sui-modal-close"
        ><IconButton
          bind:element={closeButton}
          icon="close"
          label={closeLabel}
          aria-disabled={busy || undefined}
          onclick={() => dismiss('close')}
        /></span
      >
    </div>
    {#if description}<p id={descriptionId} class="sui-modal-description">{description}</p>{/if}
  </header>
  {#if children}<div bind:this={body} class="sui-modal-body">{@render children()}</div>{/if}
  <div class="sui-modal-error" role="alert">
    {#if error}
      <p class="sui-modal-error-line">
        <span class="sui-modal-error-mark"><Icon name="failure" size="md" /></span><span
          class="sui-modal-error-text">{error}</span
        >
      </p>
    {/if}
  </div>
  {#if footer}<footer bind:this={foot} class="sui-modal-foot">{@render footer()}</footer>{/if}
{/snippet}

{#if preview}
  <div
    {role}
    class={['sui-modal', 'preview', className]}
    data-size={size}
    aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined}
    aria-busy={busy || undefined}
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
    aria-busy={busy || undefined}
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
  /* Each part pads half the inset above and below, and the box the other half, so the parts
     stand one inset from each other and from every edge, measured to the ink. */
  .sui-modal {
    --sui-local-modal-inset: var(--sui-space-6);
    background-color: var(--sui-dialog-bg);
    border: var(--sui-stroke) solid var(--sui-dialog-border);
    border-radius: var(--sui-radius-dialog);
    box-shadow: var(--sui-shadow-dialog);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    inline-size: 34rem;
    max-block-size: calc(100dvh - 2 * var(--sui-space-4));
    max-inline-size: calc(100vw - 2 * var(--sui-space-4));
    overflow: hidden;
    padding: calc(var(--sui-local-modal-inset) / 2) 0;
  }

  .sui-modal-head,
  .sui-modal-body,
  .sui-modal-error-line,
  .sui-modal-foot {
    padding: calc(var(--sui-local-modal-inset) / 2) var(--sui-local-modal-inset);
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
  }

  .sui-modal-heading {
    align-items: center;
    display: flex;
    gap: var(--sui-space-4);
    justify-content: space-between;
    min-inline-size: 0;
  }

  .sui-modal-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-bold) var(--sui-font-size-dialog-title) / var(--sui-leading-title)
      var(--sui-sans);
    letter-spacing: -0.015em;
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  /* A zero-height seat on the middle of the title's first line, rounded down to the pixel, so
     the even-height button centred on it lands on whole pixels (L-95) and stays by the first
     line when the title wraps. The title's face makes `1cap` its cap height. The button reaches
     past the head's inset by its own padding, so its glyph stands on the content's edge, as
     far from the dialog's side as the title is from the other, square to the corner. */
  .sui-modal-close {
    align-items: center;
    align-self: flex-start;
    block-size: 0;
    display: flex;
    flex: none;
    font: var(--sui-weight-bold) var(--sui-font-size-dialog-title) / var(--sui-leading-flat)
      var(--sui-sans);
    margin-block-start: round(down, calc(round(up, 1cap, 1px) / 2), 1px);
    margin-inline-end: round(calc((var(--sui-icon-sm) - var(--sui-tier-quiet)) / 2), 1px);
  }

  .sui-modal-description {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
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
  }

  /* The failure sits between the fields and the actions that will try again. */
  .sui-modal-error {
    flex: none;
    position: relative;
  }

  /* A body taller than the box is cut where the error and the actions begin, and a line marks
     the cut. A body that fits is never cut, so it draws no line, as Primer and Material do.
     Where scroll timelines are missing, the line always shows. */
  .sui-modal-body + .sui-modal-error::before {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
    content: '';
    inset-block-start: 0;
    inset-inline: 0;
    position: absolute;
  }

  @supports (animation-timeline: scroll()) {
    .sui-modal {
      timeline-scope: --sui-modal-body;
    }

    .sui-modal-body {
      scroll-timeline: --sui-modal-body block;
    }

    .sui-modal-body + .sui-modal-error::before {
      animation: sui-modal-cut var(--sui-ease-linear) both;
      animation-timeline: --sui-modal-body;
      opacity: 0;
    }
  }

  @keyframes sui-modal-cut {
    from,
    to {
      opacity: 1;
    }
  }

  .sui-modal-error-line {
    align-items: flex-start;
    color: var(--sui-danger);
    display: flex;
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
    margin: 0;
  }

  /* The symbol centres on the first line of the message, however many lines follow. */
  /* Centred on the first line of the reason, the box an even snap gives one line (L-94). */
  .sui-modal-error-mark {
    display: flex;
    flex: none;
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-md)) / 2);
  }

  .sui-modal-error-text {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-modal-foot {
    align-items: center;
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-content: flex-end;
    margin-block-start: auto;
  }

  @keyframes sui-modal-in {
    from {
      opacity: 0;
      translate: 0 var(--sui-space-2);
    }
  }

  /* The inspector arrives from the inline end, which is the left edge in a right-to-left page. */
  @keyframes sui-inspector-in {
    from {
      opacity: 0;
      translate: var(--sui-space-4) 0;
    }
  }

  @keyframes sui-inspector-in-rtl {
    from {
      opacity: 0;
      translate: calc(-1 * var(--sui-space-4)) 0;
    }
  }

  .sui-modal[open][data-size='inspector']:dir(rtl) {
    animation-name: sui-inspector-in-rtl;
  }

  @media (max-width: 47.9375rem) {
    .sui-modal {
      --sui-local-modal-inset: var(--sui-space-4);
      inline-size: 100%;
      max-block-size: calc(100dvh - 2 * var(--sui-space-2));
      max-inline-size: calc(100vw - 2 * var(--sui-space-2));
    }

    .sui-modal[data-size='inspector']:not(.preview) {
      inline-size: 100%;
      max-block-size: none;
      max-inline-size: none;
    }
  }

  /* On a short screen, as at 400% zoom, a pinned head and footer would leave the fields a
     sliver, so the whole box scrolls as one (WCAG 1.4.10). */
  @media (max-height: 30rem) {
    .sui-modal[open],
    .sui-modal.preview {
      overflow-y: auto;
    }

    .sui-modal-body {
      flex: none;
      overflow-y: visible;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-modal[open] {
      animation: none;
    }
  }
</style>
