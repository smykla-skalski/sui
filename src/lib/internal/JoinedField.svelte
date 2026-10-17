<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    invalid = false,
    disabled = false,
    start,
    end
  }: {
    invalid?: boolean;
    disabled?: boolean;
    /** The part a reader types or reads in, drawn `bare`. */
    start: Snippet;
    /** The part that qualifies or acts on it, such as a unit or a copy control, drawn `bare`. */
    end: Snippet;
  } = $props();
</script>

<!--
One field that holds a value and a part that qualifies or acts on it, such as an amount and its
unit or a link and its copy control. It owns the one frame, the one focus ring, the editing ground
and the error and disabled looks, so the pair reads as a single control. Each part is drawn
`bare`: the value fills the field, and the end part sits inside it, after the value, with no line
between them.
-->

<div class={['sui-joined', { invalid, disabled }]}>
  <div class="sui-joined-value">{@render start()}</div>
  <div class="sui-joined-end">{@render end()}</div>
</div>

<style>
  .sui-joined {
    background-color: var(--sui-control-bg);
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 1px solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: flex;
    max-inline-size: 100%;
    min-inline-size: 0;
    /* The parts lie over the frame's edge to keep the full control height; the clip keeps
       their grounds inside the frame's inner curve. */
    overflow: clip;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-joined:hover:not(.disabled, :has(:global(:focus-visible))) {
    border-color: var(--sui-field-frame-hover);
    border-block-end-color: var(--sui-field-border-hover);
  }

  .sui-joined.invalid:not(:has(:global(:focus-visible))) {
    border-color: var(--sui-danger);
  }

  /* The whole field takes the editing ground and the ring, whichever part holds focus. A
     bordered control is flush: its edge takes the focus color under the 2px ring (L-41). The
     focused part belongs to another component, so the state is looked up globally. */
  .sui-joined:has(:global(:focus-visible)) {
    background-color: var(--sui-input-bg);
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .disabled {
    opacity: var(--sui-disabled-opacity);
  }

  .sui-joined-value {
    display: grid;
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .sui-joined-end {
    align-items: center;
    display: flex;
    flex: none;
    padding-inline-end: var(--sui-control-inset);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-joined {
      transition: none;
    }
  }
</style>
