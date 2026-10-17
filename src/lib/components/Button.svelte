<script module lang="ts">
  export type ButtonTone =
    'default' | 'signal' | 'ghost' | 'stop' | 'stop-quiet' | 'add' | 'decision';
</script>

<script lang="ts" generics="Href extends string | undefined = undefined">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes } from 'svelte/elements';

  type NativeElement = Href extends string ? HTMLAnchorElement : HTMLButtonElement;
  type NativeAttributes = HTMLAttributes<NativeElement> &
    Omit<HTMLAnchorAttributes & HTMLButtonAttributes, keyof HTMLAttributes<HTMLElement> | 'href'>;

  let {
    tone = 'default',
    href,
    icon,
    trailing,
    loading = false,
    disabled = false,
    element = $bindable(null),
    class: className = '',
    children,
    ...rest
  }: {
    tone?: ButtonTone;
    /** A destination draws an anchor instead of a button. */
    href?: Href;
    /** Drawn before the label. */
    icon?: Snippet;
    /** Drawn after the label, such as a chevron or a count. */
    trailing?: Snippet;
    /** Draws a spinner, announces the button as busy and ignores presses while the work runs. */
    loading?: boolean;
    disabled?: boolean;
    element?: HTMLButtonElement | HTMLAnchorElement | null;
    /** Layout for the call site only, never the button's own paint. */
    class?: HTMLAttributes<NativeElement>['class'];
    children: Snippet;
  } & NativeAttributes = $props();

  /* `disabled` would drop a focused button's focus to the body, so a busy one stays in the tab
     order and refuses the press itself. */
  const busy = $derived(loading && !disabled);

  function refuse(event: MouseEvent) {
    event.preventDefault();
  }
</script>

<!--
@component
A tone is a job, never a color. `default` does a view's ordinary work, `signal` is the one
action a view exists for (one per view), `ghost` is low emphasis that supports it, `stop` is
destructive, and `stop-quiet` is destructive but bordered, for a flow whose filled danger
button is the final confirmation. `add` is a dashed pill that starts an optional entry; it
never submits, saves, cancels, removes or navigates. `decision` is the gold action that
resolves unsaved work, such as Save in a save bar, and nothing else wears it.

Disabled is a state that any tone can wear, and so is `loading`. A loading button keeps its
place in the tab order and its focus, is announced as busy and disabled, and ignores presses
without calling `onclick`. `href` draws an anchor with the same paint. The label is always
wrapped so its box can be trimmed to the cap height, and an icon starts where a word would
start.
-->

{#snippet body()}
  {#if loading}
    <span class="sui-button-spinner" aria-hidden="true"></span>
  {:else if icon}
    {@render icon()}
  {/if}
  <span class="sui-button-label">{@render children()}</span>
  {#if trailing}
    {@render trailing()}
  {/if}
{/snippet}

{#if href !== undefined}
  <a
    bind:this={element}
    {href}
    {...rest as HTMLAnchorAttributes}
    class={['sui-button', className]}
    data-tone={tone}>{@render body()}</a
  >
{:else}
  <button
    bind:this={element}
    type="button"
    {...rest as HTMLButtonAttributes}
    class={['sui-button', className]}
    data-tone={tone}
    {disabled}
    aria-disabled={busy || undefined}
    aria-busy={loading || undefined}
    onclick={busy ? refuse : (rest as HTMLButtonAttributes).onclick}>{@render body()}</button
  >
{/if}

<style>
  /* A gradient cannot interpolate, so its one tint is registered and animated instead,
     which keeps hover, press and release one continuous surface. */
  @property --sui-control-state-layer {
    syntax: '<color>';
    inherits: false;
    initial-value: transparent;
  }

  .sui-button {
    --sui-control-state-layer: transparent;
    align-items: center;
    background-color: var(--sui-surface-raised);
    background-image: linear-gradient(
      var(--sui-control-state-layer),
      var(--sui-control-state-layer)
    );
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 1px solid var(--sui-control-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: inline-flex;
    font: 500 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-2);
    inline-size: fit-content;
    justify-content: center;
    margin: 0;
    padding: 0 var(--sui-space-3);
    text-decoration: none;
    touch-action: manipulation;
    transition:
      --sui-control-state-layer var(--sui-duration-fast) var(--sui-ease-standard),
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  .sui-button-label {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }

  .sui-button > :global(svg:first-child:not(:only-child)) {
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  .sui-button > :global(svg:last-child:not(:only-child)) {
    margin-inline-end: calc(-1 * var(--sui-icon-ink-end, 0px));
  }

  .sui-button:hover:not(:active):not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: var(--sui-interactive-hover-layer);
    border-color: var(--sui-control-border-hover);
  }

  .sui-button:active:not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-button:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-button:is(:disabled, [aria-disabled='true']) {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-button[data-tone='signal'] {
    background-color: var(--sui-brand-action);
    background-image: none;
    border-color: var(--sui-brand-action);
    color: var(--sui-on-brand-action);
  }

  .sui-button[data-tone='signal']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-brand-action-hover);
    border-color: var(--sui-brand-action-hover);
  }

  .sui-button[data-tone='signal']:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-brand-action-pressed);
    border-color: var(--sui-brand-action-pressed);
  }

  .sui-button[data-tone='decision'] {
    background-color: var(--sui-decision-accent);
    background-image: none;
    border-color: var(--sui-decision-accent);
    color: var(--sui-on-decision-accent);
  }

  .sui-button[data-tone='decision']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-decision-accent-hover);
    border-color: var(--sui-decision-accent-hover);
  }

  .sui-button[data-tone='decision']:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-decision-accent-pressed);
    border-color: var(--sui-decision-accent-pressed);
  }

  .sui-button[data-tone='ghost'] {
    background-color: transparent;
    border-color: transparent;
  }

  .sui-button[data-tone='ghost']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: transparent;
    background-color: var(--sui-surface-inset);
    border-color: transparent;
  }

  .sui-button[data-tone='stop'] {
    background-color: var(--sui-danger);
    background-image: none;
    border-color: var(--sui-danger);
    color: var(--sui-on-danger);
  }

  .sui-button[data-tone='stop']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-danger-hover);
    border-color: var(--sui-danger-hover);
  }

  .sui-button[data-tone='stop-quiet'] {
    border-color: color-mix(in srgb, var(--sui-danger) 45%, var(--sui-control-border));
    color: var(--sui-danger);
  }

  .sui-button[data-tone='stop-quiet']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: transparent;
    background-color: var(--sui-danger-tint);
    border-color: var(--sui-danger);
  }

  .sui-button[data-tone='add'] {
    background-color: transparent;
    border-radius: var(--sui-radius-chip);
    border-style: dashed;
    color: var(--sui-text-secondary);
  }

  .sui-button[data-tone='add']:focus-visible {
    border-style: dashed;
  }

  .sui-button-spinner {
    block-size: var(--sui-icon-sm);
    border: 2px solid currentColor;
    border-inline-end-color: transparent;
    border-radius: 50%;
    box-sizing: border-box;
    flex: none;
    inline-size: var(--sui-icon-sm);
    animation: sui-button-spin var(--sui-rhythm-spinner) var(--sui-ease-linear) infinite;
  }

  @keyframes sui-button-spin {
    to {
      rotate: 1turn;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-button {
      transition: none;
    }

    .sui-button:active:not(:disabled, [aria-disabled='true']) {
      translate: none;
    }

    .sui-button-spinner {
      animation: none;
    }
  }
</style>
