<script module lang="ts">
  export type SelectValue = string | number;

  export type SelectOption<Value extends SelectValue = string> = {
    value: Value;
    label: string;
    /** A short note after the label, such as "10 seats". The picker shows it, the closed field does not. */
    description?: string;
    disabled?: boolean;
  };

  export type SelectGroup<Value extends SelectValue = string> = {
    /** Drawn as an uppercase heading above the group's options and read as the group's name. */
    label: string;
    options: readonly SelectOption<Value>[];
  };
</script>

<script lang="ts" generics="Value extends SelectValue = string">
  import { mark, word } from '../words.js';
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';

  let {
    value = $bindable(null),
    options,
    placeholder,
    promptLabel = word('Select.promptLabel', 'Choose an option'),
    separator = word('Select.separator', ' · '),
    optionName = word(
      'Select.optionName',
      (label: string, note: string) => `${label}${mark('comma')}${note}`
    ),
    invalid = false,
    preview = false,
    bare = false,
    element = $bindable(null),
    'aria-invalid': ariaInvalid,
    class: className = '',
    ...rest
  }: {
    value?: Value | null;
    options: readonly (SelectOption<Value> | SelectGroup<Value>)[];
    /** The prompt in a disabled first option. Without it, `promptLabel` shows while `value` is null. */
    placeholder?: string;
    /** The prompt while `value` is null and no `placeholder` is set. */
    promptLabel?: string;
    /** Set between a label and its note where the browser's own picker shows them on one line. */
    separator?: string;
    /** An option's accessible name from its label and its note. */
    optionName?: (label: string, note: string) => string;
    /** Marks the value as wrong; pass a `Field`'s `invalid` here, with its error in `aria-describedby`. */
    invalid?: boolean;
    /** Draws a static copy of the open picker under the field, with the option after the value active. */
    preview?: boolean;
    /**
     * Drops the frame, for one part of a joined field whose host draws the frame, the focus
     * ring and the error and disabled looks.
     */
    bare?: boolean;
    element?: HTMLSelectElement | null;
    /** Layout for the call site only, never the field's own paint. */
    class?: HTMLSelectAttributes['class'];
  } & Omit<HTMLSelectAttributes, 'value' | 'multiple' | 'size' | 'children' | 'class'> = $props();

  const isGroup = (item: SelectOption<Value> | SelectGroup<Value>): item is SelectGroup<Value> =>
    'options' in item;

  const prompt = $derived(placeholder ?? (value === null ? promptLabel : undefined));
  const wrong = $derived(invalid || (ariaInvalid !== undefined && String(ariaInvalid) !== 'false'));
  const flat = $derived(options.flatMap((item) => (isGroup(item) ? item.options : [item])));
  const chosen = $derived(flat.find((option) => option.value === value));
  const active = $derived.by(() => {
    if (!preview) return undefined;
    const at = chosen ? flat.indexOf(chosen) + 1 : 0;
    return [...flat.slice(at), ...flat.slice(0, at)].find((option) => !option.disabled);
  });
</script>

<!--
@component
One value from a list of six or more, on a native `<select>`. Where the browser has customizable
select and a fine pointer, the field and its picker wear SUI: the picker opens under the field in
the top layer, a note follows each label, and long labels wrap. Elsewhere, phones included, the
platform's own picker opens, and a note reads as "Team · 10 seats".

Two to five options that fit on screen are a `SegmentedControl`. When the reader types to find
the value, reach for a `Combobox`.

Every native attribute lands on the `<select>`, so `name`, `required` and `form` submit and
validate like any field. While `value` is null, or whenever `placeholder` is set, a disabled first
option holds the prompt, and `required` counts it as no answer. Name the field with a `<label>`
pointing at its `id`, or with `aria-label`, and pass a `Field`'s `invalid` to `invalid` so its
error edge shows. `preview` draws an inert copy of the open picker under the field, hidden from
assistive technology, because a native picker cannot be held open.

- Semantics: a native `<select>` with `<option>` and `<optgroup>` children, named by a `<label for>` or `aria-label`; `invalid` sets `aria-invalid`.
- Content: six or more options with short labels and optional notes, in optional headed groups; disabled options stay in view.
- States: rest (the control fill, a quiet frame and a 3:1 baseline), hover (a firmer frame), open, focus (a flush 2px ring), pressed (a deeper ground, an inset shadow and a 1px sink), invalid (a danger edge kept under focus), prompt (muted ink) and disabled (0.7 opacity); in the picker an option is active (a veil) or checked (a check mark).
- Keyboard: the browser's own select keys: Space, Enter and the arrows open it and move, typing jumps to a label, and Escape closes it.
- Pointer and touch: the trigger is 34px tall on a pointer and 44px on a phone or any touch screen, every option at least that tall, and a phone opens its own picker.
- Focus: focus stays on the trigger while the picker opens and closes.
- Responsive: the trigger is as wide as its value up to its container and cuts a long value, which the picker shows in full, wrapped.
- Accessibility: options are native, so their names, groups and states reach every screen reader; a note is in an option's name; edges hold 3:1 and words 4.5:1.
- Localization: `promptLabel`, `separator` and `optionName` are props with English defaults, the chevron and padding are logical, and the picker opens at the start edge in either direction.
- Performance: native options render once each; the open picker moves only opacity and `translate`, with no movement under reduced motion.
- Analytics: the native `onchange` reports each pick, and `bind:value` holds it.
- Failure: no options show only the prompt, a required select with no answer is refused by native validation, and a refused value keeps its danger edge.
-->

{#snippet face(label: string, description?: string)}
  <span class="sui-select-check"><Icon name="check" size="base" /></span>
  <span class="sui-select-text"
    ><span class="sui-select-label">{label}</span>{#if description}<span class="sui-select-note"
        >{separator}{description}</span
      >{/if}</span
  >
{/snippet}

{#snippet choice(option: SelectOption<SelectValue>)}
  <option
    class="sui-select-option"
    value={option.value}
    disabled={option.disabled}
    aria-label={option.description ? optionName(option.label, option.description) : undefined}
  >
    {@render face(option.label, option.description)}
  </option>
{/snippet}

{#snippet row(option: SelectOption<Value>)}
  <div
    class={['sui-select-option', { checked: option === chosen, active: option === active }]}
    aria-disabled={option.disabled || undefined}
  >
    {@render face(option.label, option.description)}
  </div>
{/snippet}

{#snippet field()}
  <span class={['sui-select', { bare }, className]}>
    <select
      bind:this={element}
      {...rest}
      class="sui-select-control"
      aria-invalid={wrong || undefined}
      bind:value={() => value ?? '', (next) => (value = next === '' ? null : next)}
    >
      <button><selectedcontent class="sui-select-value"></selectedcontent></button>
      {#if prompt !== undefined}
        <option class="sui-select-option sui-select-placeholder" value="" disabled>
          {@render face(prompt)}
        </option>
      {/if}
      {#each options as item (item)}
        {#if isGroup(item)}
          <optgroup label={item.label}>
            <legend class="sui-select-heading">{item.label}</legend>
            {#each item.options as option (option.value)}{@render choice(option)}{/each}
          </optgroup>
        {:else}
          {@render choice(item)}
        {/if}
      {/each}
    </select>
    <span class="sui-select-chevron"><Icon name="chevron-down" size="sm" /></span>
  </span>
{/snippet}

{#if preview}
  <div class="sui-select-preview">
    {@render field()}
    <div class="sui-select-sheet" aria-hidden="true" inert>
      {#if prompt !== undefined}
        <div class="sui-select-option" aria-disabled="true">{@render face(prompt)}</div>
      {/if}
      {#each options as item (item)}
        {#if isGroup(item)}
          <div class="sui-select-heading">{item.label}</div>
          {#each item.options as option (option.value)}{@render row(option)}{/each}
        {:else}
          {@render row(item)}
        {/if}
      {/each}
    </div>
  </div>
{:else}
  {@render field()}
{/if}

<style>
  .sui-select {
    display: inline-grid;
    grid-template-columns: minmax(0, auto);
    max-inline-size: 100%;
    min-inline-size: 0;
    vertical-align: middle;
  }

  .sui-select-control,
  .sui-select-chevron {
    grid-area: 1 / 1;
  }

  /* A field edge, not a button: the native select in every browser, and the base of the
     customizable one. The end padding keeps the value clear of the chevron laid over it. */
  .sui-select-control {
    appearance: none;
    background-color: var(--sui-control-bg);
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: var(--sui-stroke) solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    font: var(--sui-weight-regular) var(--sui-font-size-input) / var(--sui-leading-input)
      var(--sui-sans);
    margin: 0;
    min-inline-size: 0;
    overflow: hidden;
    padding-block: 0;
    padding-inline: var(--sui-space-2) calc(2 * var(--sui-space-2) + var(--sui-icon-sm));
    text-overflow: ellipsis;
    transition:
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-user-select: none;
    user-select: none;
    white-space: nowrap;
  }

  .sui-select-control:has(> .sui-select-placeholder:checked) {
    color: var(--sui-text-muted);
  }

  @media (hover: hover) {
    .sui-select-control:hover:not(
        :active,
        :disabled,
        :focus-visible,
        [aria-invalid='true'],
        :user-invalid
      ) {
      border-color: var(--sui-field-frame-hover);
      border-block-end-color: var(--sui-field-border-hover);
    }
  }

  .sui-select-control:active:not(:disabled) {
    background-image: linear-gradient(
      var(--sui-interactive-pressed),
      var(--sui-interactive-pressed)
    );
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-select-control:active:not(:disabled) + .sui-select-chevron {
    translate: 0 1px;
  }

  .sui-select-control:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  /* After focus, so a refused value keeps its edge under the ring, as a text field does. */
  .sui-select-control:is([aria-invalid='true'], :user-invalid) {
    border-color: var(--sui-danger);
  }

  .sui-select-control:disabled {
    cursor: default;
  }

  .sui-select-control:disabled,
  .sui-select-control:disabled + .sui-select-chevron {
    opacity: var(--sui-disabled-opacity);
  }

  /* The end of a joined field: words that finish the value's phrase, such as the unit in
     "90 seconds". No frame and no ground of its own, so a press takes the ground and the inset
     without the sink; the ink rises when a pointer or the keyboard is on it, and its own inset
     ring says that focus left the value for the unit. */
  .bare .sui-select-control,
  .bare .sui-select-control:is(:active, :focus-visible, [aria-invalid='true'], :user-invalid) {
    background-color: transparent;
    border-radius: 0;
    border-width: 0;
    color: var(--sui-text-secondary);
    margin-block: calc(-1 * var(--sui-stroke));
    padding-inline-start: var(--sui-space-1);
    translate: none;
  }

  .bare .sui-select-control:active:not(:disabled) + .sui-select-chevron {
    translate: none;
  }

  .bare .sui-select-control:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .bare .sui-select-chevron {
    transition: color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .bare:has(.sui-select-control:focus-visible) .sui-select-control,
  .bare:has(.sui-select-control:focus-visible) .sui-select-chevron {
    color: var(--sui-text-primary);
  }

  @media (hover: hover) {
    .bare:has(.sui-select-control:hover:not(:disabled)) .sui-select-control,
    .bare:has(.sui-select-control:hover:not(:disabled)) .sui-select-chevron {
      color: var(--sui-text-primary);
    }
  }

  .bare .sui-select-control:disabled,
  .bare .sui-select-control:disabled + .sui-select-chevron {
    opacity: 1;
  }

  .sui-select-chevron {
    align-self: center;
    color: var(--sui-text-muted);
    display: inline-flex;
    justify-self: end;
    margin-inline-end: var(--sui-space-2);
    pointer-events: none;
  }

  /* A phone keeps its own picker, which suits touch and screen readers better than any page can. */
  @supports (appearance: base-select) {
    @media (pointer: fine) {
      .sui-select-control,
      .sui-select-control::picker(select) {
        appearance: base-select;
      }

      .sui-select-control {
        align-items: center;
        display: flex;
      }

      .sui-select-control::picker-icon,
      .sui-select-option::checkmark {
        display: none;
      }

      .sui-select:not(.bare)
        .sui-select-control:open:not(:focus-visible, [aria-invalid='true'], :user-invalid) {
        border-color: var(--sui-field-frame-hover);
        border-block-end-color: var(--sui-field-border-hover);
      }

      /* The full label shows in the picker, so the closed field may cut it. */
      .sui-select-value {
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sui-select-value .sui-select-check,
      .sui-select-value .sui-select-note {
        display: none;
      }

      /* The browser anchors the picker under the field, flips it when the room is above, and
         holds it at least as wide as the field. */
      .sui-select-control::picker(select) {
        background: var(--sui-popover-bg);
        border: var(--sui-stroke) solid var(--sui-popover-border);
        border-radius: var(--sui-radius-popover);
        box-shadow: var(--sui-shadow-popover);
        box-sizing: border-box;
        color: var(--sui-text-primary);
        margin-block: var(--sui-space-1);
        max-block-size: min(20rem, 100% - 2 * var(--sui-space-1));
        max-inline-size: min(24rem, 100vw - 2 * var(--sui-space-2));
        opacity: 1;
        overscroll-behavior: contain;
        padding: var(--sui-space-1);
        transition:
          opacity var(--sui-duration-fast) var(--sui-ease-standard),
          translate var(--sui-duration-fast) var(--sui-ease-standard),
          overlay var(--sui-duration-fast) allow-discrete,
          display var(--sui-duration-fast) allow-discrete;
        translate: 0 0;
      }

      .sui-select-control:not(:open)::picker(select) {
        opacity: 0;
        transition-duration: var(--sui-duration-press);
      }

      @starting-style {
        .sui-select-control:open::picker(select) {
          opacity: 0;
          translate: 0 calc(-1 * var(--sui-space-1));
        }
      }
    }
  }

  /* As wide as the field or the widest row, whichever is more, as the real picker is, even
     where a container would stretch it. */
  .sui-select-preview {
    display: inline-grid;
    gap: var(--sui-space-1);
    grid-template-columns: minmax(0, auto);
    inline-size: fit-content;
    justify-items: start;
    max-inline-size: 100%;
  }

  /* The open picker, drawn in flow. */
  .sui-select-sheet {
    background: var(--sui-popover-bg);
    border: var(--sui-stroke) solid var(--sui-popover-border);
    border-radius: var(--sui-radius-popover);
    box-shadow: var(--sui-shadow-popover);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    justify-self: stretch;
    max-inline-size: 24rem;
    padding: var(--sui-space-1);
  }

  /* Rows of the picker and of the preview's copy. A browser with the native picker reads only
     the colors and the font here. */
  .sui-select-option {
    align-items: center;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    font: var(--sui-weight-medium) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
    min-block-size: var(--sui-control-height-compact);
    padding: var(--sui-space-1) var(--sui-space-3);
    transition: background-color var(--sui-duration-fast) var(--sui-ease-standard);
    white-space: normal;
  }

  .sui-select-option:is(:focus-visible, .active):not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-row-hover);
  }

  @media (hover: hover) {
    .sui-select-option:hover:not(:disabled, [aria-disabled='true']) {
      background-color: var(--sui-row-hover);
    }

    .sui-select-option:hover .sui-select-note {
      color: var(--sui-text-secondary);
    }
  }

  .sui-select-option:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-select-option:is(:disabled, [aria-disabled='true']) {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  .sui-select-check {
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-icon-base);
    justify-content: center;
  }

  .sui-select-option:not(:checked, .checked) .sui-select-check {
    visibility: hidden;
  }

  /* The name runs cap line to baseline, so the row's room above and under it match (L-102). */
  .sui-select-text {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-select-note {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
  }

  /* Muted ink drops under 4.5:1 on the active row's veil. */
  .sui-select-option:is(:focus-visible, .active) .sui-select-note {
    color: var(--sui-text-secondary);
  }

  .sui-select-heading {
    color: var(--sui-text-muted);
    font: var(--sui-weight-semibold) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-sans);
    letter-spacing: 0.06em;
    padding: var(--sui-space-2) var(--sui-space-3) var(--sui-space-1);
    text-transform: uppercase;
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-select-control,
    .sui-select-option,
    .bare .sui-select-chevron {
      transition: none;
    }

    .sui-select-control:active:not(:disabled),
    .sui-select-control:active:not(:disabled) + .sui-select-chevron {
      translate: none;
    }

    /* Apart, because a browser without the picker drops a whole list that names it. */
    .sui-select-control::picker(select) {
      transition: none;
    }
  }

  /* High contrast drops the veils, so the active and hovered rows draw an edge instead, and
     paints every edge in one colour, so an invalid trigger says so with a 2px edge. */
  @media (forced-colors: active) {
    .sui-select:not(.bare) .sui-select-control:is([aria-invalid='true'], :user-invalid) {
      border-width: var(--sui-stroke-bold);
    }

    .sui-select-option:is(:focus-visible, .active) {
      outline: var(--sui-stroke) solid Highlight;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }

  @media (hover: hover) and (forced-colors: active) {
    .sui-select-option:hover:not(:disabled, [aria-disabled='true']) {
      outline: var(--sui-stroke) solid Highlight;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }
</style>
