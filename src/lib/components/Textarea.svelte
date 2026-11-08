<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { held, holdAround } from '../internal/held.svelte.js';
  import { getRefusals } from '../internal/refusals.svelte.js';

  let {
    value = $bindable(''),
    rows = 3,
    invalid = false,
    mono = false,
    element = $bindable(null),
    readonly = false,
    'aria-invalid': ariaInvalid,
    class: className = '',
    ...rest
  }: {
    value?: string | null;
    /** How many lines it shows before it scrolls. The reader can drag it taller. */
    rows?: number;
    /** Marks the value as wrong; pair it with an error the field describes. */
    invalid?: boolean;
    /** For technical text: config, YAML, a list of paths. */
    mono?: boolean;
    element?: HTMLTextAreaElement | null;
    class?: HTMLTextareaAttributes['class'];
  } & Omit<HTMLTextareaAttributes, 'value'> = $props();

  const refusals = getRefusals();

  /* A caller's own `aria-invalid` counts as much as `invalid`. */
  const wrong = $derived(
    invalid ||
      (ariaInvalid !== undefined && String(ariaInvalid) !== 'false') ||
      Boolean(refusals?.refuses(element))
  );
  /* Work that runs on the form around it holds the value: a firm hold disables the field once
     its owner has moved focus to the busy action, and a soft one keeps it focusable and read
     only. */
  const around = holdAround();
  const holding = $derived(held(element, around));

  /* Enter is a new line here, so the send moves to Ctrl+Enter or Cmd+Enter, as in a chat or a
     review comment. */
  function keydown(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }): void {
    rest.onkeydown?.(event);
    if (event.defaultPrevented || event.isComposing || event.key !== 'Enter') return;
    if (!(event.metaKey || event.ctrlKey) || !event.currentTarget.form) return;
    event.preventDefault();
    event.currentTarget.form.requestSubmit();
  }
</script>

<!--
@component
The one multi-line field, for words a person writes: a reason, a note, a description. It
wears the same paint as `TextInput`, sets its text in the interface face at control size
instead of the browser's default, and the reader can drag it taller but never wider.

It has no label of its own. Put it in a `Field` through the `control` snippet, or give it
`aria-label`. `mono` is for technical text such as configuration.

- Semantics: a native `<textarea>`, named by a `<label for>` or `aria-label`; `invalid`, a caller's `aria-invalid` or a value the browser's check refused sets `aria-invalid`.
- Content: free text over several lines, `rows` lines tall before it scrolls, with an optional placeholder that is an example and never the label. `mono` text is never spellchecked or capitalized.
- States: rest (the control fill, a quiet frame, a recess under its top edge darker than the frame and a 3:1 baseline), hover (a firmer frame and recess), focus (the rest fill under a flush 2px ring, so a focused field never reads as read-only), invalid (a danger edge on all four sides, kept under hover and focus), held (disabled while a busy dialog or a saving pane around it works, read only and focusable while a saving setting row does, 0.6 opacity either way) and read-only (a lighter tint of the field well under a quiet frame, no recess), disabled (the full field well with no frame and its words in the muted ink at full strength, no resize).
- Keyboard: the browser's own text editing, Enter included; Ctrl+Enter or Cmd+Enter sends the form around it; Tab moves on.
- Pointer and touch: at least 34px tall, 44px on a phone or any touch screen, with 16px text on a phone so iOS does not zoom; the resize grip is an extra, never the only way to read more.
- Focus: it takes focus on a press and never moves it elsewhere.
- Responsive: it fills its container's width, wraps long words, and the reader can drag it taller but never wider.
- Accessibility: the label names it, a field's hint and error describe it, the baseline holds 3:1 on every ground, and its text holds 4.5:1.
- Localization: it draws no words of its own, its padding is logical, and the browser sets the text's direction from the page.
- Performance: one native textarea with no script beyond the binding; only its edge and fill colours change.
- Analytics: the native `oninput` and `onchange` report what the reader wrote.
- Failure: an invalid value keeps the danger edge in every state, and the words that say why belong to the `Field` or the caller; a value its own constraints (`required`, `minlength`) refuse on a send is said in the error line of the field around it in place of the browser's bubble, and with no field around it the browser says it.
-->

<textarea
  bind:this={element}
  bind:value
  {rows}
  spellcheck={mono ? false : undefined}
  autocapitalize={mono ? 'off' : undefined}
  {...rest}
  onkeydown={keydown}
  disabled={rest.disabled || holding === 'firm'}
  readonly={readonly || holding !== null}
  {@attach refusals?.watch}
  class={['sui-textarea', className]}
  class:mono
  class:held={holding !== null}
  aria-invalid={wrong || undefined}></textarea>

<style>
  .sui-textarea {
    background-color: var(--sui-control-bg);
    border: var(--sui-stroke) solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    display: block;
    font: var(--sui-weight-regular) var(--sui-font-size-input) / var(--sui-leading-input)
      var(--sui-sans);
    inline-size: 100%;
    margin: 0;
    min-block-size: var(--sui-control-height-compact);
    min-inline-size: var(--sui-field-target-min);
    padding: var(--sui-space-2) var(--sui-field-inset);
    resize: vertical;
  }

  .sui-textarea::placeholder {
    color: var(--sui-text-muted);
    opacity: 1;
  }

  @media (hover: hover) {
    /* Hover lays the row veil over the field and steps its edge up, and an invalid field keeps
       its danger edge, a step deeper, so every field answers the pointer (L-9). */
    .sui-textarea:hover:not(:disabled, :focus, [readonly]) {
      background-color: var(--sui-field-hover);
      border-color: var(--sui-field-frame-hover);
      border-block-end-color: var(--sui-field-border-hover);
      box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess-hover);
    }

    .sui-textarea[aria-invalid='true']:hover:not(:disabled, :focus, [readonly]) {
      background-color: var(--sui-field-danger-hover);
      border-color: var(--sui-danger-hover);
    }
  }

  .sui-textarea:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-edge) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
    box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess-focus);
  }

  .sui-textarea[aria-invalid='true'] {
    border-color: var(--sui-danger);
  }

  /* A danger edge is not the ring's color, so the outline draws the whole 2px ring past it. */
  .sui-textarea[aria-invalid='true']:focus-visible {
    outline-width: var(--sui-focus-ring-width);
  }

  /* A value that only reads sits in a light tint of the field well with a quiet frame and no
     recess, as a read-only text field does (L-10). */
  .sui-textarea[readonly]:not(.held) {
    background-color: var(--sui-field-readonly);
    border-color: var(--sui-border-subtle);
    box-shadow: none;
    /* Its quiet frame is not the ring's color, so a ring draws its whole 2px past it. */
    outline-width: var(--sui-focus-ring-width);
  }

  /* A field that is off fills the field well with no frame, baseline or recess, its words in the muted ink at full strength, so it never looks like an empty field
     to type in and its value stays legible; a held one dims with the work around it. */
  .sui-textarea:disabled:not(.held) {
    background-color: var(--sui-field-well);
    border-color: transparent;
    box-shadow: none;
    color: var(--sui-text-muted);
    -webkit-text-fill-color: currentColor;
  }

  /* An invalid field keeps its danger edge when it is off too, over the well's quiet frame,
     since it still says it is wrong (L-9). */
  .sui-textarea[aria-invalid='true']:disabled {
    border-color: var(--sui-danger);
  }

  .sui-textarea:is(:disabled, .held) {
    cursor: default;
    resize: none;
  }

  .sui-textarea.held {
    opacity: var(--sui-disabled-opacity);
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  /* High contrast paints every edge in one colour, so an invalid field says so with a 2px edge. */
  @media (forced-colors: active) {
    .sui-textarea[aria-invalid='true'] {
      border-width: var(--sui-stroke-bold);
    }
  }
</style>
