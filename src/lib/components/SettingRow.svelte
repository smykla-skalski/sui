<script module lang="ts">
  export type SettingRowControl = {
    /** Put this on a single control so the setting's name labels it. */
    id: string;
    /** The name's id, for the `aria-labelledby` of a group of controls. */
    labelledby: string;
    /** The why line's id, for the control's `aria-describedby`. */
    describedby: string | undefined;
  };
</script>

<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';
  import IconButton from './IconButton.svelte';

  const uid = $props.id();

  let {
    name,
    why,
    unsaved = false,
    onclear,
    resettable = false,
    clearLabel,
    control,
    class: className = '',
    ...rest
  }: {
    name: string;
    /** One quiet sentence under the name about what the setting does. */
    why?: string;
    /** Repaints the row while its value differs from the saved one. Only the caller can know that. */
    unsaved?: boolean;
    /** Draws a reset beside the whole control area, which takes the setting back where it came from. */
    onclear?: () => void;
    /**
     * Keeps the reset's seat while `onclear` is unset, for a row that offers a reset only while
     * it is changed, so the controls never move when the reset comes and goes.
     */
    resettable?: boolean;
    /** Names the reset. It defaults to "Reset" and the setting's name. */
    clearLabel?: string;
    /** The setting's controls, at the row's end beside the copy or on the line under it. */
    control: Snippet<[SettingRowControl]>;
    /** Layout for the call site only, never the row's own paint. */
    class?: HTMLLiAttributes['class'];
  } & Omit<HTMLLiAttributes, 'children' | 'class'> = $props();

  let controls = $state<HTMLDivElement | null>(null);

  // A reset that only shows while changed leaves with the change, so focus moves on to the
  // control it reset instead of falling to the page (L-89).
  async function clear(event: MouseEvent): Promise<void> {
    const reset = event.currentTarget;
    onclear?.();
    await tick();
    if (onclear || ![reset, document.body].includes(document.activeElement)) return;
    controls
      ?.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex^='-'])"
      )
      ?.focus();
  }

  const ids = $derived<SettingRowControl>({
    id: `${uid}-control`,
    labelledby: `${uid}-name`,
    describedby: why ? `${uid}-why` : undefined
  });
</script>

<!--
@component
One setting in a `SettingList`: its name and an optional why line on one side, 8px apart as
rendered ink, and its controls on the other. The row measures itself, so the copy keeps at least
13rem and neither side takes more than half the row; when both cannot fit, the controls move to
the line under the copy and pack to the start. A row whose only control is a `Switch` or a
`Checkbox` keeps it beside the copy at every width; give that control `bare`. A switch takes
effect at once, and a checkbox holds a value that a later save writes.

`control` receives the `id` the name's `<label for>` points at, for a single control, and
`labelledby`, the name's own id, for the `aria-labelledby` of a group such as a fieldset or a
segmented control, which a `<label>` cannot name.
`unsaved` lays a plate of the unsaved surface inside the row, repaints the inks, stars its name
and clears the separators on both its edges. The plate sits 2px inside the row's own box and the
star keeps its seat while hidden, so a change of state never moves the row, changes its height
or rewraps its name, and two changed rows in a row show a 5px strip of card between them (L-91). `onclear` draws a reset centred beside the whole control area,
even when the controls wrap; a row that offers it only while changed passes `resettable` too, so
the reset's seat stays and the controls never shift.
-->

<li {...rest} class={['sui-setting-row', className]} data-unsaved={unsaved || undefined}>
  <div class="sui-setting-say">
    <label id={ids.labelledby} for={ids.id} class="sui-setting-name"
      >{name}<span class="sui-setting-star" aria-hidden="true">*</span>{#if unsaved}<span
          class="sui-visually-hidden">, unsaved</span
        >{/if}</label
    >
    {#if why}<p id={ids.describedby} class="sui-setting-why">{why}</p>{/if}
  </div>
  <div class="sui-setting-value">
    <div bind:this={controls} class="sui-setting-control">{@render control(ids)}</div>
    {#if onclear || resettable}
      <span class={['sui-setting-reset', { idle: !onclear }]} inert={!onclear}>
        <IconButton icon="undo" label={clearLabel ?? `Reset ${name}`} onclick={clear} />
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
     ink, and two plates in a row show a 5px strip of card between them (L-91). */
  .sui-setting-row::before {
    border-radius: inherit;
    content: '';
    inset: calc(var(--sui-space-1) / 2) 0 calc(var(--sui-space-1) / 2 + var(--sui-row-hairline));
    position: absolute;
    z-index: 0;
  }

  /* The plate and the row's two sides stack inside the row alone: plate, then copy and controls. */
  .sui-setting-row {
    isolation: isolate;
  }

  .sui-setting-say,
  .sui-setting-value {
    position: relative;
    z-index: 1;
  }

  .sui-setting-row:not(:last-child)::after {
    background: var(--sui-border-divider);
    block-size: var(--sui-row-hairline);
    content: '';
    inset-block-end: 0;
    inset-inline: var(--sui-space-2);
    position: absolute;
  }

  /* A change is a state of the row it was made in: its plate, inks, edges and fills all take the
     unsaved hue, and no edge changes width, so nothing moves (L-16). The tokens are set here one
     by one because the derived ones resolve at the root. */
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
  .sui-setting-say {
    display: grid;
    flex: 1 1 var(--sui-setting-say-min);
    gap: var(--sui-row-copy-gap);
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: min(var(--sui-setting-say-min), 100%);
  }

  .sui-setting-name,
  .sui-setting-why {
    block-size: var(--sui-block-snap);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-setting-name {
    color: var(--sui-text-primary);
    font-weight: 600;
    text-wrap: balance;
  }

  .sui-setting-why {
    color: var(--sui-text-muted);
    text-wrap: pretty;
  }

  /* Always laid out, shown only while unsaved, so its arrival never rewraps the name. */
  .sui-setting-star {
    color: var(--sui-unsaved-ink);
    margin-inline-start: var(--sui-space-1);
    visibility: hidden;
  }

  [data-unsaved] .sui-setting-star {
    visibility: visible;
  }

  .sui-setting-reset {
    display: flex;
  }

  .idle {
    visibility: hidden;
  }

  .sui-visually-hidden {
    block-size: 1px;
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
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
</style>
