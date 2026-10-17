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
    ...rest
  }: {
    icon: IconName;
    /** Says what the button does. It is the accessible name and the tooltip both. */
    label: string;
    /** Matches the 34px control tier of the buttons and segmented controls beside it. */
    toolbar?: boolean;
    /** Turns the glyph while the work this button started is still running. */
    busy?: boolean;
    disabled?: boolean;
    element?: HTMLButtonElement | null;
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'aria-label'> = $props();
</script>

<!--
@component
A button whose glyph is the whole of it. `label` is required and is both the accessible name
and the tooltip, so an icon button nobody can name cannot be written.

It stands on the 28px quiet tier, which fits a row's margin or the end of a heading; a
toolbar opts into the 34px tier with `toolbar`. Its states are translucent layers, so it
steps up from whatever row or card it sits on. Reach for `Button` wherever a word fits.
-->

<button
  bind:this={element}
  type="button"
  {...rest}
  class={['sui-icon-button', className]}
  class:toolbar
  class:busy
  aria-label={label}
  aria-busy={busy || undefined}
  disabled={disabled || busy}
>
  <Icon name={icon} size="sm" strokeWidth={2} />
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

  .sui-icon-button:where(:hover, [aria-expanded='true']):not(:disabled) {
    background-color: var(--sui-interactive-hover-layer);
    color: var(--sui-text-primary);
  }

  .sui-icon-button:active:not(:disabled) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-text-primary);
    translate: 0 1px;
  }

  .sui-icon-button:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-icon-button:disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .busy :global(svg) {
    animation: sui-icon-button-spin var(--sui-rhythm-spinner) var(--sui-ease-linear) infinite;
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

    .sui-icon-button:active:not(:disabled) {
      translate: none;
    }

    .busy :global(svg) {
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
</style>
