<script module lang="ts">
  /** `quiet` states a consequence to take in before confirming, `warning` a hazardous one. */
  export type CalloutTone = 'quiet' | 'warning';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    tone = 'quiet',
    decision = false,
    title,
    icon,
    actions,
    class: className = '',
    children,
    ...rest
  }: {
    tone?: CalloutTone;
    /** The gold surface for an unsaved decision and the action that resolves it. */
    decision?: boolean;
    title?: string;
    /** The mark beside the words, when the words alone do not carry the weight. */
    icon?: Snippet;
    /** Controls beside the message. They centre on it without changing its rhythm. */
    actions?: Snippet;
    /** Layout for the call site only, never the callout's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
    /** The description: inline content, such as words and a `Link`. */
    children?: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();
</script>

<!--
@component
A short consequence set off from the words around it, beside the work rather than instead
of it. An empty state stands where the work would have been; a callout says something about
what the reader is looking at.

Two tones and no more. `quiet` states a consequence to take in before confirming, and
`warning` is for the genuinely hazardous one and carries the tint. A screen reader hears
"Warning:" before its words, because the tint and the icon do not reach it. `decision` is
the gold surface of an unsaved decision: opaque, with a 2px accent border. Its resolving
action wears Button's `decision` tone, and every other action keeps the default tone.

The icon stands in a 2rem tile of the callout's tone and draws at 18px whatever tier the caller
asked for. Copy shorter than the tile centres on it; longer copy starts at the tile's top. The
title and description stand 8px of ink apart, and the callout keeps one inset around the tile,
the copy and the actions. A default action takes the tone too: in a warning it is quiet, with
no ground of its own and an edge of the warning hue, and beside a decision it is quiet in the
unsaved hue, with a gold edge and the unsaved ink, so no neutral block sits on a state (L-92).
Actions sit in a row beside the message and stack in a column when the callout is 24rem wide
or narrower. The callout measures its own width for that, so give it a width
from its container rather than sizing it to its content.
-->

<!-- A no-break space, because Svelte trims a plain one at the end of the words. -->
{#snippet named()}
  {#if tone === 'warning'}<VisuallyHidden>Warning:&nbsp;</VisuallyHidden>{/if}
{/snippet}

<div {...rest} class={['sui-callout', className, { decision }]} data-tone={tone}>
  <div class="sui-callout-message">
    {#if icon}
      <span class="sui-callout-icon">{@render icon()}</span>
    {/if}
    <div class="sui-callout-copy">
      {#if title !== undefined}
        <p class="sui-callout-title">{@render named()}{title}</p>
      {/if}
      {#if children}
        <p class="sui-callout-text">
          {#if title === undefined}{@render named()}{/if}{@render children()}
        </p>
      {/if}
    </div>
  </div>
  {#if actions}
    <div class="sui-callout-actions">{@render actions()}</div>
  {/if}
</div>

<style>
  .sui-callout {
    align-items: center;
    background: var(--sui-interactive-hover);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    container: sui-callout / inline-size;
    display: flex;
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    gap: var(--sui-space-3);
    min-inline-size: 0;
    padding: var(--sui-space-3);
  }

  .sui-callout[data-tone='warning'] {
    --sui-callout-tile: color-mix(in srgb, var(--sui-warning) 16%, transparent);
    --sui-callout-mark: var(--sui-warning);
    /* A default action is quiet on the tint: no ground of its own, an edge of the tone. */
    --sui-surface-raised: transparent;
    --sui-control-border: color-mix(in srgb, var(--sui-warning) 40%, var(--sui-warning-tint));
    --sui-control-border-hover: color-mix(in srgb, var(--sui-warning) 65%, var(--sui-warning-tint));
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-warning) 12%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-warning) 20%, transparent);
    background: var(--sui-warning-tint);
    border-color: color-mix(in srgb, var(--sui-warning) 30%, var(--sui-warning-tint));
    font-size: var(--sui-font-size-meta);
  }

  /* Written after the tones and as specific as them, so it wins over either. */
  .sui-callout.decision {
    --sui-callout-tile: var(--sui-unsaved-surface);
    --sui-callout-mark: var(--sui-unsaved-ink);
    --sui-surface-raised: transparent;
    --sui-control-border: var(--sui-unsaved-control-border);
    --sui-control-border-hover: var(--sui-unsaved-border);
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-unsaved-ink) 10%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-unsaved-ink) 16%, transparent);
    background: var(--sui-popover-bg);
    border: var(--sui-decision-border-width) solid var(--sui-decision-accent);
    box-shadow: var(--sui-shadow-plate);
  }

  .sui-callout-message {
    align-items: flex-start;
    display: flex;
    flex: 1;
    gap: inherit;
    min-inline-size: 0;
  }

  /* The symbol's tile. Its icon tiers all draw at 18px, whichever the caller named. */
  .sui-callout-icon {
    --sui-icon-xs: var(--sui-icon-md);
    --sui-icon-sm: var(--sui-icon-md);
    --sui-icon-base: var(--sui-icon-md);
    align-items: center;
    background: var(
      --sui-callout-tile,
      color-mix(in srgb, var(--sui-text-primary) 8%, transparent)
    );
    block-size: var(--sui-symbol-tile);
    border-radius: var(--sui-radius-control);
    color: var(--sui-callout-mark, var(--sui-text-secondary));
    display: flex;
    flex: none;
    inline-size: var(--sui-symbol-tile);
    justify-content: center;
  }

  /* At least as tall as the tile, so short copy centres on it and long copy starts at its top. */
  .sui-callout-copy {
    align-content: center;
    display: grid;
    flex: 1;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-callout-message:has(> .sui-callout-icon) > .sui-callout-copy {
    min-block-size: var(--sui-symbol-tile);
  }

  .sui-callout-title,
  .sui-callout-text {
    block-size: var(--sui-block-snap);
    margin: 0;
    overflow-wrap: break-word;
    text-box: trim-both cap alphabetic;
  }

  .sui-callout-title {
    color: var(--sui-text-primary);
    font-weight: 600;
  }

  .decision .sui-callout-actions {
    --sui-text-primary: var(--sui-unsaved-ink);
  }

  .sui-callout-actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: var(--sui-space-2);
  }

  @container sui-callout (max-width: 24rem) {
    .sui-callout-actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
