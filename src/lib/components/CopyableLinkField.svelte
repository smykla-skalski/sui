<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLAttributes, HTMLTextareaAttributes } from 'svelte/elements';
  import JoinedField from '../internal/JoinedField.svelte';
  import CopyButton from './CopyButton.svelte';
  import Field, { type FieldControl } from './Field.svelte';

  let {
    value,
    label,
    hint,
    copyLabel = word('CopyableLinkField.copyLabel', 'Copy link'),
    copiedLabel = word('CopyableLinkField.copiedLabel', 'Copied'),
    failedLabel = word('CopyableLinkField.failedLabel', 'Copy failed'),
    oncopied,
    oncopyfailed,
    class: className = '',
    ...rest
  }: {
    /** The link or token, copied whole; a long one wraps, so all of it shows. */
    value: string;
    /** Draws a `Field` label over the value. Without one, name the field with `aria-label`. */
    label?: string;
    /** One sentence under the field, such as when the link stops working. */
    hint?: string;
    /** The copy button's resting label, naming what it copies. */
    copyLabel?: string;
    /** Said for 1.6 seconds after each copy. */
    copiedLabel?: string;
    /** Said when the browser refuses the write, until the next press. */
    failedLabel?: string;
    /** Hears each copy that landed on the clipboard. */
    oncopied?: () => void;
    /** Hears each refused write, after focus moved to the selected value. */
    oncopyfailed?: (error: unknown) => void;
    /** Layout for the call site only, on the whole field. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLTextareaAttributes, 'value' | 'readonly' | 'class' | 'children'> = $props();

  let input = $state<HTMLTextAreaElement | null>(null);

  /* The value wraps at any character, and the box is as tall as its lines, so a long token is
     never cut. A browser that sizes a field to its content does it in CSS alone. Elsewhere the
     height is measured again when the width changes, which moves the wraps, in the next frame,
     so the height it sets is not a change the watcher is still reporting. */
  function fit(node: HTMLTextAreaElement) {
    if (CSS.supports('field-sizing', 'content')) return;
    const size = () => {
      node.style.blockSize = '0px';
      node.style.blockSize = `${node.scrollHeight}px`;
    };
    size();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(size);
    });
    observer.observe(node.parentElement ?? node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }

  /* Selecting by hand is the way out when the clipboard refuses, so the value is handed over
     selected, ready for the platform's own copy. */
  function offer(error: unknown) {
    input?.focus();
    input?.select();
    oncopyfailed?.(error);
  }
</script>

<!--
@component
A generated link or token, shown so it can be read, copied in one press, or selected and
copied by hand. The value sits in a read-only mono field, never a disabled one, because a
disabled field cannot be selected, and selecting it is the way out when the clipboard is not
available. Tabbing into the field selects the whole value, and a refused copy moves focus to
the value with all of it selected.

The field and its `CopyButton` are one control: the copy action is a chip inside the field's
end, under one frame. The copy part confirms with "Copied". A long value wraps onto more lines
at any character, so all of it shows and it never widens the row. With `label` the pair sits in a `Field`, and the label names
the text field.

- Semantics: a read-only text area named by its `Field` label or `aria-label`, and a copy button named by `copyLabel`, inside one joined field.
- Content: one link or token in the mono face, and the copy action's three short labels.
- States: rest (the inset well and a quiet frame, because it only reads), focus on the value (the field's ring, the value selected), focus on the copy action (its own inset ring), pressed copy action (a deeper veil and an inset shadow), copied and failed.
- Keyboard: Tab selects the value and moves on to the copy action, Enter or Space copies, and the platform's own copy works on the selection.
- Pointer and touch: 34px tall, 44px on a phone or any touch screen, and the copy action keeps a 44px hit area there.
- Focus: copying keeps focus on the action, and a refused copy moves it to the value, selected.
- Responsive: it fills its container, a long value wraps onto more lines, and the copy action keeps its width.
- Accessibility: each part has its own name, the outcome is spoken through the copy action's status, and the value's text holds 4.5:1.
- Localization: `copyLabel`, `copiedLabel` and `failedLabel` are props with English defaults, and the copy action sits at the inline end in either direction.
- Performance: one text area and one button; the text area is measured again only when its width changes.
- Analytics: `oncopied` hears each copy and `oncopyfailed` each refusal.
- Failure: a refused copy says so and hands the value over selected, so the reader can still copy it by hand.
-->

{#snippet row(control?: FieldControl)}
  <JoinedField readonly>
    {#snippet start()}
      <!-- A read-only area takes focus by Tab, which selects the whole value, as a field does. -->
      <textarea
        bind:this={input}
        {...rest}
        id={control?.id ?? rest.id}
        aria-describedby={control?.describedby ?? rest['aria-describedby']}
        class="sui-copyable-link-value"
        {value}
        readonly
        rows="1"
        spellcheck="false"
        {@attach fit}
        onfocus={(event) => event.currentTarget.select()}></textarea>
    {/snippet}
    {#snippet end()}
      <CopyButton
        text={value}
        label={copyLabel}
        {copiedLabel}
        {failedLabel}
        {oncopied}
        oncopyfailed={offer}
        bare
      />
    {/snippet}
  </JoinedField>
{/snippet}

<div class={['sui-copyable-link-field', className]}>
  {#if label}
    <Field {label} {hint} id={rest.id ?? undefined} control={row} />
  {:else}
    {@render row()}
  {/if}
</div>

<style>
  /* The copy chip wraps its words at a large text size, so it keeps clear of the frame. */
  .sui-copyable-link-field {
    --sui-local-joined-end-inset: var(--sui-control-inset);
    min-inline-size: 0;
  }

  /* The copy chip's ground stays inside the field, so on touch its 44px hit area may reach
     over the field's edge. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-copyable-link-field {
      --sui-local-joined-reach: var(--sui-stroke);
    }
  }

  /* The ground, edge and ring are the joined field's. The lines keep the control's text
     inset, so one line sits where a one-line field's value would. */
  .sui-copyable-link-value {
    background: transparent;
    border: 0;
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: block;
    field-sizing: content;
    font: var(--sui-weight-regular) var(--sui-font-size-input) / var(--sui-leading-input)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    inline-size: 100%;
    margin: 0;
    min-block-size: calc(
      var(--sui-local-control-height, var(--sui-control-height-compact)) - 2 * var(--sui-stroke)
    );
    outline: none;
    overflow: hidden;
    overflow-wrap: anywhere;
    padding: calc(
        (
            var(--sui-local-control-height, var(--sui-control-height-compact)) - 2 *
              var(--sui-stroke) - var(--sui-leading-input)
          ) /
          2
      )
      var(--sui-space-2);
    resize: none;
    word-break: break-all;
  }
</style>
