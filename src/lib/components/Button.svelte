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
without calling `onclick`. `href` draws an anchor with the same paint; a disabled one loses its
address, so it cannot be followed, and a loading one refuses the press. The label is always
wrapped so its box can be trimmed to the cap height, and an icon starts where a word would
start.

- Semantics: a native `<button type="button">`, or an `<a href>` with `href`; its words are its name, and a disabled anchor is `role="link"` with `aria-disabled`.
- Content: a short verb phrase that names the result, an optional leading `icon` and an optional `trailing` mark; a long or translated label wraps onto more lines inside its container.
- States: rest, hover (a veil and a firmer edge), focus (a 2px ring, flush on bordered tones and 2px off a filled one), pressed (a deeper ground, an inset shadow and a 1px sink), loading (a spinner, busy) and disabled (0.5 opacity, default cursor).
- Keyboard: Tab reaches it, and Enter or Space presses a button while Enter follows an anchor; a loading or disabled one refuses both.
- Pointer and touch: 34px tall on a pointer and 44px on a phone or any touch screen, at least as wide as its label, and a press is never a drag; a surface may keep it drawn at 34px on a phone with `--sui-local-button-seat`, and its hit area still grows to 44px.
- Focus: pressing never moves focus, and a loading button keeps it; the caller moves focus when the press removes the button.
- Responsive: as wide as its words up to its container or 20rem, and wider words wrap onto more lines, each keeping the one-line inset, instead of scrolling the page.
- Accessibility: the label is the name, `loading` sets `aria-busy` and `aria-disabled`, every tone's ink holds 4.5:1 on its fill, and forced colours draw hover with a highlight edge.
- Localization: it draws no words of its own; the leading icon and the gap follow the reading direction, and directional glyphs mirror in a right-to-left page.
- Performance: one element, and only colours, the inset shadow and the 1px sink move, with no movement under reduced motion.
- Analytics: `onclick` reports each press that runs; a refused press never calls it.
- Failure: a press while loading or disabled does nothing visible beyond its state, and a label too long for one line wraps instead of being cut.
-->

{#snippet body()}
  {#if loading}
    <span class="sui-button-part"><span class="sui-button-spinner" aria-hidden="true"></span></span>
  {:else if icon}
    <span class="sui-button-part">{@render icon()}</span>
  {/if}
  <span class="sui-button-label">{@render children()}</span>
  {#if trailing}
    <span class="sui-button-part">{@render trailing()}</span>
  {/if}
{/snippet}

{#if href !== undefined}
  <a
    bind:this={element}
    href={disabled ? undefined : href}
    role={disabled ? 'link' : undefined}
    {...rest as HTMLAnchorAttributes}
    class={['sui-button', className]}
    data-tone={tone}
    aria-disabled={disabled || busy || undefined}
    aria-busy={loading || undefined}
    onclick={disabled || busy ? refuse : (rest as HTMLAnchorAttributes).onclick}>{@render body()}</a
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
  /* Every line of the label keeps the inset one line has, so a label that wraps grows the
     button by whole lines and never presses against its edge, and the parts beside it hang on
     its first line (L-37, L-94). */
  .sui-button {
    --sui-control-state-layer: transparent;
    --sui-local-button-line: calc(
      var(
          --sui-local-button-seat,
          var(--sui-local-control-height, var(--sui-control-height-compact))
        ) -
        2 * var(--sui-stroke)
    );
    align-items: flex-start;
    background-color: var(--sui-surface-raised);
    background-image: linear-gradient(
      var(--sui-control-state-layer),
      var(--sui-control-state-layer)
    );
    border: var(--sui-stroke) solid var(--sui-control-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: inline-flex;
    font: var(--sui-weight-medium) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-2);
    inline-size: fit-content;
    justify-content: center;
    margin: 0;
    max-inline-size: min(100%, 20rem);
    min-block-size: var(
      --sui-local-button-seat,
      var(--sui-local-control-height, var(--sui-control-height-compact))
    );
    padding: 0 var(--sui-space-3);
    text-align: center;
    text-decoration: none;
    touch-action: manipulation;
    -webkit-user-select: none;
    user-select: none;
    transition:
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  .sui-button-label {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    line-height: var(--sui-leading-meta);
    margin-block: calc((var(--sui-local-button-line) - round(up, 1cap, 2px)) / 2);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
  }

  /* A wrapped label fills the button, so beside an icon or a mark its lines start at that part
     rather than centring away from it. */
  .sui-button-part + .sui-button-label,
  .sui-button-label:has(+ .sui-button-part) {
    text-align: start;
  }

  .sui-button-part {
    align-items: center;
    block-size: var(--sui-local-button-line);
    display: flex;
    flex: none;
  }

  /* A trailing chevron turns over while the layer it opens is open, so it points the way the
     layer will go when pressed again. It turns in one step for a reader who asks for less
     motion. */
  @media (prefers-reduced-motion: no-preference) {
    .sui-button-part:last-child:has(> :global(svg[data-icon='chevron-down'])) {
      transition: rotate var(--sui-duration-open) var(--sui-ease-standard);
    }
  }

  .sui-button[aria-expanded='true']
    > .sui-button-part:last-child:has(> :global(svg[data-icon='chevron-down'])) {
    rotate: 180deg;
  }

  .sui-button-part:first-child > :global(svg) {
    margin-inline-start: calc(-1 * var(--sui-icon-ink-start, 0px));
  }

  .sui-button-part:last-child > :global(svg) {
    margin-inline-end: calc(-1 * var(--sui-icon-ink-end, 0px));
  }

  /* A surface that draws a button at the pointer's tier on a phone too
     (`--sui-local-button-seat`), as a card's head does its ghost action, still gives a finger
     44px: the hit area grows past the drawn box (L-38), and never shrinks below it. */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-button {
      position: relative;
    }

    .sui-button::after {
      content: '';
      inset: calc((100% - max(100%, var(--sui-touch-target))) / 2);
      position: absolute;
    }
  }

  @media (hover: hover) {
    .sui-button:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      --sui-control-state-layer: var(--sui-interactive-hover-layer);
      border-color: var(--sui-control-border-hover);
    }

    .sui-button[data-tone='signal']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      background-color: var(--sui-brand-action-hover);
      border-color: var(--sui-brand-action-hover);
    }

    .sui-button[data-tone='decision']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      background-color: var(--sui-decision-accent-hover);
      border-color: var(--sui-decision-accent-hover);
    }

    /* A veil, not a ground of its own, so a quiet button reads on any plate it stands on, the
       unsaved row's gold included. */
    .sui-button[data-tone='ghost']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      border-color: transparent;
    }

    .sui-button[data-tone='stop']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      background-color: var(--sui-danger-hover);
      border-color: var(--sui-danger-hover);
    }

    .sui-button[data-tone='stop-quiet']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      --sui-control-state-layer: transparent;
      background-color: var(--sui-danger-tint);
      border-color: var(--sui-danger);
    }
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

  /* A filled tone's edge is its fill, so a flush ring of the same blue would only grow it by
     2px; standing 2px off, the ring shows against the ground the button sits on. */
  .sui-button:is([data-tone='signal'], [data-tone='stop'], [data-tone='decision']):focus-visible {
    outline-offset: var(--sui-focus-ring-offset);
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

  .sui-button[data-tone='decision']:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-decision-accent-pressed);
    border-color: var(--sui-decision-accent-pressed);
  }

  .sui-button[data-tone='ghost'] {
    background-color: transparent;
    border-color: transparent;
  }

  .sui-button[data-tone='stop'] {
    background-color: var(--sui-danger);
    background-image: none;
    border-color: var(--sui-danger);
    color: var(--sui-on-danger);
  }

  /* One step past hover in the same direction: deeper on light, brighter on dark (L-13). */
  .sui-button[data-tone='stop']:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-danger-pressed);
    border-color: var(--sui-danger-pressed);
  }

  .sui-button[data-tone='stop-quiet'] {
    border-color: color-mix(in srgb, var(--sui-danger) 45%, var(--sui-control-border));
    color: var(--sui-danger);
  }

  /* The press keeps the danger family the hover gave it, a step deeper, never a neutral veil. */
  .sui-button[data-tone='stop-quiet']:active:not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: color-mix(in srgb, var(--sui-danger) 12%, transparent);
    background-color: var(--sui-danger-tint);
    border-color: var(--sui-danger);
  }

  .sui-button[data-tone='add'] {
    background-color: transparent;
    border-radius: var(--sui-radius-pill);
    border-style: dashed;
    color: var(--sui-text-secondary);
  }

  .sui-button[data-tone='add']:focus-visible {
    border-style: dashed;
  }

  .sui-button-spinner {
    block-size: var(--sui-icon-sm);
    border: var(--sui-stroke-bold) solid currentColor;
    border-inline-end-color: transparent;
    border-radius: 50%;
    box-sizing: border-box;
    flex: none;
    inline-size: var(--sui-icon-sm);
    animation: sui-button-spin var(--sui-duration-spinner) var(--sui-ease-linear) infinite;
  }

  @keyframes sui-button-spin {
    to {
      rotate: 1turn;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-button,
    .sui-button-part {
      transition: none;
    }

    .sui-button:active:not(:disabled, [aria-disabled='true']) {
      translate: none;
    }

    .sui-button-spinner {
      animation: none;
    }
  }

  /* High contrast paints every button alike, so hover draws the edge in the system's
     highlight; press keeps its 1px sink. */
  @media (hover: hover) and (forced-colors: active) {
    .sui-button:hover:not(:disabled, [aria-disabled='true']) {
      border-color: Highlight;
    }
  }
</style>
