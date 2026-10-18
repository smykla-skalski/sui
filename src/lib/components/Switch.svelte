<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();

  let {
    checked = $bindable(false),
    label,
    bare = false,
    invalid = false,
    disabled = false,
    pending = false,
    error,
    element = $bindable(null),
    'aria-describedby': describedBy,
    onclick,
    class: className = '',
    children,
    ...rest
  }: {
    checked?: boolean;
    /** The words beside the track, which are also its accessible name. */
    label?: string;
    /** Drops the 44px tap box from layout, for a head or row that sets its own rhythm. */
    bare?: boolean;
    /** Marks the value as wrong; pair it with an error the field describes. */
    invalid?: boolean;
    disabled?: boolean;
    /** The change is being saved: the thumb turns, the switch is busy and refuses another flip. */
    pending?: boolean;
    /** Says why the last flip did not take effect; set `checked` back with it. */
    error?: string;
    element?: HTMLInputElement | null;
    /** Layout for the call site only, never the switch's own paint. */
    class?: HTMLInputAttributes['class'];
    /** Richer words than `label` can carry. */
    children?: Snippet;
  } & Omit<HTMLInputAttributes, 'type' | 'checked' | 'role' | 'children'> = $props();

  const describedby = $derived(
    [describedBy, error && `${uid}-error`].filter(Boolean).join(' ') || undefined
  );

  /* A flip that is still saving cannot be undone half way, so a second press waits; the
     switch keeps focus instead of disabling, which would drop it to the body. */
  function press(event: MouseEvent & { currentTarget: EventTarget & HTMLInputElement }) {
    if (pending) event.preventDefault();
    else onclick?.(event);
  }
</script>

<!--
@component
A boolean a reader flips directly. Flipping it is the change, so it is an input with the
switch role and not a button that opens a form. A multi-choice or a consent is a
`CheckList` instead.

The track says nothing on its own, so give it words: `label`, `children`, a `Field` whose
label points at its `id`, or `aria-label`. The track always carries a 44px hit area. The
row is 44px tall too unless `bare` takes that out of layout, for a head or a row that sets
its own rhythm.

A flip takes effect at once, so its save has two states of its own: `pending` turns the thumb
into a spinner while the change is saved and holds off another flip, and `error` says why a change did not
take, under the switch and to a screen reader, while the owner sets `checked` back.

- Semantics: a native `<input type="checkbox" role="switch">` inside its `<label>`, described by `error`, with a polite `role="status"` that speaks the error.
- Content: a short label that names what turns on, or richer `children`, and an optional one-sentence error.
- States: off, on (the track fills and the thumb travels 14px), hover (a veil on the track), focus (a 2px ring 2px off the track), pressed (a deeper veil, an inset shadow and a 1px sink), pending (the track dims as a busy button does and the thumb turns into the spinner where it stands, busy), failed (an error with a warning mark), invalid (a danger edge, kept when on) and disabled (0.5 opacity).
- Keyboard: Tab reaches it and Space flips it; a pending switch refuses the flip and keeps focus.
- Pointer and touch: a 34 by 20px track with a 44px hit area, and a 44px row unless `bare`; the label is part of the target.
- Focus: a flip never moves focus, and neither does a pending or failed save.
- Responsive: a long label wraps beside the track and the two stay centred; the error wraps under them.
- Accessibility: the label is the name, the state is the switch's own, `pending` sets `aria-busy`, the error describes it and is spoken, and the track's edge holds 3:1.
- Localization: its words come from the caller, the thumb travels toward the inline end, so it mirrors in a right-to-left page.
- Performance: one native input; the thumb moves by `translate` and turns by `rotate`, and neither moves under reduced motion.
- Analytics: the native `onchange` reports each flip; a refused press never fires it.
- Failure: `error` draws the reason with a mark and speaks it, and `pending` holds off a second flip until the save answers.
-->

<span class={['sui-switch', className, { bare }]}>
  <label class="sui-switch-row" class:bare class:disabled>
    {#if children}
      <span class="sui-switch-label">{@render children()}</span>
    {:else if label}
      <span class="sui-switch-label">{label}</span>
    {/if}
    <span class="sui-switch-control">
      <input
        bind:this={element}
        bind:checked
        {...rest}
        type="checkbox"
        role="switch"
        {disabled}
        aria-invalid={invalid || undefined}
        aria-busy={pending || undefined}
        aria-describedby={describedby}
        onclick={press}
      />
      <span class="sui-switch-track" class:invalid class:pending aria-hidden="true"></span>
    </span>
  </label>
  <!-- The status speaks the error, so the drawn copy stays out of the tree; the switch's
       description still reads it. -->
  {#if error}
    <span id="{uid}-error" class="sui-switch-error" aria-hidden="true">
      <span class="sui-switch-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-switch-words">{error}</span>
    </span>
  {/if}
  <VisuallyHidden role="status">{error ?? ''}</VisuallyHidden>
</span>

<style>
  .sui-switch {
    display: inline-grid;
    inline-size: fit-content;
    justify-items: start;
    max-inline-size: 100%;
    /* Top, not baseline: on the baseline the line under it adds the strut's descent and sets
       the line a fraction tall (L-95). */
    vertical-align: top;
  }

  .sui-switch-row {
    align-items: center;
    cursor: pointer;
    display: inline-flex;
    gap: var(--sui-space-2);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-touch-target);
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .bare {
    min-block-size: auto;
  }

  .sui-switch-label {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    text-box: trim-both cap alphabetic;
  }

  .sui-switch-control {
    display: grid;
    flex: none;
  }

  /* The input is the focus target and wears the ring, so it lies exactly over the track;
     appearance none keeps native paint away without hiding the ring with it. */
  .sui-switch-control > * {
    grid-area: 1 / 1;
  }

  .sui-switch-row input {
    appearance: none;
    background: none;
    block-size: 100%;
    border: 0;
    border-radius: var(--sui-radius-pill);
    cursor: inherit;
    inline-size: 100%;
    margin: 0;
  }

  .sui-switch-row input:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-switch-track {
    background: var(--sui-switch-track-off);
    block-size: 20px;
    border: var(--sui-stroke) solid var(--sui-switch-track-off-border);
    border-radius: var(--sui-radius-pill);
    box-sizing: border-box;
    inline-size: 34px;
    position: relative;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  /* 20 + 24 and 34 + 16 both clear the 44px touch target, laid out or not. */
  .sui-switch-track::before {
    content: '';
    inset: calc(-1 * var(--sui-space-3)) calc(-1 * var(--sui-space-2));
    position: absolute;
  }

  .sui-switch-track::after {
    background: var(--sui-switch-thumb);
    block-size: 16px;
    border-radius: 50%;
    box-shadow: 0 1px 2px var(--sui-shadow-color);
    box-sizing: border-box;
    content: '';
    inline-size: 16px;
    inset-block-start: 1px;
    inset-inline-start: 1px;
    position: absolute;
    transition: translate var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-switch-row input:checked + .sui-switch-track {
    background: var(--sui-switch-track-on);
    border-color: var(--sui-switch-track-on);
  }

  .sui-switch-row input:checked + .sui-switch-track::after {
    translate: 14px 0;
  }

  /* The thumb travels toward the inline end, which is the left in a right-to-left page. */
  .sui-switch-row input:checked + .sui-switch-track:dir(rtl)::after {
    translate: -14px 0;
  }

  /* As specific as the checked rule and after it, so a switch that is on keeps its danger edge. */
  .sui-switch-row input + .sui-switch-track.invalid {
    border-color: var(--sui-danger);
  }

  @media (hover: hover) {
    .sui-switch-row:hover:not(:active, .disabled) .sui-switch-track {
      background-image: linear-gradient(
        var(--sui-interactive-hover-layer),
        var(--sui-interactive-hover-layer)
      );
    }
  }

  .sui-switch-row:active:not(.disabled) .sui-switch-track {
    background-image: linear-gradient(
      var(--sui-interactive-pressed),
      var(--sui-interactive-pressed)
    );
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  /* While the flip saves, the thumb becomes the system's spinner, the button's ring with one
     side open, turning where the thumb stands, so the track still says which way it went. The
     ring is the thumb's face on the filled track and the secondary ink on the empty one, so it
     holds 4.5:1 on either. */
  /* A pending save dims the track as a busy button dims (L-40), while the spinner turns. */
  .sui-switch-track.pending {
    opacity: var(--sui-disabled-opacity);
  }

  .sui-switch-track.pending::after {
    animation: sui-switch-spin var(--sui-duration-spinner) var(--sui-ease-linear) infinite;
    background: none;
    border: var(--sui-stroke-bold) solid var(--sui-text-secondary);
    border-inline-end-color: transparent;
    box-shadow: none;
  }

  .sui-switch-row input:checked + .sui-switch-track.pending::after {
    border-color: var(--sui-switch-thumb);
    border-inline-end-color: transparent;
  }

  @keyframes sui-switch-spin {
    to {
      rotate: 1turn;
    }
  }

  .disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-switch-error {
    align-items: start;
    color: var(--sui-danger);
    column-gap: var(--sui-space-1);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-template-columns: auto minmax(0, 1fr);
  }

  /* Centred on the first line's cap height, however many lines the error wraps to. */
  .sui-switch-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }

  .sui-switch-words {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-switch-track,
    .sui-switch-track::after {
      transition: none;
    }

    .sui-switch-row:active:not(.disabled) .sui-switch-track {
      translate: none;
    }

    .sui-switch-track.pending::after {
      animation: none;
    }
  }

  /* High contrast flattens the track's fill and drops the thumb's shadow, so both draw their
     states in system colours. */
  @media (forced-colors: active) {
    .sui-switch-track {
      background: Canvas;
      border-color: CanvasText;
      forced-color-adjust: none;
    }

    .sui-switch-track::after {
      background: CanvasText;
    }

    .sui-switch-row input:checked + .sui-switch-track {
      background: Highlight;
      border-color: Highlight;
    }

    .sui-switch-row input:checked + .sui-switch-track::after {
      background: HighlightText;
    }

    /* Every edge is one colour here, so an invalid track says so with a 2px edge, on or off. */
    .sui-switch-row input + .sui-switch-track.invalid {
      border-color: CanvasText;
      border-width: var(--sui-stroke-bold);
    }
  }
</style>
