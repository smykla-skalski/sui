<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import type { Placement } from '../internal/anchor.js';
  import Tooltip from './Tooltip.svelte';

  let {
    label,
    text,
    side = 'block-start',
    align = 'center',
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** Names what the tip explains, such as "About retention". */
    label: string;
    /** The explanation: one short sentence without a period. */
    text: string;
    side?: Placement['side'];
    align?: Placement['align'];
    element?: HTMLButtonElement | null;
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'aria-label' | 'class'> = $props();

  let open = $state(false);
  // The tooltip closes itself on pointerdown, so the tap remembers what it saw before that.
  let openAtPress = false;
</script>

<!--
@component
A small mark beside a label that holds one short explanation in a `Tooltip`. The tip shows on
hover after a short pause, at once on keyboard focus, and on a tap for touch screens, and it is the button's description, so
a screen reader reads it with the button's name. Anything longer than a sentence, or anything
the reader must act on, belongs on the page instead.
-->

<button
  bind:this={element}
  type="button"
  {...rest}
  class={['sui-help-tip', className]}
  aria-label={label}
  onpointerdown={() => (openAtPress = open)}
  onclick={() => (open = !openAtPress)}
>
  <Icon name="help" size="sm" strokeWidth={2} />
</button>
<Tooltip anchor={element} {text} describe {side} {align} bind:open />

<style>
  .sui-help-tip {
    align-items: center;
    background-color: transparent;
    block-size: var(--sui-control-height-chip);
    border: 0;
    border-radius: var(--sui-radius-chip);
    color: var(--sui-text-muted);
    cursor: help;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-control-height-chip);
    justify-content: center;
    margin: 0;
    padding: 0;
    transition: color var(--sui-duration-fast) var(--sui-ease-standard);
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  .sui-help-tip:hover,
  .sui-help-tip:focus-visible {
    color: var(--sui-info);
  }

  .sui-help-tip:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-help-tip {
      transition: none;
    }
  }
</style>
