<script module lang="ts">
  export type SelectValue = string | number;

  export type SelectOption<Value extends SelectValue = string> = {
    value: Value;
    label: string;
    /** A short note set after the label on the same line, so the row stays 34px. */
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
  import { tick } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Popover from './Popover.svelte';

  const uid = $props.id();
  const TYPEAHEAD_PAUSE = 500;

  let {
    value = $bindable(null),
    options,
    placeholder = 'Choose an option',
    name,
    form,
    disabled = false,
    preview = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    value?: Value | null;
    options: readonly (SelectOption<Value> | SelectGroup<Value>)[];
    /** Shown in muted ink while nothing is chosen. */
    placeholder?: string;
    /** Submits the value with its form through a hidden input. */
    name?: string;
    form?: string;
    disabled?: boolean;
    /** Draws the list open under the trigger in the page's flow, with the option after the value active and no keyboard. */
    preview?: boolean;
    element?: HTMLButtonElement | null;
    class?: HTMLButtonAttributes['class'];
  } & Omit<
    HTMLButtonAttributes,
    'value' | 'name' | 'form' | 'type' | 'role' | 'children' | 'disabled' | 'class'
  > = $props();

  type Entry = { option: SelectOption<Value>; index: number };

  const popupId = `${uid}-popup`;
  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  const sections = $derived.by(() => {
    let index = 0;
    return options.map((item, at) => {
      const group = 'options' in item ? item : undefined;
      const members = group ? group.options : [item as SelectOption<Value>];
      return {
        key: `${uid}-group-${at}`,
        heading: group?.label,
        entries: members.map((option): Entry => ({ option, index: index++ }))
      };
    });
  });
  const flat = $derived(sections.flatMap((section) => section.entries.map(({ option }) => option)));
  const selected = $derived(flat.findIndex((option) => option.value === value));
  const listLabel = $derived(
    rest['aria-label'] ??
      ([...(element?.labels ?? [])]
        .map((label) => label.textContent?.trim())
        .filter(Boolean)
        .join(' ') ||
        placeholder)
  );

  let open = $state(false);
  let active = $state(-1);
  const expanded = $derived(preview || open);
  const current = $derived(preview ? step(selected, 1) : active);
  let list = $state<HTMLElement | null>(null);
  let typed = '';
  let typedAt = 0;

  /** The next enabled option from `from`, wrapping; `from` may sit one past either end. */
  function step(from: number, by: 1 | -1): number {
    const count = flat.length;
    for (let distance = 1; distance <= count; distance++) {
      const at = (((from + by * distance) % count) + count) % count;
      if (!flat[at].disabled) return at;
    }
    return -1;
  }

  const first = () => step(-1, 1);
  const last = () => step(flat.length, -1);

  function seek(key: string, at: number): number {
    typed = at - typedAt > TYPEAHEAD_PAUSE ? key : typed + key;
    typedAt = at;
    const needle = typed.toLowerCase();
    const from = typed.length === 1 ? active + 1 : Math.max(active, 0);
    for (let distance = 0; distance < flat.length; distance++) {
      const index = (from + distance) % flat.length;
      if (!flat[index].disabled && flat[index].label.toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  }

  // Scrolls the list alone: the box is fixed in the top layer, and scrollIntoView could move the page.
  function reveal(): void {
    const row = document.getElementById(optionId(active));
    if (!list || !row) return;
    const view = list.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    if (box.top < view.top) list.scrollTop -= view.top - box.top;
    else if (box.bottom > view.bottom) list.scrollTop += box.bottom - view.bottom;
  }

  async function show(index: number): Promise<void> {
    if (index < 0) return;
    // Safari does not focus a pressed button, and the keyboard model lives on the trigger.
    element?.focus({ preventScroll: true });
    active = index;
    open = true;
    await tick();
    reveal();
  }

  function move(index: number): void {
    if (index < 0) return;
    active = index;
    reveal();
  }

  function commit(index: number): void {
    const option = flat[index];
    if (!option || option.disabled || preview) return;
    value = option.value;
    open = false;
  }

  const printable = (event: KeyboardEvent) =>
    event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

  function onkeydown(event: KeyboardEvent): void {
    const { key } = event;
    if (!open) {
      if (key === 'ArrowDown' || key === 'Enter' || key === ' ')
        void show(selected >= 0 ? selected : first());
      else if (key === 'ArrowUp') void show(selected >= 0 ? selected : last());
      else if (key === 'Home') void show(first());
      else if (key === 'End') void show(last());
      else if (printable(event)) {
        active = selected;
        void show(seek(key, event.timeStamp));
      } else return;
      event.preventDefault();
      return;
    }
    if (key === 'ArrowDown') move(step(active, 1));
    else if (key === 'ArrowUp') move(step(active, -1));
    else if (key === 'Home') move(first());
    else if (key === 'End') move(last());
    else if (key === 'Enter' || key === ' ') commit(active);
    else if (key === 'Escape') {
      event.stopPropagation();
      open = false;
    } else if (key === 'Tab') {
      open = false;
      return;
    } else if (printable(event)) move(seek(key, event.timeStamp));
    else return;
    event.preventDefault();
  }

  // Space activates a button on keyup in some engines; the keydown above already handled it.
  function onkeyup(event: KeyboardEvent): void {
    if (event.key === ' ') event.preventDefault();
  }

  // `popovertarget` stays on the trigger so the browser treats it as the invoker and never
  // light-dismisses on it, but the click is handled here so every path runs through `show`.
  function onclick(event: MouseEvent): void {
    event.preventDefault();
    if (open) open = false;
    else void show(selected >= 0 ? selected : first());
  }
</script>

<!--
@component
A choice of one value from a fixed list, drawn as the shared button with the chosen label and a
chevron, and a themed listbox that opens beneath it. It replaces the native `<select>`, whose
menu cannot be themed. Reach for `Combobox` when the reader types to find the value, and for a
segmented control when there are two to five options that fit on screen.

Focus never leaves the trigger: the active option is announced through
`aria-activedescendant`. Arrows wrap, Home and End jump, typing a name jumps to it, Enter or
Space commits, and Escape closes without closing a surrounding dialog. Name it with a `<label>`
pointing at its `id`, or with `aria-label`. `name` submits the value through a hidden input.
-->

{#snippet row({ option, index }: Entry)}
  <!-- Keys are handled on the trigger, which keeps focus while an option is active. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    id={optionId(index)}
    role="option"
    tabindex="-1"
    class={['sui-select-option', { active: index === current }]}
    aria-selected={index === selected}
    aria-disabled={option.disabled || undefined}
    onclick={() => commit(index)}
    onpointermove={() => {
      if (!option.disabled) active = index;
    }}
  >
    <span class="sui-select-check">
      {#if index === selected}<Icon name="check" size="base" />{/if}
    </span>
    <span class="sui-select-label">{option.label}</span>
    {#if option.description}<span class="sui-select-note">{option.description}</span>{/if}
  </div>
{/snippet}

{#snippet control()}
  <button
    bind:this={element}
    type="button"
    {...rest}
    class={['sui-select', className]}
    role="combobox"
    aria-haspopup={preview ? undefined : 'listbox'}
    aria-expanded={expanded}
    aria-controls={listId}
    aria-activedescendant={expanded && current >= 0 ? optionId(current) : undefined}
    popovertarget={preview ? undefined : popupId}
    {disabled}
    onclick={preview ? undefined : onclick}
    onkeydown={preview ? undefined : onkeydown}
    {onkeyup}
    onblur={() => (open = false)}
  >
    <span class={['sui-select-value', { placeholder: selected < 0 }]}>
      {selected < 0 ? placeholder : flat[selected].label}
    </span>
    <Icon name="chevron-down" size="sm" />
  </button>

  <Popover
    id={popupId}
    anchor={element}
    bind:open
    inline={preview}
    width="min-trigger"
    onmousedown={(event: MouseEvent) => event.preventDefault()}
  >
    <div
      bind:this={list}
      id={listId}
      role="listbox"
      tabindex="-1"
      class="sui-select-list"
      aria-label={rest['aria-labelledby'] ? undefined : listLabel}
      aria-labelledby={rest['aria-labelledby']}
    >
      {#each sections as section (section.key)}
        {#if section.heading === undefined}
          {#each section.entries as entry (entry.index)}{@render row(entry)}{/each}
        {:else}
          <div role="group" class="sui-select-group" aria-labelledby={section.key}>
            <div id={section.key} role="presentation" class="sui-select-heading">
              {section.heading}
            </div>
            {#each section.entries as entry (entry.index)}{@render row(entry)}{/each}
          </div>
        {/if}
      {/each}
    </div>
  </Popover>
{/snippet}

{#if preview}
  <div class="sui-select-preview">{@render control()}</div>
{:else}
  {@render control()}
{/if}
{#if name}
  <input type="hidden" {name} {form} {disabled} value={value ?? ''} />
{/if}

<style>
  /* Registered so the state veil can interpolate, the same way `Button` does it. */
  @property --sui-control-state-layer {
    syntax: '<color>';
    inherits: false;
    initial-value: transparent;
  }

  .sui-select-preview {
    display: inline-grid;
    gap: var(--sui-space-1);
    grid-template-columns: minmax(0, auto);
    inline-size: fit-content;
    max-inline-size: 100%;
  }

  .sui-select {
    --sui-control-state-layer: transparent;
    align-items: center;
    background-color: var(--sui-control-bg);
    background-image: linear-gradient(
      var(--sui-control-state-layer),
      var(--sui-control-state-layer)
    );
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 1px solid var(--sui-control-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: inline-flex;
    font: 500 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
    gap: var(--sui-space-2);
    inline-size: fit-content;
    margin: 0;
    max-inline-size: 100%;
    min-inline-size: 0;
    padding: 0 var(--sui-space-3);
    touch-action: manipulation;
    transition:
      --sui-control-state-layer var(--sui-duration-fast) var(--sui-ease-standard),
      border-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard),
      box-shadow var(--sui-duration-press) var(--sui-ease-standard);
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  /* Ellipsis clips its box, so the trimmed label gets room for descenders without changing
     the control's height. */
  .sui-select-value {
    margin-block: calc(-1 * var(--sui-space-1));
    min-inline-size: 0;
    overflow: hidden;
    padding-block: var(--sui-space-1);
    text-box: trim-both cap alphabetic;
    text-overflow: ellipsis;
  }

  .placeholder {
    color: var(--sui-text-muted);
  }

  .sui-select > :global(svg) {
    color: var(--sui-text-muted);
    margin-inline-end: calc(-1 * var(--sui-icon-ink-end, 0px));
  }

  .sui-select:hover:not(:active):not(:disabled),
  .sui-select[aria-expanded='true']:not(:active) {
    --sui-control-state-layer: var(--sui-interactive-hover-layer);
  }

  .sui-select:hover:not(:disabled):not(:focus-visible),
  .sui-select[aria-expanded='true']:not(:focus-visible) {
    border-color: var(--sui-control-border-hover);
  }

  .sui-select:active:not(:disabled) {
    --sui-control-state-layer: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-select:focus-visible {
    border-color: var(--sui-focus);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-flush);
  }

  .sui-select:disabled {
    cursor: default;
    opacity: 0.5;
  }

  /* The popover's own 1px border sits outside this list, so the box as a whole stops at
     min(20rem, the room it has). */
  .sui-select-list {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-block-size: calc(min(20rem, var(--sui-floating-available-block)) - 2px);
    max-inline-size: max(24rem, var(--sui-floating-anchor-inline));
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--sui-space-1);
    row-gap: 2px;
  }

  .sui-select-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: 2px;
  }

  .sui-select-heading {
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-tight) var(--sui-sans);
    letter-spacing: 0.07em;
    padding: var(--sui-space-2) var(--sui-space-3) var(--sui-space-1);
    text-transform: uppercase;
  }

  .sui-select-option {
    align-items: center;
    block-size: var(--sui-control-height-compact);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    font: 500 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-2);
    outline: none;
    padding-inline: var(--sui-space-3);
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-select-option.active:not([aria-disabled='true']):not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-select-option:active:not([aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-select-option[aria-disabled='true'] {
    cursor: default;
    opacity: 0.5;
  }

  .sui-select-check {
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-space-4);
    justify-content: center;
  }

  /* No cap trim: a name has descenders, and the row centres it on its own. */
  .sui-select-label,
  .sui-select-note {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-select-label {
    flex: 0 1 auto;
  }

  .sui-select-note {
    color: var(--sui-text-muted);
    flex: 1 1 0;
    font-weight: 400;
  }

  /* Muted ink drops under 4.5:1 on the active row's veil. */
  .sui-select-option.active .sui-select-note {
    color: var(--sui-text-secondary);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-select,
    .sui-select-option {
      transition: none;
    }

    .sui-select:active:not(:disabled),
    .sui-select-option:active:not([aria-disabled='true']) {
      translate: none;
    }
  }
</style>
