<script module lang="ts">
  export type ButtonTone =
    'default' | 'signal' | 'ghost' | 'stop' | 'stop-quiet' | 'add' | 'decision';
</script>

<script lang="ts" generics="Href extends string | undefined = undefined">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { held, holdAround } from '../internal/held.svelte.js';
  import { shownWait } from '../internal/shown-wait.svelte.js';

  type NativeElement = Href extends string ? HTMLAnchorElement : HTMLButtonElement;
  type NativeAttributes = HTMLAttributes<NativeElement> &
    Omit<HTMLAnchorAttributes & HTMLButtonAttributes, keyof HTMLAttributes<HTMLElement> | 'href'>;

  let {
    tone = 'default',
    href,
    icon,
    trailing,
    loading = false,
    reserve = false,
    busyLabel,
    field = false,
    disabled = false,
    element = $bindable(null),
    'aria-disabled': ariaDisabled,
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
    /** Keeps the spinner's room while idle, the words centred in it, so the press that starts
     the work never moves the actions beside it (L-64). */
    reserve?: boolean;
    /** Said in place of the label while its spinner shows. The button keeps the wider of the label and
     the spinner with these words, so the swap never moves the actions beside it (L-64). */
    busyLabel?: string;
    /** Draws a field's edge, baseline and recess, for a button that holds a value, such as a picker's trigger. */
    field?: boolean;
    disabled?: boolean;
    element?: HTMLButtonElement | HTMLAnchorElement | null;
    /** Layout for the call site only, never the button's own paint. */
    class?: HTMLAttributes<NativeElement>['class'];
    children: Snippet;
  } & NativeAttributes = $props();

  /* `disabled` would drop a focused button's focus to the body, so a busy one stays in the tab
     order and refuses the press itself, and so does one its owner locks with `aria-disabled`,
     such as a control held while a busy dialog or a saving pane around it works. Work that runs
     on the form around it holds every other button the same way, and disables it once focus has
     moved to the busy action, so Cancel never looks ready while a save refuses it. */
  const busy = $derived(loading && !disabled);
  const around = holdAround();
  const holding = $derived(loading ? null : held(element, around));
  const locked = $derived(
    busy || ariaDisabled === true || ariaDisabled === 'true' || holding !== null
  );
  /* A firmly held link loses its address as a held button is disabled, so a middle press or
     the context menu cannot follow it while the work runs. */
  const unreachable = $derived(disabled || holding === 'firm');
  const spinning = shownWait(() => loading);
  const swaps = $derived(busyLabel !== undefined && !icon);
  const reserving = $derived(reserve && !swaps && !spinning.current && !icon);

  function refuse(event: MouseEvent) {
    event.preventDefault();
  }
</script>

<!--
@component
A tone is a job, never a color. `default` does a view's ordinary work, `signal` is the one
action a view exists for (one per view), `ghost` is low emphasis that supports it, `stop` is
destructive, and `stop-quiet` is destructive but bordered, for a flow whose filled danger
button is the final confirmation, or a removal that stands apart from the save beside it. `add` has a firm dashed edge and starts an
optional entry; it never submits, saves, cancels, removes or navigates. `decision` is the gold
action that resolves unsaved work, such as Save in a save bar, and nothing else wears it.

Disabled is a state that any tone can wear, and so is `loading`. A loading button keeps its
place in the tab order and its focus, is announced as busy and disabled, and ignores presses
without calling `onclick`. `href` draws an anchor with the same paint; a disabled one loses its
address, so it cannot be followed, and a loading one refuses the press. The label is always
wrapped so its box can be trimmed to the cap height, and an icon starts where a word would
start.

- Semantics: a native `<button type="button">`, or an `<a href>` with `href`; its words are its name, and a disabled anchor is `role="link"` with `aria-disabled`.
- Content: a short verb phrase that names the result, an optional leading `icon` and an optional `trailing` mark; a long or translated label wraps onto more lines inside its container.
- States: rest, hover (a veil and a firmer edge), open (the hover paint while `aria-expanded`), as a `field` a Select's edge, recess and ring in each of them, open in its focus edge without the ring, focus (a 2px ring, flush on bordered tones and 2px off a filled one), pressed (a deeper ground, an inset shadow and a 1px sink), loading (a spinner in the tone's ink on the full fill and edge, the words at full ink, busy, and with `busyLabel` those words in place of the label, the spinner just before them and the button as wide as the wider of the label and that group), locked by `aria-disabled` (still a tab stop) and disabled (default cursor), both at 0.6 opacity, a filled or danger tone in the default paint, and a disabled `field` in an off field's well with muted words at full strength.
- Keyboard: Tab reaches it, and Enter or Space presses a button while Enter follows an anchor; a loading, locked or disabled one refuses both.
- Pointer and touch: 34px tall on a pointer and 44px on a phone or any touch screen, at least as wide as its label, and a press is never a drag; a surface may keep it drawn at 34px on a phone with `--sui-local-button-seat`, and its hit area still grows to 44px.
- Focus: pressing never moves focus, and a loading button keeps it; the caller moves focus when the press removes the button.
- Responsive: as wide as its words up to its container or 20rem, and wider words wrap onto more lines, each keeping the one-line inset, instead of scrolling the page. A surface may stretch it to a length of its own with `--sui-local-button-span`, as a dialog's footer does on a phone.
- Theming: a quiet tone rests on the raised surface, and a surface of its own may set that ground with `--sui-local-button-bg`, as a dialog's answer band does so its Cancel stands over the band in both themes.
- Accessibility: the label is the name, `loading` sets `aria-busy` and `aria-disabled`, every tone's ink holds 4.5:1 on its fill, and forced colours draw hover with a highlight edge.
- Localization: it draws no words of its own; the leading icon and the gap follow the reading direction, and directional glyphs mirror in a right-to-left page.
- Performance: one element, and only colours, the inset shadow and the 1px sink move, with no movement under reduced motion.
- Analytics: `onclick` reports each press that runs; a refused press never calls it.
- Failure: a press while loading or disabled does nothing visible beyond its state, and a label too long for one line wraps instead of being cut.
-->

{#snippet body()}
  {#if spinning.current}
    <span class="sui-button-part"><span class="sui-button-spinner" aria-hidden="true"></span></span>
  {:else if icon}
    <span class="sui-button-part">{@render icon()}</span>
  {/if}
  <span class="sui-button-label"
    >{#if swaps}<span class="sui-button-words"
        ><span class={spinning.current ? 'unsaid' : 'said'}>{@render children()}</span><span
          class={spinning.current ? 'said' : 'unsaid'}>{busyLabel}</span
        ></span
      >{:else}{@render children()}{/if}</span
  >
  {#if trailing}
    <span class="sui-button-part">{@render trailing()}</span>
  {/if}
{/snippet}

{#if href !== undefined}
  <a
    bind:this={element}
    href={unreachable ? undefined : href}
    role={unreachable ? 'link' : undefined}
    {...rest as HTMLAnchorAttributes}
    class={['sui-button', className, { busy, reserving, swapping: swaps && spinning.current }]}
    data-tone={tone}
    aria-disabled={disabled || locked || undefined}
    aria-busy={loading || undefined}
    onclick={disabled || locked ? refuse : (rest as HTMLAnchorAttributes).onclick}
    >{@render body()}</a
  >
{:else}
  <button
    bind:this={element}
    type="button"
    {...rest as HTMLButtonAttributes}
    class={[
      'sui-button',
      className,
      { busy, field, reserving, swapping: swaps && spinning.current }
    ]}
    data-tone={tone}
    disabled={disabled || holding === 'firm'}
    aria-disabled={locked || undefined}
    aria-busy={loading || undefined}
    onclick={locked ? refuse : (rest as HTMLButtonAttributes).onclick}>{@render body()}</button
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
    background-color: var(--sui-local-button-bg, var(--sui-surface-raised));
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
    inline-size: var(--sui-local-button-span, fit-content);
    justify-content: center;
    margin: 0;
    max-inline-size: var(--sui-local-button-span, min(100%, 20rem));
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

  /* An idle button that may turn busy holds half the spinner and its gap each side of its
     words, so the busy one is as wide as it was. The room is the words', not the button's
     padding, so it pads as the buttons beside it do and shares a line with them in true halves
     (L-58). */
  .reserving .sui-button-label {
    padding-inline: calc((var(--sui-icon-base) + var(--sui-space-2)) / 2);
  }

  /* Both labels take one cell, the one not said hidden, so the button keeps the wider. */
  .sui-button-words {
    display: grid;
    justify-items: center;
  }

  /* With no anchor to stand the spinner by, it takes its place in the row while busy, so idle
     the words hold its room as a reserving label does. */
  @supports not (anchor-name: --sui-button-said) {
    :not(.swapping) > .sui-button-label > .sui-button-words {
      padding-inline: calc((var(--sui-icon-base) + var(--sui-space-2)) / 2);
    }
  }

  /* Each label trims its own cap as the label does, in a box of its own, so it snaps as the
     label does and the cell stays on the pixel grid (L-95). */
  .sui-button-words > * {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    grid-area: 1 / 1;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .unsaid {
    visibility: hidden;
  }

  /* The busy words hold the spinner's room before them, so the cell keeps the wider of the
     idle words and the busy group, and a short busy word needs no room past the idle one's.
     Busy, the spinner stands in that room, and the group centres in the width the cell keeps. */
  @supports (anchor-name: --sui-button-said) {
    .sui-button-words > :last-child {
      padding-inline-start: calc(var(--sui-icon-base) + var(--sui-space-2));
    }

    .swapping {
      position: relative;
    }

    .swapping > .sui-button-part:first-child {
      inset-inline-start: anchor(--sui-button-said start);
      position: absolute;
    }

    .said {
      anchor-name: --sui-button-said;
    }
  }

  .sui-button-label {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    line-height: var(--sui-leading-meta);
    margin-block: calc((var(--sui-local-button-line) - round(up, 1cap, 2px)) / 2);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room-even);
    /* A wrapped label fills the button, so its lines start on one edge, at an icon or a mark
       when there is one. A one-line label is as wide as its words, so the button centres it. */
    text-align: start;
    text-box: trim-both cap alphabetic;
    text-wrap: balance;
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
    .sui-button:hover:not(:active, .field):not(:disabled, [aria-disabled='true']) {
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
      background-color: var(--sui-danger-fill-hover);
      border-color: var(--sui-danger-fill-hover);
    }

    .sui-button[data-tone='stop-quiet']:hover:not(:active):not(:disabled, [aria-disabled='true']) {
      --sui-control-state-layer: transparent;
      background-color: var(--sui-danger-tint);
      border-color: var(--sui-danger);
    }
  }

  /* While the layer it opens is open, the trigger keeps its hover paint, as an open select or
     icon button does, so the part the layer belongs to stays marked. */
  .sui-button[aria-expanded='true']:not(:active, :disabled, [aria-disabled='true'], .field) {
    --sui-control-state-layer: var(--sui-interactive-hover-layer);
  }

  .sui-button[aria-expanded='true']:not(
      [data-tone='ghost'],
      :active,
      :focus-visible,
      :disabled,
      [aria-disabled='true']
    ) {
    border-color: var(--sui-control-border-hover);
  }

  .sui-button[data-tone='signal'][aria-expanded='true']:not(
      :active,
      :disabled,
      [aria-disabled='true']
    ) {
    background-color: var(--sui-brand-action-hover);
    border-color: var(--sui-brand-action-hover);
  }

  .sui-button[data-tone='decision'][aria-expanded='true']:not(
      :active,
      :disabled,
      [aria-disabled='true']
    ) {
    background-color: var(--sui-decision-accent-hover);
    border-color: var(--sui-decision-accent-hover);
  }

  .sui-button[data-tone='stop'][aria-expanded='true']:not(
      :active,
      :disabled,
      [aria-disabled='true']
    ) {
    background-color: var(--sui-danger-fill-hover);
    border-color: var(--sui-danger-fill-hover);
  }

  .sui-button[data-tone='stop-quiet'][aria-expanded='true']:not(
      :active,
      :disabled,
      [aria-disabled='true']
    ) {
    --sui-control-state-layer: transparent;
    background-color: var(--sui-danger-tint);
    border-color: var(--sui-danger);
  }

  .sui-button:active:not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  /* Every tone stands its ring 2px off its edge, as a field does, so a focused Cancel beside a
     filled action wears the same ring and its edge keeps its own color (L-41). */
  .sui-button:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-button:is(:disabled, [aria-disabled='true']) {
    cursor: default;
  }

  .sui-button:is(:disabled, [aria-disabled='true']):not(.busy) {
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
    background-color: var(--sui-danger-fill);
    background-image: none;
    border-color: var(--sui-danger-fill);
    color: var(--sui-on-danger);
  }

  /* One step past hover in the same direction: deeper on light, brighter on dark (L-13). */
  .sui-button[data-tone='stop']:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-danger-pressed);
    border-color: var(--sui-danger-pressed);
  }

  .sui-button[data-tone='stop-quiet'] {
    border-color: color-mix(
      in srgb,
      var(--sui-danger) var(--sui-stop-quiet-edge-mix),
      var(--sui-control-border)
    );
    color: var(--sui-danger);
  }

  /* The press keeps the danger family the hover gave it, a step deeper, never a neutral veil. */
  .sui-button[data-tone='stop-quiet']:active:not(:disabled, [aria-disabled='true']) {
    --sui-control-state-layer: color-mix(in srgb, var(--sui-danger) 12%, transparent);
    background-color: var(--sui-danger-tint);
    border-color: var(--sui-danger);
  }

  /* A disabled tone takes the default paint, dimmed as every disabled control is, so an action
     that cannot run reads as off, never as a paler colour of itself (Radix). */
  .sui-button:is(
      [data-tone='signal'],
      [data-tone='decision'],
      [data-tone='stop'],
      [data-tone='stop-quiet']
    ):is(:disabled, [aria-disabled='true']):not(.busy) {
    background-color: var(--sui-surface-raised);
    border-color: var(--sui-control-border);
    color: var(--sui-text-primary);
  }

  /* A dash shows only half its length, so it rests at the hover edge to read as firm as a
     solid one. */
  .sui-button[data-tone='add'] {
    --sui-control-border: var(--sui-control-border-hover);

    background-color: transparent;
    border-style: dashed;
    color: var(--sui-text-primary);
  }

  .sui-button[data-tone='add']:focus-visible {
    border-style: dashed;
  }

  /* A full track under a quarter arc reads as progress even when reduced motion stops it,
     where an open ring alone reads as a letter. The track keeps 55% of the ink, so the ring
     stays whole on a coloured fill and reads beside its full-ink words. The ring stands a stroke inside the glyph's slot, so its
     bold line weighs no more than a glyph's. */
  .sui-button-spinner {
    block-size: calc(var(--sui-icon-base) - 2 * var(--sui-stroke));
    border: var(--sui-stroke-bold) solid color-mix(in srgb, currentColor 55%, transparent);
    border-block-start-color: currentColor;
    border-radius: 50%;
    box-sizing: border-box;
    flex: none;
    inline-size: calc(var(--sui-icon-base) - 2 * var(--sui-stroke));
    margin: var(--sui-stroke);
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

  /* A button that holds a value wears a Select's field edge, baseline and recess in every
     state rather than a button's, and its ring stands 2px off the frame (L-9, L-41). */
  .sui-button.field {
    --sui-control-state-layer: transparent;
    background-color: var(--sui-control-bg);
    border-color: var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess);
  }

  @media (hover: hover) {
    .sui-button.field:hover:not(:active, :disabled, [aria-disabled='true'], :focus-visible) {
      --sui-control-state-layer: transparent;
      background-color: var(--sui-field-hover);
      border-color: var(--sui-field-frame-hover);
      border-block-end-color: var(--sui-field-border-hover);
      box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess-hover);
    }
  }

  /* An open field wears its focus edge without the ring, as an open Select does, so it stands
     apart from a hovered neighbour and from keyboard focus alike. */
  .sui-button.field[aria-expanded='true']:not(
      :active,
      :disabled,
      [aria-disabled='true'],
      :focus-visible
    ) {
    --sui-control-state-layer: transparent;
    background-color: var(--sui-control-bg);
    border-color: var(--sui-field-frame-focus);
    border-block-end-color: var(--sui-field-border-focus);
    box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess-focus);
  }

  .sui-button.field:active:not(:disabled, [aria-disabled='true']) {
    box-shadow:
      inset 0 var(--sui-stroke) 0 var(--sui-field-recess),
      var(--sui-pressed-inset);
  }

  .sui-button.field:focus-visible {
    border-color: var(--sui-field-frame-focus);
    border-block-end-color: var(--sui-field-border-focus);
    box-shadow: inset 0 var(--sui-stroke) 0 var(--sui-field-recess-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  /* High contrast paints every button alike and drops the veils and recesses, so hover and an
     open layer draw the edge in the system's highlight, an open field's too, which needs its
     own selector to outrank the field's focus edge; press keeps its 1px sink. */
  /* An off field reads by its well, its missing frame and its muted words at full strength, as
     an off text field does, so its value, a picked colour included, stays legible (L-40); a
     held one dims with the work around it. */
  .sui-button.field:disabled:not([aria-disabled='true']) {
    background-color: var(--sui-field-disabled);
    border-color: transparent;
    box-shadow: none;
    color: var(--sui-text-muted);
    opacity: 1;
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-button:hover:not(:disabled, [aria-disabled='true']) {
      border-color: Highlight;
    }
  }

  @media (forced-colors: active) {
    .sui-button[aria-expanded='true']:not(:focus-visible),
    .sui-button.field[aria-expanded='true']:not(
        :active,
        :disabled,
        [aria-disabled='true'],
        :focus-visible
      ) {
      border-color: Highlight;
    }
  }
</style>
