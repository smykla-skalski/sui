<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import Modal from './Modal.svelte';

  let {
    open = $bindable(false),
    title,
    consequence,
    confirmLabel,
    cancelLabel = 'Cancel',
    tone = 'signal',
    onconfirm,
    oncancel,
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
    /** `stop` for an act that takes something away, `signal` for one that gives. */
    tone?: 'signal' | 'stop';
    onconfirm?: () => void;
    /** Runs for every way out that is not the confirm action: Cancel, Escape, an outside press. */
    oncancel?: () => void;
    children?: Snippet;
  } = $props();

  let confirmed = false;

  function confirm(): void {
    confirmed = true;
    open = false;
    onconfirm?.();
  }

  function closed(): void {
    if (!confirmed) oncancel?.();
    confirmed = false;
  }
</script>

<!--
@component
A question asked before an act, and the two buttons that answer it. Ask only when the act cannot
be taken back or would discard work; an act that can be undone should just happen and say so in
a toast.

The title is the question and `consequence` the one sentence that says what follows. Cancel is
a bordered default button that opens focused, so Enter never confirms by accident, and it sits
before the confirm action in the trailing group. Every way out other than the confirm action
calls `oncancel`. Anything the answer needs, such as a reason, goes in the children.
-->

{#snippet footer()}
  <Button autofocus onclick={() => (open = false)}>{cancelLabel}</Button>
  <Button {tone} onclick={confirm}>{confirmLabel}</Button>
{/snippet}

<Modal bind:open {title} description={consequence} onclose={closed} {children} {footer} />
