<script module lang="ts">
  export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'role';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon, { type IconName } from '../icons/Icon.svelte';

  let {
    tone = 'neutral',
    icon,
    dot = false,
    live = false,
    class: className = '',
    children,
    ...rest
  }: {
    /** What the pill reports: an outcome, a quiet qualifier, or `role` for a standing somebody holds. */
    tone?: PillTone;
    /** Drawn before the label, for a standing the word alone cannot name. */
    icon?: IconName;
    /** Marks a state that is true right now rather than a fixed attribute. */
    dot?: boolean;
    /** Pulses the dot, for a state arriving as it happens. */
    live?: boolean;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
A status or a standing: the role somebody holds, the state a thing is in, the scope of a page,
the health of a dependency, or whether changes arrive live. It is fully round, has no keyline
and nothing to press, so it never reads as a control. Reach for `Chip` for a value such as a
label, a pattern or a count.

`role` wears violet and belongs to the standing somebody holds over everyone else's. The
outcome tones always come with their word, so color never carries the state alone. `dot` marks
a state that is true right now, and `live` sets the dot pulsing; under reduced motion the pulse
stops and the dot stays. A long label wraps inside the pill, so no word is ever cut.
-->

<span {...rest} class={['sui-pill', className]} data-tone={tone}>
  {#if icon !== undefined}
    <Icon name={icon} size="xs" strokeWidth={2} />
  {/if}
  {#if dot || live}
    <span class={['sui-pill-dot', { live }]} aria-hidden="true"></span>
  {/if}
  <span class="sui-pill-label">{@render children()}</span>
</span>

<style>
  .sui-pill {
    align-items: center;
    background: var(--sui-neutral-tint);
    border-radius: var(--sui-radius-chip);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: inline-flex;
    flex: none;
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-tight) var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-tier-mark);
    padding: var(--sui-space-1) var(--sui-space-2);
  }

  .sui-pill > :global(svg:first-child) {
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  .sui-pill-label {
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-pill[data-tone='info'] {
    background: var(--sui-info-tint);
    color: var(--sui-info);
  }

  .sui-pill[data-tone='success'] {
    background: var(--sui-success-tint);
    color: var(--sui-success);
  }

  .sui-pill[data-tone='warning'] {
    background: var(--sui-warning-tint);
    color: var(--sui-warning);
  }

  .sui-pill[data-tone='danger'] {
    background: var(--sui-danger-tint);
    color: var(--sui-danger);
  }

  .sui-pill[data-tone='role'] {
    background: var(--sui-role-tint);
    color: var(--sui-role-ink);
  }

  .sui-pill-dot {
    background: currentColor;
    block-size: 0.375rem;
    border-radius: var(--sui-radius-chip);
    flex: none;
    inline-size: 0.375rem;
    position: relative;
  }

  /* The ring grows and fades through scale and opacity, so the pulse moves nothing else and
     never paints a glow. */
  .live::after {
    animation: sui-pill-live var(--sui-rhythm-live) var(--sui-ease-standard) infinite;
    background: currentColor;
    border-radius: inherit;
    content: '';
    inset: 0;
    opacity: 0;
    position: absolute;
  }

  @keyframes sui-pill-live {
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
