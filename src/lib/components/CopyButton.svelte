<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    text,
    label = 'Copy',
    toolbar = false,
    class: className = '',
    ...rest
  }: {
    /** What lands on the clipboard. */
    text: string;
    /** The resting label. The confirmation is always "Copied". */
    label?: string;
    /** Matches the 34px control tier of a field or toolbar beside it. */
    toolbar?: boolean;
    /** Layout for the call site only, never the button's own paint. */
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'onclick'> = $props();

  const CONFIRM_FOR = 1600;

  let copied = $state(false);
  let timer = 0;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ponytail: a refused clipboard confirms nothing, so the label stays; add a failure
      // message when a caller needs the reader told to copy by hand.
      return;
    }
    copied = true;
    clearTimeout(timer);
    timer = window.setTimeout(() => (copied = false), CONFIRM_FOR);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<!--
@component
A small bordered button that puts `text` on the clipboard and says "Copied" for 1.6 seconds.
The confirmation is also announced through a polite live region, so a reader who cannot see
the label change still hears it. Both labels share one box, so the button does not change
width when it confirms.

It is 28px tall on its own opaque ground, so it can sit over code. `CodeBlock` places one
in its corner. Beside a 34px field or in a toolbar it takes the control tier with `toolbar`.
-->

<button
  type="button"
  {...rest}
  class={['sui-copy-button', className, { toolbar }]}
  data-copied={copied || undefined}
  onclick={copy}
>
  <span class="sui-copy-button-labels">
    <span class={{ off: copied }}>{label}</span>
    <span class={{ off: !copied }}>Copied</span>
  </span>
</button>
<span class="sui-copy-button-status" role="status">{copied ? 'Copied' : ''}</span>

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

  .sui-copy-button-labels {
    display: grid;
  }

  .sui-copy-button-labels > span {
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
</style>
