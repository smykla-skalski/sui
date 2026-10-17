<script module lang="ts">
  export type SettingRowControl = {
    /** Put this on a single control so the setting's name labels it. */
    id: string;
    /** The name's id, for the `aria-labelledby` of a group of controls. */
    labelledby: string;
    /** The why line's, reason's and problem's ids, for the control's `aria-describedby`. */
    describedby: string | undefined;
    /** Pass to the control: it cannot run while the row is `disabled`. */
    disabled: boolean;
    /** Pass to the control: the value shows and cannot change. */
    readonly: boolean;
    /** Pass to the control as its invalid state while the row shows a problem. */
    invalid: boolean;
  };
</script>

<script lang="ts">
  import { word } from '../words.js';
  import { tick, type Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Button from './Button.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();
  const FOCUSABLE =
    "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex^='-'])";

  let {
    name,
    why,
    unsaved = false,
    onclear,
    resettable = false,
    pending = false,
    error = null,
    disabled = false,
    readonly = false,
    reason,
    clearLabel,
    resetLabel = word('SettingRow.resetLabel', 'Reset'),
    undoLabel = word('SettingRow.undoLabel', 'Undo'),
    unsavedLabel = word('SettingRow.unsavedLabel', 'Unsaved'),
    pendingLabel = word('SettingRow.pendingLabel', 'Saving…'),
    control,
    class: className = '',
    ...rest
  }: {
    name: string;
    /** One quiet sentence under the name about what the setting does. */
    why?: string;
    /** Repaints the row while its value differs from the saved one. Only the caller can know that. */
    unsaved?: boolean;
    /**
     * Draws a reset beside the whole control area, which takes the setting back where it came
     * from. Return a function that puts the change back, and the row offers Undo after a reset.
     */
    onclear?: () => void | (() => void);
    /**
     * Keeps the reset's seat while `onclear` is unset, for a row that offers a reset only while
     * it is changed, so the controls never move when the reset comes and goes.
     */
    resettable?: boolean;
    /** A change that takes effect at once is on its way, such as a switch writing its value. */
    pending?: boolean;
    /** Why the last change was refused, said under the copy with an alert mark. */
    error?: string | null;
    /** The controls cannot run now, such as during a save. Say why with `reason`. */
    disabled?: boolean;
    /** The value shows and cannot change here, such as without permission. Say why with `reason`. */
    readonly?: boolean;
    /** Why the setting is disabled or read only, drawn under the copy and tied to the controls. */
    reason?: string;
    /** Names the reset. It defaults to `resetLabel` and the setting's name. */
    clearLabel?: string;
    resetLabel?: string;
    undoLabel?: string;
    /** The word beside the name while the row is unsaved. */
    unsavedLabel?: string;
    pendingLabel?: string;
    /** The setting's controls, at the row's end beside the copy or on the line under it. */
    control: Snippet<[SettingRowControl]>;
    /** Layout for the call site only, never the row's own paint. */
    class?: HTMLLiAttributes['class'];
  } & Omit<HTMLLiAttributes, 'children' | 'class'> = $props();

  let controls = $state<HTMLDivElement | null>(null);
  let seat = $state<HTMLElement | null>(null);
  /* Puts back the change the last reset dropped, until the reader changes the value again. */
  let undo = $state<(() => void) | null>(null);
  /* A `<label for>` names only a control that carries `id`; a group is named by the name's id. */
  let named = $state(false);

  const ids = $derived<SettingRowControl>({
    id: `${uid}-control`,
    labelledby: `${uid}-name`,
    describedby:
      [why && `${uid}-why`, reason && `${uid}-reason`, error && `${uid}-problem`]
        .filter(Boolean)
        .join(' ') || undefined,
    disabled,
    readonly,
    invalid: Boolean(error)
  });

  $effect(() => {
    if (unsaved) undo = null;
  });

  $effect(() => {
    const box = controls;
    if (!box) return;
    const look = () => (named = box.querySelector(`[id="${ids.id}"]`) !== null);
    look();
    const watch = new MutationObserver(look);
    watch.observe(box, { childList: true, subtree: true, attributeFilter: ['id'] });
    return () => watch.disconnect();
  });

  const firstControl = () => controls?.querySelector<HTMLElement>(FOCUSABLE);

  // A reset leaves with the change it reset, so focus moves on to the control it reset instead
  // of falling to the page (L-89); Undo is the next stop after it.
  async function clear(event: MouseEvent): Promise<void> {
    const reset = event.currentTarget;
    const back = onclear?.();
    undo = typeof back === 'function' ? back : null;
    await tick();
    if (onclear && !undo && document.activeElement === reset) return;
    if (![reset, document.body].includes(document.activeElement)) return;
    firstControl()?.focus();
  }

  async function restore(): Promise<void> {
    undo?.();
    undo = null;
    await tick();
    (seat?.querySelector<HTMLElement>('.sui-setting-reset-live button') ?? firstControl())?.focus();
  }
</script>

<!--
@component
One setting in a `SettingList`: its name and an optional why line on one side, 8px apart as
rendered ink, and its controls on the other. The row measures itself, so the copy keeps at least
13rem and neither side takes more than half the row; when both cannot fit, the controls move to
the line under the copy and pack to the start. A row whose only control is a `Switch` or a
`Checkbox` keeps it beside the copy at every width; give that control `bare`. A switch takes
effect at once, and a checkbox holds a value that a later save writes.

`unsaved` lays a plate of the unsaved surface inside the row, repaints the inks and edges in the
unsaved family, and shows `unsavedLabel` beside the name. The plate sits 2px inside the row's
own box and the word keeps its seat while hidden, so a change of state never moves the row,
changes its height or rewraps its name, and two changed rows in a row show a 5px strip of card
between them (L-91).

- Semantics: an `li`; the name is a `label` for a single control that carries the given `id`, and otherwise a plain name whose id the group takes through `aria-labelledby`.
- Content: a name, an optional one-sentence why line, and the controls in `control`, which receives the ids and the `disabled`, `readonly` and `invalid` flags to pass on.
- States: rest, unsaved (gold plate and the `unsavedLabel` word), pending (`pendingLabel` under the copy, busy), refused (`error` under the copy with an alert mark), disabled and read only (with `reason` under the copy), and after a reset an Undo in the reset's seat.
- Keyboard: Tab walks the controls, then the reset or Undo; Enter or Space resets or undoes.
- Pointer and touch: the row is at least 44px tall; the reset and Undo are 34px buttons, 44px on a phone.
- Focus: after a reset focus moves to the first control instead of falling to the page; after Undo it moves to the reset, or to the first control when the reset is gone.
- Responsive: the controls drop under the copy when both sides cannot fit, and pack to the start under 25rem.
- Accessibility: the name labels a single control or names a group; the why line, `reason` and `error` describe the controls; pending and refused changes are said through a polite status; the unsaved state is a word, not only a color.
- Localization: `resetLabel`, `undoLabel`, `unsavedLabel`, `pendingLabel` and `clearLabel` are props with English defaults; the controls sit at the inline end and follow the reading direction.
- Performance: one mutation observer per row watches which control carries the id; nothing animates.
- Analytics: `onclear` hears each reset, and the function it returns hears each undo.
- Failure: a refused change says `error` and marks the controls invalid while the value stays as the reader set it; a disabled or read-only row says `reason`, and its reset goes away.
-->

<li
  {...rest}
  class={['sui-setting-row', className]}
  data-unsaved={unsaved || undefined}
  aria-busy={pending || undefined}
>
  <div class="sui-setting-say">
    <svelte:element
      this={named ? 'label' : 'span'}
      id={ids.labelledby}
      for={named ? ids.id : undefined}
      class="sui-setting-name"
      >{name}<span class="sui-setting-mark"><VisuallyHidden>,</VisuallyHidden>{unsavedLabel}</span
      ></svelte:element
    >
    {#if why}<p id="{uid}-why" class="sui-setting-why">{why}</p>{/if}
    {#if reason}<p id="{uid}-reason" class="sui-setting-why">{reason}</p>{/if}
    {#if error}
      <p id="{uid}-problem" class="sui-setting-problem">
        <Icon name="alert" size="sm" /><span>{error}</span>
      </p>
    {:else if pending}
      <p class="sui-setting-why">{pendingLabel}</p>
    {/if}
    <VisuallyHidden role="status">{error ?? (pending ? pendingLabel : '')}</VisuallyHidden>
  </div>
  <div class="sui-setting-value">
    <div bind:this={controls} class="sui-setting-control">{@render control(ids)}</div>
    {#if onclear || resettable || undo}
      {@const live = Boolean(onclear) && !undo && !disabled && !readonly}
      <span bind:this={seat} class="sui-setting-reset">
        <span class={{ idle: !live, 'sui-setting-reset-live': live }} inert={!live}>
          <Button tone="ghost" aria-label={clearLabel ?? `${resetLabel} ${name}`} onclick={clear}>
            {#snippet icon()}<Icon name="undo" size="sm" />{/snippet}
            {resetLabel}
          </Button>
        </span>
        <span class={{ idle: !undo }} inert={!undo}>
          <Button tone="ghost" aria-label="{undoLabel}, {name}" onclick={restore}>
            {undoLabel}
          </Button>
        </span>
      </span>
    {/if}
  </div>
</li>

<style>
  /* The row is its own size container, so half of it is a definite length (`50cqi`) when the
     flex line decides whether both sides fit, which a percentage is not. */
  .sui-setting-row {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    column-gap: var(--sui-space-4);
    container-type: inline-size;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    min-block-size: var(--sui-touch-target);
    min-inline-size: 0;
    /* The bottom carries the hairline's pixel on top of the padding, so the ink stands 12px
       off the line below it as off the line above. */
    padding: var(--sui-row-pad-default) var(--sui-space-2)
      calc(var(--sui-row-pad-default) + var(--sui-row-hairline));
    position: relative;
    row-gap: var(--sui-space-2);
  }

  /* A state's plate lies inside the row's own box, 2px short of its top and bottom, so the row
     never moves or resizes when its state changes and keeps 10px of ground above and below its
     ink, and two plates in a row show a 5px strip of card between them (L-91). It comes first
     in the row, so the copy and controls, positioned after it, paint over it. */
  .sui-setting-row::before {
    border-radius: inherit;
    content: '';
    inset: calc(var(--sui-space-1) / 2) 0 calc(var(--sui-space-1) / 2 + var(--sui-row-hairline));
    position: absolute;
  }

  .sui-setting-say,
  .sui-setting-value {
    position: relative;
  }

  .sui-setting-row:not(:last-child)::after {
    background: var(--sui-border-divider);
    block-size: var(--sui-row-hairline);
    content: '';
    inset-block-end: 0;
    inset-inline: var(--sui-space-2);
    position: absolute;
  }

  /* A change is a state of the row it was made in: its plate, inks, edges, fills, hover and
     press all take the unsaved hue, and no edge changes width, so nothing moves (L-16). The
     tokens are set here one by one because the derived ones resolve at the root. */
  .sui-setting-row[data-unsaved] {
    --sui-text-primary: var(--sui-unsaved-ink);
    --sui-text-secondary: var(--sui-unsaved-secondary);
    --sui-text-muted: var(--sui-unsaved-secondary);
    --sui-control-bg: var(--sui-unsaved-control);
    --sui-input-bg: var(--sui-unsaved-control);
    --sui-control-border: var(--sui-unsaved-control-border);
    --sui-control-border-hover: var(--sui-unsaved-border);
    --sui-field-frame: var(--sui-unsaved-control-border);
    --sui-field-frame-hover: var(--sui-unsaved-border);
    --sui-field-border: var(--sui-unsaved-field-border);
    --sui-field-border-hover: var(--sui-unsaved-field-border-hover);
    --sui-border-strong: var(--sui-unsaved-field-border);
    --sui-switch-track-off-border: var(--sui-unsaved-field-border);
    --sui-brand-action: var(--sui-decision-accent);
    --sui-brand-action-hover: var(--sui-decision-accent-hover);
    --sui-brand-action-pressed: var(--sui-decision-accent-pressed);
    --sui-brand-action-text: var(--sui-unsaved-ink);
    --sui-brand-action-tint: var(--sui-unsaved-control);
    --sui-on-brand-action: var(--sui-on-decision-accent);
    --sui-switch-track-on: var(--sui-decision-accent);
    --sui-segment-thumb: var(--sui-decision-accent);
    --sui-segment-thumb-ink: var(--sui-on-decision-accent);
    --sui-interactive-hover-layer: color-mix(in srgb, var(--sui-unsaved-ink) 10%, transparent);
    --sui-interactive-pressed: color-mix(in srgb, var(--sui-unsaved-ink) 16%, transparent);
  }

  .sui-setting-row[data-unsaved]::before {
    background-color: var(--sui-unsaved-surface);
  }

  /* The changed fill is its own boundary, so the separators on both its edges go, and keep
     their pixel so nothing moves. */
  .sui-setting-row[data-unsaved]::after,
  .sui-setting-row:has(+ :global([data-unsaved]))::after {
    background: transparent;
  }

  /* The copy takes what is left and never less than it reads at, unless the row itself is
     narrower than that. */
  /* An even column, so a control centred beside it lands on whole pixels (L-95). */
  .sui-setting-say {
    block-size: var(--sui-block-snap-even);
    display: grid;
    flex: 1 1 var(--sui-setting-say-min);
    gap: var(--sui-row-copy-gap);
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: min(var(--sui-setting-say-min), 100%);
  }

  .sui-setting-name,
  .sui-setting-why,
  .sui-setting-problem > span {
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-setting-name {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
    text-wrap: balance;
  }

  .sui-setting-why {
    color: var(--sui-text-muted);
    text-wrap: pretty;
  }

  .sui-setting-problem {
    align-items: center;
    color: var(--sui-danger);
    display: flex;
    gap: var(--sui-space-1);
    margin: 0;
    min-inline-size: 0;
  }

  /* Always laid out, shown only while unsaved, so its arrival never rewraps the name. A word
     rather than a star, which most forms use for a required field. */
  .sui-setting-mark {
    color: var(--sui-unsaved-ink);
    font-weight: var(--sui-weight-regular);
    margin-inline-start: var(--sui-space-2);
    visibility: hidden;
  }

  [data-unsaved] .sui-setting-mark {
    visibility: visible;
  }

  /* Reset and Undo share one seat as wide as the wider of them, so neither moves the controls,
     and the seat never gives up width, so neither word breaks. */
  .sui-setting-reset {
    display: grid;
    flex: none;
  }

  .sui-setting-reset > * {
    display: flex;
    grid-area: 1 / 1;
    justify-content: center;
  }

  .idle {
    visibility: hidden;
  }

  /* Neither side takes more than half the row, unless a control cannot be drawn narrower. */
  .sui-setting-value {
    align-items: center;
    display: flex;
    flex: 0 1 auto;
    gap: var(--sui-space-2);
    justify-content: flex-end;
    max-inline-size: 50cqi;
    min-inline-size: min-content;
  }

  .sui-setting-control {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-content: flex-end;
  }

  /* A lone switch or checkbox needs a small fixed seat: its copy wraps beside it rather than
     pushing it onto a line of its own. */
  .sui-setting-row:has(
      > .sui-setting-value
        > .sui-setting-control
        > :global(:only-child > * > input[type='checkbox'])
    )
    > .sui-setting-say {
    flex-basis: 0;
    min-inline-size: 0;
  }

  .sui-setting-row:has(
      > .sui-setting-value
        > .sui-setting-control
        > :global(:only-child > * > input[type='checkbox'])
    )
    > .sui-setting-value {
    flex: none;
  }

  /* Below a sentence plus the narrowest control there is no other side to share the row
     with, so the controls take the whole line and pack to its start. */
  @container (max-width: 25rem) {
    .sui-setting-value {
      max-inline-size: 100%;
    }

    .sui-setting-control {
      justify-content: flex-start;
    }
  }

  /* High contrast drops the plate's ground, so a changed row keeps an outline of it. */
  @media (forced-colors: active) {
    .sui-setting-row[data-unsaved]::before {
      outline: var(--sui-stroke) solid CanvasText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
