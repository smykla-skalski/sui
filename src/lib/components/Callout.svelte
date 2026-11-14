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
    compact = false,
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
    /** One 40px line about the whole page, such as data shown stale: a bare 18px symbol and no title. */
    compact?: boolean;
    title?: string;
    /** The mark beside the words, when the words alone do not carry the weight. */
    icon?: Snippet;
    /** Controls beside the message, drawn at the quiet tier inside the band its symbol opens. They never move it. */
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
the gold surface of an unsaved decision: opaque, with a one-stroke gold edge, and a screen reader
hears `decisionLabel` before its words. Its resolving action wears Button's `decision` tone,
and every other action keeps the default tone.

`compact` is a strip for a notice about the whole page, such as data shown stale, that must
not push the page down as far as a message about the work does: no title, its symbol bare
at 18px in the ink of its words, centred in a full tile's 2rem slot so its words start where
a full callout's do, and its band only as tall as its quiet-tier actions, so one line of it
stands 40px tall.

The icon stands in a 2rem tile of the callout's tone and draws at 18px whatever tier the caller
asked for. Copy shorter than the tile centres on it; longer copy starts at the tile's top. The
tile opens the message's first line in a band its actions fit inside: they are drawn at the
28px quiet tier and centre on the tile, so a callout stands as tall, and its words where
they stand, with or without them. Give a callout with actions its symbol, because words alone
open no band. A
default action takes the tone too: in a warning it is quiet, with no ground of its own and an
edge of the warning hue, and beside a decision it is quiet in the unsaved hue, with a gold edge
and the unsaved ink, so no neutral block sits on a state (L-92).

- Semantics: a `div` of one or two paragraphs; with `live` its words also reach a polite `status`, or an `alert` for a warning.
- Content: an optional 2rem symbol tile, a title, inline description content such as a `Link`, and a few actions; copy wraps at the callout's own width.
- States: `quiet` on the neutral veil, `warning` on the warning tint, and `decision` on the opaque surface with the gold border and shadow.
- Keyboard: none of its own; its actions and links take Tab in reading order.
- Pointer and touch: its actions are drawn at the 28px quiet tier and keep a 44px hit area on a phone or a coarse pointer; stacked, they stand 16px apart there so two hit areas never meet.
- Focus: it never takes focus; a caller that raises it after a failed act leaves focus on the control the reader used.
- Responsive: actions sit at the inline end beside the message, centred on the band its symbol's tile opens, by the title however long the message, so the message never moves for them, and move to a line under the copy, from the words' start edge past its symbol, only when the callout cannot hold them beside a 14rem measure of copy.
- Accessibility: `warningLabel` and `decisionLabel` say in words what the tint and the gold say in colour, and `live` announces a callout that appears after an edit.
- Localization: `warningLabel` and `decisionLabel` carry the built-in words, the tile sits at the inline start and the actions at the inline end, mirrored in a right-to-left page.
- Performance: a static block laid out by flex wrapping alone; `live` sets one short timer when it appears and fades it in from 4px above on opacity and translate, not at all under reduced motion.
- Analytics: none of its own; its actions report the reader's choice.
- Failure: with no title it reads its description alone, and with neither it draws only its frame, so always pass words.
-->

{#snippet named()}
  {#if prefix}<VisuallyHidden>{prefix}{mark('space')}</VisuallyHidden>{/if}
{/snippet}

<div {...rest} class={['sui-callout', className, { compact, decision, live }]} data-tone={tone}>
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
  /* A quiet ground of its own, a firmer veil of the ink than a row's hover, so a resting message
     never reads as a hovered row. */
  .sui-callout {
    background: light-dark(
      color-mix(in srgb, var(--sui-text-primary) 5%, var(--sui-surface-base)),
      color-mix(in srgb, var(--sui-text-primary) 6%, var(--sui-surface-base))
    );
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    padding: var(--sui-space-3);
  }

  /* The message and the actions share one line while the callout holds both, and the actions
     wrap under the copy only when they do not fit beside a 14rem measure of it (about 34
     characters, a phone message's title on one line). Wrapping decides that from the actions' own width, which a container query
     cannot know. A wrapped line of actions starts where the words start, past the tile, so
     the actions read as the message's and not the tile's (L-90): the inner box gives up the
     tile's room at its start and the message takes it back. On a shared line the actions centre on
     the tile's band, the message's first line, so a long message keeps them by its title, as
     an alert's action stands on its title row. */
  .sui-callout-inner {
    --sui-callout-measure: 14rem;
    /* What stands a quiet-tier action on the middle of the tile's band; a wrapped line's gap
       gives it back, so the copy keeps its 12px over the actions. */
    --sui-local-band-room: calc((var(--sui-symbol-tile) - var(--sui-tier-quiet)) / 2);
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--sui-space-3) - var(--sui-local-band-room)) var(--sui-space-3);
  }

  .sui-callout-inner:has(> .sui-callout-message > .sui-callout-icon) {
    --sui-callout-indent: calc(var(--sui-symbol-tile) + var(--sui-space-3));
    padding-inline-start: var(--sui-callout-indent);
  }

  .sui-callout-inner:has(> .sui-callout-message > .sui-callout-icon) > .sui-callout-message {
    margin-inline-start: calc(-1 * var(--sui-callout-indent));
  }

  .sui-callout[data-tone='warning'] {
    /* On the light tint the tile takes a firmer share of the tone to stand off its ground. */
    --sui-callout-tile: light-dark(
      color-mix(in srgb, var(--sui-warning) 22%, transparent),
      color-mix(in srgb, var(--sui-warning) 16%, transparent)
    );
    --sui-callout-mark: var(--sui-warning);
    /* A default action is quiet on the tint: no ground of its own, an edge of the tone. */
    --sui-surface-raised: transparent;
    --sui-control-border: color-mix(in srgb, var(--sui-warning) 55%, var(--sui-warning-tint));
    /* A hover the pointer finds by its edge on the tint, its fill kept light on the light tint
       so it never reads as chosen, and a press a clear step past it. */
    --sui-control-border-hover: color-mix(in srgb, var(--sui-warning) 75%, var(--sui-warning-tint));
    --sui-interactive-hover-layer: light-dark(
      color-mix(in srgb, var(--sui-warning) 18%, transparent),
      color-mix(in srgb, var(--sui-warning) 26%, transparent)
    );
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-warning) 36%, transparent);
    background: var(--sui-warning-tint);
    border-color: color-mix(in srgb, var(--sui-warning) 30%, var(--sui-warning-tint));
    font-size: var(--sui-font-size-meta);
  }

  /* Written after the tones and as specific as them, so it wins over either. */
  .sui-callout.decision {
    /* Its reason takes the unsaved family's secondary ink, as an unsaved setting row's does. */
    --sui-text-secondary: var(--sui-unsaved-secondary);
    --sui-callout-tile: var(--sui-unsaved-surface);
    --sui-callout-mark: var(--sui-unsaved-ink);
    --sui-surface-raised: transparent;
    --sui-control-border: var(--sui-unsaved-control-border);
    --sui-control-border-hover: var(--sui-unsaved-border);
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-unsaved-ink) 10%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-unsaved-ink) 16%, transparent);
    background: var(--sui-popover-bg);
    border: var(--sui-decision-border-width) solid var(--sui-unsaved-border);
    box-shadow: var(--sui-shadow-plate);
  }

  .sui-callout-message {
    align-items: flex-start;
    display: flex;
    flex: 1 1 calc(var(--sui-callout-indent, 0px) + var(--sui-callout-measure));
    gap: var(--sui-space-3);
    min-inline-size: 0;
  }

  /* The symbol's tile. Its icon tiers all draw at 18px, whichever the caller named. */
  .sui-callout-icon {
    --sui-icon-xs: var(--sui-icon-md);
    --sui-icon-sm: var(--sui-icon-md);
    --sui-icon-base: var(--sui-icon-md);
    align-items: center;
    /* A quiet tile stands a firm step off the quiet ground, which is itself a light veil. */
    background: var(
      --sui-callout-tile,
      light-dark(
        color-mix(in srgb, var(--sui-text-primary) 11%, transparent),
        color-mix(in srgb, var(--sui-text-primary) 9%, transparent)
      )
    );
    block-size: var(--sui-symbol-tile);
    border-radius: var(--sui-radius-control);
    color: var(--sui-callout-mark, var(--sui-text-primary));
    display: flex;
    flex: none;
    inline-size: var(--sui-symbol-tile);
    justify-content: center;
  }

  /* The copy takes the width the callout gives it: a callout is set beside the work in that
     work's own column, so it already reads at the column's measure. */
  .sui-callout-copy {
    align-content: center;
    display: grid;
    flex: 1;
    gap: var(--sui-title-copy-gap);
    min-inline-size: 0;
  }

  /* At least as tall as the tile, so short copy centres on it and long copy starts at its top. */
  .sui-callout-message:has(> .sui-callout-icon) > .sui-callout-copy {
    min-block-size: var(--sui-symbol-tile);
  }

  .sui-callout-title,
  .sui-callout-text {
    align-content: center;
    block-size: var(--sui-block-snap);
    margin: 0;
    max-inline-size: var(--sui-measure);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* A title that wraps keeps its reason's 20px lines and fills them as the reason does, so the
     two read as one message. */
  .sui-callout-title {
    text-wrap: pretty;
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
    line-height: var(--sui-leading-title-note);
  }

  /* The reason wraps at a card description's 20px, with no phone step, since its actions are
     drawn at the quiet tier and no 44px control stands under it (L-24), and fills its lines,
     so none of them leaves a gap before an action beside it. */
  .sui-callout-text {
    line-height: var(--sui-leading-title-note);
    text-wrap: pretty;
  }

  /* A reason with no title over it is the whole message, so it takes the title's ink, but for a
     decision's, which keeps the unsaved family's secondary ink. */
  .sui-callout:not(.decision) .sui-callout-text:first-child {
    color: var(--sui-text-primary);
  }

  .decision .sui-callout-actions {
    --sui-text-primary: var(--sui-unsaved-ink);
  }

  /* The message opens in a band as tall as its symbol's tile, and its actions are drawn at the
     quiet tier, shorter than that band, with their hit area grown on a phone: beside the
     message they live inside its band, so the message stands where it stands with no action
     and the callout keeps its height, and on a line of their own they wrap among themselves,
     far enough apart that two hit areas never meet (L-38). */
  .sui-callout-actions {
    --sui-local-button-seat: var(--sui-tier-quiet);
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    margin-block-start: var(--sui-local-band-room);
    min-inline-size: 0;
  }

  /* The band is a quiet-tier action's height and the box pads a step and a stroke over and
     under it, so one line stands 40px tall with its ink centred. */
  .compact {
    --sui-symbol-tile: var(--sui-tier-quiet);
    padding-block: calc(var(--sui-space-1) + var(--sui-stroke));
  }

  /* The symbol keeps a full tile's 2rem slot, so the strip's words start on the edge a full
     callout's words do, and a strip over a warning shares one text edge with it. */
  .compact .sui-callout-inner:has(> .sui-callout-message > .sui-callout-icon) {
    --sui-callout-indent: calc(var(--sui-space-8) + var(--sui-space-3));
  }

  /* Bare of its tile, the glyph keeps a full callout's 18px, so a whole-page strip still names
     its kind at a glance beside the tiled warning under it. */
  .compact .sui-callout-icon {
    --sui-icon-base: var(--sui-icon-md);
    --sui-icon-sm: var(--sui-icon-base);
    --sui-icon-xs: var(--sui-icon-base);
    background: none;
    color: inherit;
    inline-size: var(--sui-space-8);
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-callout-actions {
      row-gap: calc(var(--sui-touch-target) - var(--sui-tier-quiet));
    }
  }

  /* A callout an edit brings settles in from just above, so the reader sees where it landed. */
  .live {
    transition:
      opacity var(--sui-duration-fast) var(--sui-ease-out),
      translate var(--sui-duration-fast) var(--sui-ease-out);
  }

  @starting-style {
    .live {
      opacity: 0;
      translate: 0 calc(-1 * var(--sui-space-1));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .live {
      transition: none;
    }
  }
</style>
