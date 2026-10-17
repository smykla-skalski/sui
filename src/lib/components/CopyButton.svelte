<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    text,
    label = word('CopyButton.label', 'Copy'),
    copiedLabel = word('CopyButton.copiedLabel', 'Copied'),
    failedLabel = word('CopyButton.failedLabel', 'Copy failed'),
    toolbar = false,
    bare = false,
    disabled = false,
    oncopied,
    oncopyfailed,
    class: className = '',
    ...rest
  }: {
    /** What lands on the clipboard. */
    text: string;
    /** The resting label, naming what is copied, such as "Copy link". */
    label?: string;
    /** Said for 1.6 seconds after each copy. */
    copiedLabel?: string;
    /** Said when the browser refuses the write, until the next press. */
    failedLabel?: string;
    /** Matches the 34px control tier of a field or toolbar beside it. */
    toolbar?: boolean;
    /**
     * Drops the frame and sits inside the end of a joined field, whose host draws the frame.
     */
    bare?: boolean;
    disabled?: boolean;
    /** Hears each copy that landed on the clipboard. */
    oncopied?: () => void;
    /** Hears each refused write, so the caller can offer the text to select by hand. */
    oncopyfailed?: (error: unknown) => void;
    /** Layout for the call site only, never the button's own paint. */
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'onclick'> = $props();

  const CONFIRM_FOR = 1600;
  /* The status empties first and speaks a moment later, so a second copy inside the
     confirmation is a change a screen reader hears again. */
  const SETTLE = 100;

  let outcome = $state<'copied' | 'failed' | null>(null);
  let message = $state('');
  let timer = 0;
  let speak = 0;

  async function copy(): Promise<void> {
    let next: 'copied' | 'failed' = 'copied';
    let error: unknown;
    try {
      await navigator.clipboard.writeText(text);
    } catch (refusal) {
      next = 'failed';
      error = refusal;
    }
    outcome = next;
    message = '';
    clearTimeout(speak);
    clearTimeout(timer);
    speak = window.setTimeout(
      () => (message = next === 'copied' ? copiedLabel : failedLabel),
      SETTLE
    );
    // A failure stays until the next press, so the reader has time to read it and act.
    if (next === 'copied') {
      timer = window.setTimeout(() => {
        outcome = null;
        message = '';
      }, CONFIRM_FOR);
      oncopied?.();
    } else oncopyfailed?.(error);
  }

  $effect(() => () => {
    clearTimeout(speak);
    clearTimeout(timer);
  });
</script>

<!--
@component
A small bordered button that puts `text` on the clipboard and says "Copied" for 1.6 seconds,
or "Copy failed" when the browser refuses the write, which stays until the next press. Name
what it copies in `label`, such as "Copy link", because a page of buttons all called "Copy"
tells a screen reader nothing.

Each outcome is also announced through a polite live region, a second copy included, so a
reader who cannot see the label change still hears it. The labels share one box, so the
button does not change width when it answers.

It is 28px tall on its own opaque ground, so it can sit over code. `CodeBlock` places one
in its corner. Beside a 34px field or in a toolbar it takes the control tier with `toolbar`.

- Semantics: a native `<button type="button">` whose visible words are its name, with a polite `role="status"` beside it.
- Content: `label`, `copiedLabel` and `failedLabel`, each a short phrase; the button is as wide as the longest of the three.
- States: rest, hover (a veil and a firmer edge), focus (a flush 2px ring, or an inset one when `bare`), pressed (a deeper veil, an inset shadow and a 1px sink), copied, failed (danger ink) and disabled (0.7 opacity).
- Keyboard: Tab reaches it and Enter or Space copies; focus stays on it through the answer.
- Pointer and touch: 28px tall, or 34px with `toolbar`, and a 44px hit area on a phone or any touch screen.
- Focus: copying never moves focus; `oncopyfailed` is where a caller sends focus to the text to select by hand.
- Responsive: one line as wide as its longest label, and it never wraps.
- Accessibility: the visible words are the name, each outcome is spoken through the status, and its ink holds 4.5:1 on its own ground.
- Localization: `label`, `copiedLabel` and `failedLabel` are props with English defaults, and the shared box fits whichever is longest.
- Performance: one button and one status per instance, with two timers that clear on unmount; only colours, the inset shadow and the 1px sink move.
- Analytics: `oncopied` hears each copy that landed and `oncopyfailed` each refused write.
- Failure: a refused write says "Copy failed" in danger ink until the next press and calls `oncopyfailed`, so the text can be offered to select by hand.
-->

<button
  type="button"
  {...rest}
  {disabled}
  class={['sui-copy-button', className, { toolbar, bare }]}
  data-copied={outcome === 'copied' || undefined}
  data-failed={outcome === 'failed' || undefined}
  onclick={copy}
>
  <span class="sui-copy-button-labels">
    <span class={{ off: outcome !== null }}>{label}</span>
    <span class={{ off: outcome !== 'copied' }}>{copiedLabel}</span>
    <span class={{ off: outcome !== 'failed' }}>{failedLabel}</span>
  </span>
</button>
<span class="sui-copy-button-status" role="status">{message}</span>

<style>
  /* The same registered state layer as `Button`, so the veil over the opaque ground
     animates and hover, press and release stay one continuous change. */
  @property --sui-control-state-layer {
    syntax: '<color>';
    inherits: false;
    initial-value: transparent;
  }

  .sui-copy-button {
    --sui-control-state-layer: transparent;
    align-items: center;
    background-color: var(--sui-surface-base);
    background-image: linear-gradient(
      var(--sui-control-state-layer),
      var(--sui-control-state-layer)
    );
    block-size: var(--sui-tier-quiet);
    border: var(--sui-stroke) solid var(--sui-control-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    font: var(--sui-weight-medium) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    inline-size: fit-content;
    white-space: nowrap;
    margin: 0;
    padding: 0 var(--sui-space-2);
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    transition:
      --sui-control-state-layer var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .toolbar {
    block-size: var(--sui-control-height-compact);
  }

  @media (hover: hover) {
    .sui-copy-button:hover:not(:active, :disabled) {
      --sui-control-state-layer: var(--sui-interactive-hover-layer);
      border-color: var(--sui-control-border-hover);
      color: var(--sui-text-primary);
    }
  }

  .sui-copy-button:active:not(:disabled) {
    --sui-control-state-layer: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-text-primary);
    translate: 0 1px;
  }

  .sui-copy-button:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-copy-button:disabled {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  /* A chip inside the end of a joined field: a quiet tinted button at the 28px tier, its
     corners following the field's, with no frame and no sink. It draws its own inset ring,
     so the reader sees that focus left the value for the copy action. */
  .sui-copy-button.bare,
  .sui-copy-button.bare:is(:active, :focus-visible) {
    background-color: transparent;
    border-width: 0;
    border-radius: var(--sui-radius-chip);
    color: var(--sui-text-secondary);
    translate: none;
  }

  @media (hover: hover) {
    .sui-copy-button.bare:hover {
      background-color: transparent;
      translate: none;
    }

    .sui-copy-button.bare:hover:not(:active, :disabled) {
      --sui-control-state-layer: var(--sui-interactive-hover-layer);
      color: var(--sui-text-primary);
    }
  }

  .sui-copy-button.bare {
    --sui-control-state-layer: var(--sui-row-hover);
  }

  .sui-copy-button.bare:focus-visible:not(:active) {
    --sui-control-state-layer: var(--sui-interactive-hover-layer);
  }

  .sui-copy-button.bare:focus-visible {
    color: var(--sui-text-primary);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* On the words, so a hover or a press that sets the button's ink never hides the failure. */
  .sui-copy-button[data-failed] .sui-copy-button-labels {
    color: var(--sui-danger);
  }

  .sui-copy-button-labels {
    display: grid;
  }

  .sui-copy-button-labels > span {
    block-size: var(--sui-block-snap);
    grid-area: 1 / 1;
    text-align: center;
    text-box: trim-both cap alphabetic;
  }

  .sui-copy-button-labels > .off {
    visibility: hidden;
  }

  .sui-copy-button-status {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-copy-button {
      transition: none;
    }

    .sui-copy-button:active {
      translate: none;
    }
  }

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-copy-button {
      position: relative;
    }

    .sui-copy-button::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-copy-button:hover:not(:disabled, :focus-visible) {
      border-color: Highlight;
    }
  }
</style>
