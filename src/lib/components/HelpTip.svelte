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
    open = $bindable(false),
    preview = false,
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
    open?: boolean;
    /** Draws the mark pressed with its tip open in the page's flow, for a review that needs no click. */
    preview?: boolean;
    element?: HTMLButtonElement | null;
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'aria-label' | 'class'> = $props();

  // The tooltip closes itself on a press, so the capture phase notes what the press found first.
  let openAtPress = false;
</script>

<!--
@component
A small mark beside a label that holds one short explanation in a `Tooltip`. The tip shows on
hover after a short pause and at once on keyboard focus. A tap or a click toggles it, and a
press anywhere else closes it. It is the button's description, so a screen reader reads it with
the button's name. Anything longer than a sentence, or anything the reader must act on, belongs
on the page instead.

- Semantics: a `button` named by `label`, with `aria-expanded` saying whether its tip is open and the tip as its description.
- Content: one 13px help glyph; `text` is one short sentence without a period.
- States: rest in the muted ink, hover and focus in the information ink, pressed on the pressed veil and inset, open in the information ink on a quiet veil, focus with the 2px ring offset 2px.
- Keyboard: Tab focuses it and shows the tip, Enter or Space toggles the tip, and Escape closes it.
- Pointer and touch: a 24px mark whose hit area grows to 44px on a phone or touch screen; a tap toggles the tip and a press elsewhere closes it.
- Focus: it keeps focus while the tip opens and closes, and the tip never takes it.
- Responsive: the tip flips to the side with room and stays inside the viewport.
- Accessibility: the name says what it explains, the tip text is its description, and the open state is drawn and announced.
- Localization: `label` and `text` are the caller's words, and the tip's placement follows the reading direction.
- Performance: one button and one tooltip per mark, with a colour fade removed under reduced motion.
- Analytics: `open` is bindable, so a caller can count how often an explanation is read.
- Failure: an empty `text` still opens an empty tip, so always pass the sentence; a long one wraps at 17rem.
-->

{#snippet mark()}
  <button
    bind:this={element}
    type="button"
    {...rest}
    class={['sui-help-tip', className]}
    aria-label={label}
    aria-expanded={preview || open}
    onpointerdowncapture={() => (openAtPress = open)}
    onclick={(event) => {
      if (!preview) open = event.detail === 0 ? !open : !openAtPress;
    }}
  >
    <Icon name="help" size="sm" strokeWidth={2} />
  </button><Tooltip anchor={element} {text} describe {side} {align} {preview} bind:open />
{/snippet}

{#if preview}
  <span class="sui-help-tip-preview">{@render mark()}</span>
{:else}
  {@render mark()}
{/if}

<style>
  /* The open tip drawn under its mark, in the page's flow. */
  .sui-help-tip-preview {
    display: inline-grid;
    gap: var(--sui-space-1);
    grid-template-columns: minmax(0, auto);
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
    vertical-align: top;
  }

  .sui-help-tip {
    align-items: center;
    background-color: transparent;
    block-size: var(--sui-control-height-chip);
    border: 0;
    border-radius: var(--sui-radius-pill);
    color: var(--sui-text-muted);
    cursor: help;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-control-height-chip);
    justify-content: center;
    margin: 0;
    padding: 0;
    position: relative;
    transition:
      color var(--sui-duration-fast) var(--sui-ease-standard),
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-user-select: none;
    user-select: none;
    vertical-align: middle;
    -webkit-tap-highlight-color: transparent;
  }

  @media (hover: hover) {
    .sui-help-tip:hover:not(:active) {
      color: var(--sui-info);
    }
  }

  .sui-help-tip:focus-visible,
  .sui-help-tip[aria-expanded='true'] {
    color: var(--sui-info);
  }

  .sui-help-tip[aria-expanded='true'] {
    background-color: var(--sui-interactive-hover-layer);
  }

  /* A frameless mark, so the press is its ground and inset without the sink. */
  .sui-help-tip:active {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-info);
  }

  .sui-help-tip:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  /* The open veil is lost in high contrast, so the open mark draws a ring of its own. */
  @media (forced-colors: active) {
    .sui-help-tip[aria-expanded='true']:not(:focus-visible) {
      outline: var(--sui-stroke) solid Highlight;
    }
  }

  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-help-tip::before {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-help-tip {
      transition: none;
    }
  }
</style>
