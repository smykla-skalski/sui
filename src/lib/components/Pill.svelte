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
    class: className = '',
    children,
    ...rest
  }: {
    /** What the pill reports: an outcome, a quiet qualifier, or `role` for a standing somebody holds. */
    tone?: PillTone;
    /** Drawn before the label, for a standing the word alone cannot name. */
    icon?: IconName;
    class?: HTMLAttributes<HTMLSpanElement>['class'];
    children: Snippet;
  } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'> = $props();
</script>

<!--
@component
A standing: the role somebody holds or the state a thing is in. It is fully round, has no
keyline and nothing to press, so it never reads as a control. Reach for `Chip` for a value
such as a label, a pattern or a count, and for `StatusPill` for a fact about the surface
it stands on.

`role` wears violet and belongs to the standing somebody holds over everyone else's. The
outcome tones always come with their word, so color never carries the state alone. A
pill stays on one line and ends in an ellipsis rather than pushing its row wider.
-->

<span {...rest} class={['sui-pill', className]} data-tone={tone}>
  {#if icon !== undefined}
    <Icon name={icon} size="xs" strokeWidth={2} />
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
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-1);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-block-size: var(--sui-tier-mark);
    padding-inline: var(--sui-space-2);
    white-space: nowrap;
  }

  .sui-pill > :global(svg:first-child) {
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  /* `clip` on the inline axis only: the trimmed box ends on the baseline, and the
     descenders below it must still paint. */
  .sui-pill-label {
    display: block;
    min-inline-size: 0;
    overflow-x: clip;
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
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
</style>
