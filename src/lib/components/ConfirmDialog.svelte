<script lang="ts">
  import { word } from '../words.js';
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import Modal, { type ModalCloseReason } from './Modal.svelte';

  let {
    open = $bindable(false),
    title,
    consequence,
    confirmLabel,
    cancelLabel = word('ConfirmDialog.cancelLabel', 'Cancel'),
    closeLabel = word('ConfirmDialog.closeLabel', 'Close'),
    failedLabel = word(
      'ConfirmDialog.failedLabel',
      () => 'That could not be done, so nothing changed'
    ),
    tone = 'signal',
    onconfirm,
    oncancel,
    returnFocus,
    preview = false,
    children
  }: {
    open?: boolean;
    /** The question, such as "Delete this repository?". */
    title: string;
    /** One sentence saying what happens if the reader confirms. */
    consequence: string;
    /** A verb phrase naming the result, such as "Delete repository". */
    confirmLabel: string;
    cancelLabel?: string;
    /** The close button's name and tooltip. */
    closeLabel?: string;
    /** What the dialog says when `onconfirm` rejects, from the reason it rejected with. */
    failedLabel?: (reason: unknown) => string;
    /** `stop` for an act that takes something away, `signal` for one that gives. */
    tone?: 'signal' | 'stop';
    /** The act. A promise keeps the dialog open and pending until it settles, and a rejection keeps it open with `failedLabel`. */
    onconfirm?: () => void | Promise<unknown>;
    /** Runs for every way out that is not the confirm action: Cancel, Escape, an outside press. */
    oncancel?: (reason: ModalCloseReason | 'cancel') => void;
    /** What takes focus when the dialog closes and its opener is gone, such as the row after a deleted one. */
    returnFocus?: () => HTMLElement | null | undefined;
    /** Draws the question in the page's flow, as `Modal` does, without taking focus. */
    preview?: boolean;
    children?: Snippet;
  } = $props();

  let confirmed = false;
  let cancelled = false;
  let pending = $state(false);
  let failure = $state<string | undefined>();

  async function confirm(): Promise<void> {
    if (pending) return;
    failure = undefined;
    try {
      const result = onconfirm?.();
      if (result && typeof result.then === 'function') {
        pending = true;
        await result;
      }
    } catch (reason) {
      failure = failedLabel(reason);
      return;
    } finally {
      pending = false;
    }
    confirmed = true;
    open = false;
  }

  function cancel(): void {
    cancelled = true;
    open = false;
  }

  function closed(reason: ModalCloseReason): void {
    if (!confirmed) oncancel?.(cancelled ? 'cancel' : reason);
    confirmed = false;
    cancelled = false;
    failure = undefined;
  }
</script>

<!--
@component
A question asked before an act, and the two buttons that answer it. Ask only when the act cannot
be taken back or would discard work; an act that can be undone should just happen and say so in
a toast.

It is an `alertdialog`. The title is the question and `consequence` the one sentence that says
what follows. Cancel is a bordered default button before the confirm action in the trailing
group. A question with a field in its body, such as a reason, opens on that field, so the reader
can type at once. Without one, with the `stop` tone Cancel opens focused, so Enter never takes
something away by accident; with `signal` the confirm action does. Every way out other than the confirm action
calls `oncancel`. Anything the answer needs, such as a reason, goes in the children.

The act runs before the dialog closes. When `onconfirm` returns a promise, the confirm button
keeps focus and shows it is working, and the dialog refuses every way out until it settles. A
rejection keeps the dialog open and says so, so the reader can try again or cancel.

- Semantics: a modal `alertdialog` named by the question and described by the consequence, with two buttons.
- Content: a question, one sentence of consequence, optional fields in the body, and two verb-phrase buttons; long words wrap.
- States: asking, pending (confirm button busy, Cancel disabled beside it, every way out refused) and failed (`failedLabel` above the buttons, both buttons ready again).
- Keyboard: Tab cycles inside, Enter or Space answers with the focused button, Escape cancels unless the act is pending.
- Pointer and touch: both buttons are 34px tall, 44px on a phone or touch screen, and a press outside cancels as Escape does, unless the act is pending.
- Focus: opens on the body's first field, else on Cancel for `stop` and on the confirm button for `signal`; while pending it moves to the confirm button and the fields are disabled, and on close returns to the opener, `returnFocus` or the nearest control.
- Responsive: the buttons wrap onto a second line at the trailing edge, and the box fills a phone's width less 8px each side.
- Accessibility: the role makes a screen reader read the question and consequence at once, the pending button is announced as busy, and a failure is announced as an alert.
- Localization: `cancelLabel`, `closeLabel` and `failedLabel` carry the built-in words, and the buttons sit at the inline end, mirrored in a right-to-left page.
- Performance: one dialog in the top layer while open, with the entry motion of `Modal`.
- Analytics: `onconfirm` reports a yes, and `oncancel` reports a no with `cancel`, `escape`, `close` or `outside`.
- Failure: a rejected `onconfirm` keeps the question open with `failedLabel` and nothing closed; an opener removed by the act hands focus to `returnFocus` or the nearest control.
-->

{#snippet footer()}
  <Button autofocus={!preview && tone === 'stop'} disabled={pending} onclick={cancel}
    >{cancelLabel}</Button
  >
  <Button {tone} autofocus={!preview && tone !== 'stop'} loading={pending} onclick={confirm}
    >{confirmLabel}</Button
  >
{/snippet}

<Modal
  bind:open
  {preview}
  role="alertdialog"
  {title}
  description={consequence}
  busy={pending}
  error={failure}
  {closeLabel}
  {returnFocus}
  onclose={closed}
  {children}
  {footer}
/>
