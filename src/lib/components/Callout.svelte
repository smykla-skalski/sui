<script module lang="ts">
  /** `quiet` states a consequence to take in before confirming, `warning` a hazardous one. */
  export type CalloutTone = 'quiet' | 'warning';
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    tone = 'quiet',
    decision = false,
    title,
    icon,
    actions,
    live = false,
    warningLabel = word('Callout.warningLabel', 'Warning:'),
    decisionLabel = word('Callout.decisionLabel', 'Needs your decision:'),
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
    /** Announces the callout's words once it appears, for one that shows up after the reader's own edit. */
    live?: boolean;
    /** Read before a warning's words, because the tint and the icon do not reach a screen reader. */
    warningLabel?: string;
    /** Read before a decision's words, because the gold surface does not reach a screen reader. */
    decisionLabel?: string;
    /** Layout for the call site only, never the callout's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
    /** The description: inline content, such as words and a `Link`. */
    children?: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();

  /* Many screen readers skip a live region that enters the page with its words, so the words
     arrive a moment after the region does, as `Skeleton` waits for the same reason. */
  const SETTLE = 100;

  let copy = $state<HTMLElement | null>(null);
  let said = $state('');

  /* What a screen reader reads of the copy: a copy drawn only for the eye is hidden from it, a
     closed layer, a `hidden` note, a word kept invisible for its seat and a space between flex
     items are not drawn, and a control named by `aria-label` is read by that name. */
  const spoken = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!node.parentElement || getComputedStyle(node.parentElement).visibility !== 'visible')
        return '';
      if (text.trim()) return text;
      const drawn = document.createRange();
      drawn.selectNodeContents(node);
      return drawn.getClientRects().length > 0 ? text : '';
    }
    if (!(node instanceof Element)) return '';
    if (node.getAttribute('aria-hidden') === 'true' || !node.checkVisibility()) return '';
    return node.getAttribute('aria-label') ?? [...node.childNodes].map(spoken).join('');
  };

  /* Whitespace collapses as the page draws it, so a no-break or narrow space a language writes
     between its words stays as written. */
  const collapse = (text: string) => text.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');

  const prefix = $derived(decision ? decisionLabel : tone === 'warning' ? warningLabel : '');

  $effect(() => {
    if (!live || !copy) return;
    const source = copy;
    void title;
    const timer = setTimeout(
      () =>
        (said = [...source.children]
          .map((part) => collapse(spoken(part)))
          .filter(Boolean)
          .join(mark('space'))),
      SETTLE
    );
    return () => clearTimeout(timer);
  });
</script>

<!--
@component
A short consequence set off from the words around it, beside the work rather than instead
of it. An empty state stands where the work would have been; a callout says something about
what the reader is looking at.

Two tones and no more. `quiet` states a consequence to take in before confirming, and
`warning` is for the genuinely hazardous one and carries the tint. A screen reader hears
"Warning:" before its words, because the tint and the icon do not reach it. `decision` is
the gold surface of an unsaved decision: opaque, with a 2px accent border, and a screen reader
hears `decisionLabel` before its words. Its resolving action wears Button's `decision` tone,
and every other action keeps the default tone.

The icon stands in a 2rem tile of the callout's tone and draws at 18px whatever tier the caller
asked for. Copy shorter than the tile centres on it; longer copy starts at the tile's top. A
default action takes the tone too: in a warning it is quiet, with no ground of its own and an
edge of the warning hue, and beside a decision it is quiet in the unsaved hue, with a gold edge
and the unsaved ink, so no neutral block sits on a state (L-92).

- Semantics: a `div` of one or two paragraphs; with `live` its words also reach a polite `status`, or an `alert` for a warning.
- Content: an optional 2rem symbol tile, a title, inline description content such as a `Link`, and a few actions; copy wraps and stops at 72 characters a line.
- States: `quiet` on the neutral veil, `warning` on the warning tint, and `decision` on the opaque surface with the gold border and shadow.
- Keyboard: none of its own; its actions and links take Tab in reading order.
- Pointer and touch: its actions keep their own 34px and 44px targets.
- Focus: it never takes focus; a caller that raises it after a failed act leaves focus on the control the reader used.
- Responsive: actions sit beside the message, and at 24rem wide or narrower they move to a row under it, lined up with the copy, so the words keep the width.
- Accessibility: `warningLabel` and `decisionLabel` say in words what the tint and the gold say in colour, and `live` announces a callout that appears after an edit.
- Localization: `warningLabel` and `decisionLabel` carry the built-in words, the tile sits at the inline start and the actions at the inline end, mirrored in a right-to-left page.
- Performance: a static block with one container query; `live` sets one short timer when it appears.
- Analytics: none of its own; its actions report the reader's choice.
- Failure: with no title it reads its description alone, and with neither it draws only its frame, so always pass words.
-->

{#snippet named()}
  {#if prefix}<VisuallyHidden>{prefix}{mark('space')}</VisuallyHidden>{/if}
{/snippet}

<div {...rest} class={['sui-callout', className, { decision }]} data-tone={tone}>
  <!-- The callout measures its own width, and a container query reaches only what is inside. -->
  <div class="sui-callout-inner">
    <div class="sui-callout-message">
      {#if icon}
        <span class="sui-callout-icon">{@render icon()}</span>
      {/if}
      <div bind:this={copy} class="sui-callout-copy">
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
</div>
{#if live}
  <VisuallyHidden role={tone === 'warning' && !decision ? 'alert' : 'status'}>{said}</VisuallyHidden
  >
{/if}

<style>
  .sui-callout {
    background: var(--sui-interactive-hover);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    container: sui-callout / inline-size;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    padding: var(--sui-space-3);
  }

  .sui-callout-inner {
    align-items: center;
    display: flex;
    gap: var(--sui-space-3);
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
  /* 72 characters a line at most, so a wide callout keeps a readable measure. */
  .sui-callout-copy {
    align-content: center;
    display: grid;
    flex: 1;
    gap: var(--sui-row-copy-gap);
    max-inline-size: 72ch;
    min-inline-size: 0;
  }

  .sui-callout-message:has(> .sui-callout-icon) > .sui-callout-copy {
    min-block-size: var(--sui-symbol-tile);
  }

  .sui-callout-title,
  .sui-callout-text {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-callout-title {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
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

  /* Narrow, the actions take a row of their own under the message, starting where the copy
     starts, so the words never shrink to a sliver beside the buttons. */
  @container sui-callout (max-width: 24rem) {
    .sui-callout-inner {
      align-items: stretch;
      flex-direction: column;
    }

    .sui-callout-actions {
      flex-wrap: wrap;
    }

    .sui-callout-message:has(> .sui-callout-icon) + .sui-callout-actions {
      padding-inline-start: calc(var(--sui-symbol-tile) + var(--sui-space-3));
    }
  }
</style>
