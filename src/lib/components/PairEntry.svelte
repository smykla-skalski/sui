<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import type { ComboboxOption } from './Combobox.svelte';
  import IconButton from './IconButton.svelte';
  import Popover from './Popover.svelte';

  const uid = $props.id();

  let {
    key = $bindable(''),
    value = $bindable(''),
    options,
    keyLabel = 'Key',
    valueLabel = 'Value',
    keyPlaceholder = 'key',
    valuePlaceholder = 'value',
    removeLabel,
    error,
    disabled = false,
    onremove,
    class: className = '',
    ...rest
  }: {
    key?: string;
    /** An option's `value`. Typing only searches; choosing an option is what changes it. */
    value?: string;
    options: readonly ComboboxOption[];
    /** Names the key field, such as "Alias deploy". */
    keyLabel?: string;
    /** Names the value field and its suggestions, such as "Command for alias deploy". */
    valueLabel?: string;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    /** Names the remove button. It defaults to "Remove" and the key. */
    removeLabel?: string;
    /** Says what is wrong with the key. The lane is marked invalid and the key described by it. */
    error?: string;
    disabled?: boolean;
    onremove: () => void;
    /** Layout for the call site only, never the lane's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> = $props();

  const listId = `${uid}-list`;
  const errorId = `${uid}-error`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  let lane = $state<HTMLElement | null>(null);
  let list = $state<HTMLElement | null>(null);
  let open = $state(false);
  let query = $state<string | null>(null);
  let active = $state(0);

  const removal = $derived(
    removeLabel ?? (key.trim() ? `Remove ${key.trim()}` : 'Remove this pair')
  );
  const shown = $derived(query ?? options.find((option) => option.value === value)?.label ?? value);
  const needle = $derived(query?.trim().toLowerCase() ?? '');
  const hits = $derived(
    needle === ''
      ? options
      : options.filter((option) =>
          `${option.label} ${option.description ?? ''}`.toLowerCase().includes(needle)
        )
  );
  const showing = $derived(open && !disabled);

  function step(from: number, by: 1 | -1): number {
    const count = hits.length;
    for (let distance = 1; distance <= count; distance++) {
      const at = (((from + by * distance) % count) + count) % count;
      if (!hits[at].disabled) return at;
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

  function show(): void {
    query = null;
    open = true;
    active = Math.max(
      0,
      hits.findIndex((option) => option.value === value)
    );
    void tick().then(reveal);
  }

  function hide(): void {
    open = false;
    query = null;
  }

  function take(index: number): void {
    const option = hits[index];
    if (!option || option.disabled) return;
    value = option.value;
    hide();
  }

  function oninput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
    query = event.currentTarget.value;
    open = true;
    active = Math.max(0, step(-1, 1));
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return show();
      const next = step(active, event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) return;
      active = next;
      reveal();
    } else if (event.key === 'Enter' && showing && hits.length > 0) {
      event.preventDefault();
      take(active);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  }
</script>

<!--
@component
A key and the value it maps to, such as an alias and the command it runs, in one 34px lane with
one border. The key is typed. The value is picked from `options`: pressing or typing in it opens
the suggestions, which follow the ARIA combobox pattern with arrows that wrap, Enter to commit
and Escape to close and put the chosen value back. Typing only searches, so the value is always
one of the options.

The chevron belongs to the picker and the cross at the lane's end removes the pair, so the two
never share a target. `error` is about the key: it marks the lane and stands 8px under it. A
reset for a row of pairs belongs beside the whole group, which `SettingRow` draws with `onclear`.
-->

<div {...rest} class={['sui-pair-entry', className]}>
  <div bind:this={lane} class="sui-pair-lane" class:invalid={Boolean(error)} class:disabled>
    <label class="sui-pair-half">
      <input
        bind:value={key}
        aria-label={keyLabel}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={keyPlaceholder}
        autocomplete="off"
        spellcheck="false"
        {disabled}
      />
    </label>
    <span class="sui-pair-arrow" aria-hidden="true">→</span>
    <label class="sui-pair-half">
      <input
        value={shown}
        role="combobox"
        aria-label={valueLabel}
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing && hits.length > 0 ? optionId(active) : undefined}
        placeholder={valuePlaceholder}
        autocomplete="off"
        spellcheck="false"
        {disabled}
        {oninput}
        {onkeydown}
        onblur={hide}
        onclick={() => {
          if (!open) show();
        }}
      />
      <Icon name="chevron-down" size="xs" />
    </label>
    <IconButton icon="close" label={removal} {disabled} onclick={onremove} />
  </div>
  {#if error}<p id={errorId} class="sui-pair-error">{error}</p>{/if}
</div>

<Popover
  anchor={lane}
  open={showing}
  dismiss="manual"
  width="min-trigger"
  onmousedown={(event: MouseEvent) => event.preventDefault()}
>
  <div
    bind:this={list}
    id={listId}
    role="listbox"
    tabindex="-1"
    class="sui-pair-list"
    aria-label={valueLabel}
    hidden={hits.length === 0}
  >
    {#each hits as option, index (option.value)}
      <!-- Keys are handled on the field, which keeps focus while an option is active. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id={optionId(index)}
        role="option"
        tabindex="-1"
        class={['sui-pair-option', { active: index === active }]}
        aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined}
        onclick={() => take(index)}
        onpointermove={() => {
          if (!option.disabled) active = index;
        }}
      >
        <span class="sui-pair-option-label">{option.label}</span>
        {#if option.description}
          <span class="sui-pair-option-note">{option.description}</span>
        {/if}
      </div>
    {/each}
  </div>
  {#if hits.length === 0}<p class="sui-pair-empty">Nothing matches that</p>{/if}
</Popover>

<style>
  .sui-pair-entry {
    display: grid;
    gap: var(--sui-row-copy-gap);
    inline-size: fit-content;
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* 34px less the border leaves 32px; each half and the cross stand 28px tall in it, 2px clear
     of the border all round, so a half's inset ring never touches the lane's edge. */
  .sui-pair-lane {
    align-items: center;
    background-color: var(--sui-control-bg);
    block-size: var(--sui-control-height-compact);
    border: 1px solid var(--sui-control-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    display: flex;
    max-inline-size: 100%;
    min-inline-size: 0;
    padding-inline: 2px;
    transition: border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-pair-lane:hover:not(.disabled):not(:focus-within) {
    border-color: var(--sui-control-border-hover);
  }

  .sui-pair-lane.invalid {
    border-color: var(--sui-danger);
  }

  .sui-pair-half {
    align-items: center;
    block-size: var(--sui-tier-quiet);
    border-radius: var(--sui-radius-check);
    box-sizing: border-box;
    color: var(--sui-text-muted);
    cursor: text;
    display: flex;
    flex: 0 1 auto;
    gap: var(--sui-space-1);
    min-inline-size: 0;
    padding-inline: var(--sui-space-2);
    transition: background-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-pair-half:focus-within {
    background-color: var(--sui-input-bg);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* Each half is as wide as what it holds, inside a bound, where the browser can measure it. */
  .sui-pair-half input {
    appearance: none;
    background: none;
    block-size: var(--sui-tier-quiet);
    border: 0;
    box-sizing: border-box;
    color: var(--sui-text-primary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
    inline-size: 9ch;
    margin: 0;
    max-inline-size: 10rem;
    min-inline-size: 4ch;
    outline: none;
    padding: 0;
    text-overflow: ellipsis;
  }

  @supports (field-sizing: content) {
    .sui-pair-half input {
      field-sizing: content;
      inline-size: auto;
    }
  }

  .sui-pair-half input::placeholder {
    color: var(--sui-text-muted);
    opacity: 1;
  }

  .sui-pair-arrow {
    color: var(--sui-text-muted);
    flex: none;
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-flat) var(--sui-sans);
    padding-inline: var(--sui-space-1);
    text-box: trim-both cap alphabetic;
  }

  /* Opacity on the parts rather than the lane, so the cross, which fades itself, is not
     faded twice. */
  .disabled {
    border-color: color-mix(in srgb, var(--sui-control-border) 50%, transparent);
  }

  .disabled > :is(.sui-pair-half, .sui-pair-arrow) {
    cursor: default;
    opacity: 0.5;
  }

  .sui-pair-error {
    color: var(--sui-danger);
    contain: inline-size;
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    justify-self: stretch;
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  /* The popover's own 1px border sits outside this list, so the box as a whole stops at
     min(20rem, the room it has). */
  .sui-pair-list {
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

  .sui-pair-list[hidden] {
    display: none;
  }

  .sui-pair-option {
    align-items: center;
    block-size: var(--sui-control-height-compact);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    gap: var(--sui-space-3);
    outline: none;
    padding-inline: var(--sui-space-3);
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-pair-option.active:not([aria-disabled='true']):not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-pair-option:active:not([aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-pair-option[aria-disabled='true'] {
    cursor: default;
    opacity: 0.5;
  }

  .sui-pair-option-label,
  .sui-pair-option-note {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-pair-option-label {
    flex: 0 1 auto;
    font: 400 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  .sui-pair-option-note {
    color: var(--sui-text-muted);
    flex: 1 1 0;
    font: 400 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
  }

  .sui-pair-empty {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
    padding: var(--sui-space-2) var(--sui-space-3);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-pair-lane,
    .sui-pair-half,
    .sui-pair-option {
      transition: none;
    }

    .sui-pair-option:active:not([aria-disabled='true']) {
      translate: none;
    }
  }
</style>
