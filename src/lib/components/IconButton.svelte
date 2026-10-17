<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon, { type IconName } from '../icons/Icon.svelte';
  import Tooltip from './Tooltip.svelte';

  let {
    icon,
    label,
    toolbar = false,
    busy = false,
    disabled = false,
    element = $bindable(null),
    class: className = '',
    onclick,
    ...rest
  }: {
    /** A glyph every reader reads the same way, such as close, more, search, trash or settings. */
    icon: IconName;
    /** Says what the button does. It is the accessible name and the tooltip both. */
    label: string;
    /** Matches the 34px control tier of the buttons and segmented controls beside it. */
    toolbar?: boolean;
    /** Draws a spinner in place of the glyph and refuses presses while the work it started runs. */
    busy?: boolean;
    disabled?: boolean;
    element?: HTMLButtonElement | null;
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'aria-label'> = $props();

  /* `disabled` would drop a focused button's focus to the body, so a busy one keeps its place
     in the tab order and refuses the press itself, as `Button` does. */
  const refusing = $derived(busy && !disabled);

  function press(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    if (refusing) event.preventDefault();
    else onclick?.(event);
  }
</script>

<!--
@component
A button whose glyph is the whole of it. `label` is required and is both the accessible name
and the tooltip, so an icon button nobody can name cannot be written.

It stands on the 28px quiet tier, which fits a row's margin or the end of a heading; a
toolbar opts into the 34px tier with `toolbar`. Its states are translucent layers, so it
steps up from whatever row or card it sits on. Only a glyph every reader reads the same way
stands alone: close, more, search, trash and settings. Refresh, filter, sort and any other
action are a `Button` with the word beside the glyph.

- Semantics: a native `<button type="button">` named by `label` through `aria-label`, with the glyph hidden.
- Content: one glyph from the certain set; the label is a verb phrase such as "Remove the rule".
- States: rest (muted glyph), hover and open (`aria-expanded`, a veil and primary ink), focus (a flush 2px ring), pressed (a deeper veil, an inset shadow and a 1px sink), busy (a spinner in place of the glyph, at 0.7 opacity) and disabled (0.7 opacity).
- Keyboard: Tab reaches it and Enter or Space presses it; a busy one refuses both and keeps focus.
- Pointer and touch: 28px square, or 34px with `toolbar`, and a 44px hit area on a phone or any touch screen.
- Focus: a press never moves focus and a busy button keeps it; the caller moves focus when the press removes the button.
- Responsive: square at its tier at every width, never taking a text button's padding.
- Accessibility: the label is the name and the tooltip, `busy` sets `aria-busy` and `aria-disabled`, and forced colours outline its hover and open states.
- Localization: `label` is the only word and comes from the caller; directional glyphs mirror in a right-to-left page.
- Performance: one element and a tooltip that mounts only while shown; only colours, the inset shadow and the 1px sink move, and the spinner stops under reduced motion.
- Analytics: `onclick` reports each press that runs; a press while busy never calls it.
- Failure: a press while busy does nothing, and a spinner that stops under reduced motion still differs from the glyph, so busy never reads as disabled alone.
-->

<button
  bind:this={element}
  type="button"
  {...rest}
  class={['sui-icon-button', className]}
  class:toolbar
  aria-label={label}
  aria-busy={busy || undefined}
  aria-disabled={refusing || undefined}
  {disabled}
  onclick={press}
>
  {#if busy}
    <span class="sui-icon-button-spinner" aria-hidden="true"></span>
  {:else}
    <Icon name={icon} size="sm" strokeWidth={2} />
  {/if}
</button>
<Tooltip anchor={element} text={label} />

<style>
  .sui-icon-button {
    align-items: center;
    background-color: transparent;
    block-size: var(--sui-tier-quiet);
    border: 0;
    border-radius: var(--sui-radius-control);
    color: var(--sui-text-muted);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-tier-quiet);
    justify-content: center;
    line-height: var(--sui-leading-flat);
    margin: 0;
    padding: 0;
    position: relative;
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .toolbar {
    block-size: var(--sui-control-height-compact);
    inline-size: var(--sui-control-height-compact);
  }

  @media (hover: hover) {
    .sui-icon-button:hover:not(:disabled, [aria-disabled='true']) {
      background-color: var(--sui-interactive-hover-layer);
      color: var(--sui-text-primary);
    }
  }

  .sui-icon-button[aria-expanded='true']:not(:disabled) {
    background-color: var(--sui-interactive-hover-layer);
    color: var(--sui-text-primary);
  }

  .sui-icon-button:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-text-primary);
    translate: 0 1px;
  }

  .sui-icon-button:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-icon-button:is(:disabled, [aria-disabled='true']) {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-icon-button-spinner {
    block-size: var(--sui-icon-sm);
    border: var(--sui-stroke-bold) solid currentColor;
    border-inline-end-color: transparent;
    border-radius: 50%;
    box-sizing: border-box;
    inline-size: var(--sui-icon-sm);
    animation: sui-icon-button-spin var(--sui-duration-spinner) var(--sui-ease-linear) infinite;
  }

  @keyframes sui-icon-button-spin {
    to {
      rotate: 1turn;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-icon-button {
      transition: none;
    }

    .sui-icon-button:active:not(:disabled, [aria-disabled='true']) {
      translate: none;
    }

    .sui-icon-button-spinner {
      animation: none;
    }
  }

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-icon-button::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }

  /* High contrast drops the veils, so an open or hovered button draws its edge instead. */
  @media (forced-colors: active) {
    .sui-icon-button[aria-expanded='true']:not(:focus-visible) {
      outline: var(--sui-stroke) solid Highlight;
    }
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-icon-button:hover:not(:disabled, [aria-disabled='true'], :focus-visible) {
      outline: var(--sui-stroke) solid Highlight;
    }
  }
</style>
