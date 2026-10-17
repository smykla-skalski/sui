<script module lang="ts">
  export type StatusPillTone = 'neutral' | 'success' | 'warning' | 'danger';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon, { type IconName } from '../icons/Icon.svelte';

  let {
    tone = 'neutral',
    dot = false,
    live = false,
    icon,
    class: className = '',
    children,
    ...rest
  }: {
    /** The health of what the pill reports on. */
    tone?: StatusPillTone;
    /** Marks a state that is true right now rather than a fixed attribute. */
    dot?: boolean;
    /** Pulses the dot, for a state arriving as it happens. */
    live?: boolean;
    /** A symbol the words alone cannot carry, drawn before the label. */
    icon?: IconName;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
A fact about the surface it stands on: the scope of a page, the health of a dependency,
whether changes arrive live. It is a caption rather than a value, so it is uppercase,
quieter than a `Chip`, and never pressable.

`dot` marks a state that is true right now, and `live` sets the dot pulsing. The pulse
stops under reduced motion and the dot stays, so the state survives without the movement.
-->

<span {...rest} class={['sui-status-pill', className]} data-tone={tone}>
  {#if icon !== undefined}
    <Icon name={icon} size="xs" strokeWidth={2} />
  {/if}
  {#if dot || live}
    <span class={['sui-status-pill-dot', { live }]} aria-hidden="true"></span>
  {/if}
  <span class="sui-status-pill-label">{@render children()}</span>
</span>

<style>
  .sui-status-pill {
    align-items: center;
    background: var(--sui-surface-inset);
    block-size: var(--sui-status-pill-line);
    border-radius: var(--sui-radius-chip);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: inline-flex;
    flex: none;
    font: 700 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-2);
    inline-size: fit-content;
    letter-spacing: 0.06em;
    max-inline-size: 100%;
    padding-inline: var(--sui-space-2);
    text-transform: uppercase;
    white-space: nowrap;
  }

  .sui-status-pill > :global(svg:first-child) {
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  .sui-status-pill-label {
    display: block;
    min-inline-size: 0;
    overflow-x: clip;
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
  }

  .sui-status-pill[data-tone='success'] {
    background: var(--sui-success-tint);
    color: var(--sui-success);
  }

  .sui-status-pill[data-tone='warning'] {
    background: var(--sui-warning-tint);
    color: var(--sui-warning);
  }

  .sui-status-pill[data-tone='danger'] {
    background: var(--sui-danger-tint);
    color: var(--sui-danger);
  }

  .sui-status-pill-dot {
    background: currentColor;
    block-size: 0.375rem;
    border-radius: var(--sui-radius-chip);
    flex: none;
    inline-size: 0.375rem;
    position: relative;
  }

  /* The ring grows and fades through transform and opacity, so the pulse moves nothing
     else and never paints a glow. */
  .live::after {
    animation: sui-status-pill-live var(--sui-rhythm-live) var(--sui-ease-standard) infinite;
    background: currentColor;
    border-radius: inherit;
    content: '';
    inset: 0;
    opacity: 0;
    position: absolute;
  }

  @keyframes sui-status-pill-live {
    0% {
      opacity: 0.45;
      scale: 1;
    }

    70%,
    100% {
      opacity: 0;
      scale: 2.6;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live::after {
      animation: none;
    }
  }
</style>
