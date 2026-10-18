<script lang="ts">
  import type { Snippet } from 'svelte';
  import { held, holdAround } from './held.svelte.js';

  let {
    invalid = false,
    disabled = false,
    readonly = false,
    start,
    end
  }: {
    invalid?: boolean;
    disabled?: boolean;
    /** The value only reads, so the field drops its fill and its strong baseline. */
    readonly?: boolean;
    /** The part a reader types or reads in, drawn `bare`. */
    start: Snippet;
    /** The part that qualifies or acts on it, such as a unit or a copy control, drawn `bare`. */
    end: Snippet;
  } = $props();

  let root = $state<HTMLDivElement | null>(null);
  /* Work that runs on the form around it holds both parts, which dims the field as disabled. */
  const around = holdAround();
  const holding = $derived(held(root, around));
</script>

<!--
One field that holds a value and a part that qualifies or acts on it, such as an amount and its
unit or a link and its copy control. It owns the one frame, the editing ground and the error and
disabled looks, so the pair reads as a single control. Each part is drawn `bare`: the value
fills the field, and the end part sits inside it, after the value, with no line between them.

The ring says which part holds focus: the whole field wears it while the value has focus, and
the end part draws its own inset ring while it has focus, so the two never look the same.

- Semantics: a `<div>` with no role around two native controls, each named on its own.
- Content: `start`, the value, and `end`, one unit picker or one action, each drawn `bare`.
- States: rest (the control fill, a quiet frame and a 3:1 baseline), hover (a firmer frame), the value focused (the inset fill and a flush 2px ring), the end focused (its own inset ring), invalid (a danger edge on all four sides in every state), read-only (the inset well and a quiet frame) and disabled (0.5 opacity).
- Keyboard: Tab moves from the value to the end part, each with its own keys.
- Pointer and touch: the frame is the control height, 34px or 44px on a phone or any touch screen, and each part keeps its own target.
- Focus: it never moves focus; each part keeps its own.
- Responsive: it fills up to its container, the value shrinks first, and the end part keeps its width.
- Accessibility: each part has its own name; the baseline holds 3:1 and the ring 3:1 on every ground.
- Localization: it draws no words, and the end part sits at the inline end in either direction.
- Performance: two parts in one clipped frame; only edge and fill colours change.
- Analytics: none of its own; each part reports through its own callbacks.
- Failure: an invalid value keeps the danger edge whichever part has focus, and the words that say why belong to the host.
-->

<div bind:this={root} class={['sui-joined', { invalid, disabled: disabled || holding, readonly }]}>
  <div class="sui-joined-value">{@render start()}</div>
  <div class="sui-joined-end">{@render end()}</div>
</div>

<style>
  .sui-joined {
    background-color: var(--sui-control-bg);
    min-block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: var(--sui-stroke) solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    max-inline-size: 100%;
    min-inline-size: 0;
    /* The parts lie over the frame's edge to keep the full control height; the clip keeps
       their grounds inside the frame's inner curve. A host whose end part draws no ground at
       the edge may reach the clip over the frame, so that part's hit area keeps its 44px. */
    overflow: clip;
    overflow-clip-margin: var(--sui-local-joined-reach, 0px);
  }

  /* Hover steps the whole frame's edge up, and an invalid field keeps its danger edge, a step
     deeper, so every field answers the pointer (L-9). The row veil lies only on the value
     while the pointer is on it: the end part lights its own ground, so a pointer on a unit or
     a copy action never lights the value as well. */
  @media (hover: hover) {
    .sui-joined:hover:not(.disabled, .readonly, :has(:global(:focus-visible))) {
      border-color: var(--sui-field-frame-hover);
      border-block-end-color: var(--sui-field-border-hover);
    }

    .sui-joined.invalid:hover:not(.disabled, .readonly, :has(:global(:focus-visible))) {
      border-color: var(--sui-danger-hover);
    }

    .sui-joined:not(.disabled, .readonly, :has(:global(:focus-visible))) > .sui-joined-value:hover {
      background-color: var(--sui-field-hover);
    }

    .sui-joined.invalid:not(.disabled, .readonly, :has(:global(:focus-visible)))
      > .sui-joined-value:hover {
      background-color: var(--sui-field-danger-hover);
    }
  }

  /* The field takes the editing ground and the ring while the value has focus. A bordered
     control is flush: its edge takes the focus color under the 2px ring (L-41). The focused
     part belongs to another component, so the state is looked up globally. */
  .sui-joined:has(.sui-joined-value :global(:focus-visible)) {
    background-color: var(--sui-input-bg);
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  /* A value that only reads sits in the inset well with a quiet frame, as a read-only text
     field does, so it never looks like a field to type in. */
  .readonly,
  .readonly:has(.sui-joined-value :global(:focus-visible)) {
    background-color: var(--sui-surface-inset);
    border-color: var(--sui-border-subtle);
  }

  .invalid,
  .invalid:has(.sui-joined-value :global(:focus-visible)) {
    border-color: var(--sui-danger);
  }

  .disabled {
    opacity: var(--sui-disabled-opacity);
  }

  /* The value keeps room for a few words; with less, as at a large text size on a phone, the
     end moves to a line of its own under it rather than covering it. */
  .sui-joined-value {
    display: grid;
    flex: 1 1 4rem;
    min-inline-size: 0;
  }

  /* The end hangs on the value's first line, one line tall, so beside a value that wraps it
     stays level with the first line. On a line of its own it starts at the field's start edge
     (L-90). A host whose end is a chip that wraps its words sets an inset to keep it clear of
     the frame; a full-height end, such as a picker, takes none, so its ground meets the frame
     and the frame's curve clips it, and it never makes the field taller than its value. */
  .sui-joined-end {
    align-items: center;
    align-self: flex-start;
    box-sizing: border-box;
    display: flex;
    flex: none;
    max-inline-size: 100%;
    min-block-size: calc(
      var(--sui-local-control-height, var(--sui-control-height-compact)) - 2 * var(--sui-stroke)
    );
    padding-block: var(--sui-local-joined-end-inset, 0px);
    padding-inline-end: var(--sui-local-joined-end-inset, 0px);
  }

  /* High contrast paints every edge in one colour, so an invalid field says so with a 2px edge. */
  @media (forced-colors: active) {
    .invalid {
      border-width: var(--sui-stroke-bold);
    }
  }
</style>
