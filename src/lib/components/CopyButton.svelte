<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    text,
    label = 'Copy',
    toolbar = false,
    bare = false,
    class: className = '',
    ...rest
  }: {
    /** What lands on the clipboard. */
    text: string;
    /** The resting label, naming what is copied, such as "Copy link". */
    label?: string;
    /** Matches the 34px control tier of a field or toolbar beside it. */
    toolbar?: boolean;
    /**
     * Drops the frame and takes the field's height, for the end of a joined field whose host
     * draws the frame and the focus ring.
     */
    bare?: boolean;
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
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = 'failed';
    }
    outcome = next;
    message = '';
    clearTimeout(speak);
    clearTimeout(timer);
    speak = window.setTimeout(
      () => (message = next === 'copied' ? 'Copied' : 'Copy failed'),
      SETTLE
    );
    timer = window.setTimeout(() => {
      outcome = null;
      message = '';
    }, CONFIRM_FOR);
  }

  $effect(() => () => {
    clearTimeout(speak);
    clearTimeout(timer);
  });
</script>

<!--
@component
A small bordered button that puts `text` on the clipboard and says "Copied" for 1.6 seconds,
or "Copy failed" when the browser refuses the write. Name what it copies in `label`, such as
"Copy link", because a page of buttons all called "Copy" tells a screen reader nothing.

Each outcome is also announced through a polite live region, a second copy included, so a
reader who cannot see the label change still hears it. The labels share one box, so the
button does not change width when it answers.

It is 28px tall on its own opaque ground, so it can sit over code. `CodeBlock` places one
in its corner. Beside a 34px field or in a toolbar it takes the control tier with `toolbar`.
-->

<button
  type="button"
  {...rest}
  class={['sui-copy-button', className, { toolbar, bare }]}
  data-copied={outcome === 'copied' || undefined}
  data-failed={outcome === 'failed' || undefined}
  onclick={copy}
>
  <span class="sui-copy-button-labels">
    <span class={{ off: outcome !== null }}>{label}</span>
    <span class={{ off: outcome !== 'copied' }}>Copied</span>
    <span class={{ off: outcome !== 'failed' }}>Copy failed</span>
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
    border: 1px solid var(--sui-control-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-muted);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    inline-size: fit-content;
    white-space: nowrap;
    margin: 0;
    padding: 0 var(--sui-space-2);
    touch-action: manipulation;
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

  .sui-copy-button:hover:not(:active) {
    --sui-control-state-layer: var(--sui-interactive-hover-layer);
    border-color: var(--sui-control-border-hover);
    color: var(--sui-text-primary);
  }

  .sui-copy-button:active {
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

  /* A chip inside the end of a joined field: a quiet tinted button at the 28px tier, its
     corners following the field's, with no frame and no sink. The host's ring says where
     focus is, and the veil deepens for a pointer or the keyboard. */
  .sui-copy-button.bare,
  .sui-copy-button.bare:is(:hover, :active, :focus-visible) {
    background-color: transparent;
    border-color: transparent;
    border-radius: var(--sui-r-chip);
    color: var(--sui-text-secondary);
    outline: none;
    translate: none;
  }

  .sui-copy-button.bare {
    --sui-control-state-layer: var(--sui-row-hover);
  }

  .sui-copy-button.bare:is(:hover, :focus-visible):not(:active) {
    --sui-control-state-layer: var(--sui-interactive-hover-layer);
    color: var(--sui-text-primary);
  }

  .sui-copy-button[data-failed] {
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
</style>
