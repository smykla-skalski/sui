<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import type { ComboboxOption } from './Combobox.svelte';
  import IconButton from './IconButton.svelte';
  import Popover from './Popover.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();

  let {
    key = $bindable(''),
    value = $bindable(''),
    options,
    keyLabel = 'Key',
    valueLabel = 'Value',
    row,
    heads = true,
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
    /** The key column's heading, such as "Alias". It names the key field. */
    keyLabel?: string;
    /** The value column's heading, such as "Command". It names the value field and its suggestions. */
    valueLabel?: string;
    /** This pair's place in a group, counted from 1. It joins the headings in each field's name. */
    row?: number;
    /** Draw the headings above the lane. Turn off on every pair of a group but the first. */
    heads?: boolean;
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
  const keyHead = `${uid}-key`;
  const valueHead = `${uid}-value`;
  const rowId = `${uid}-row`;
  const named = (head: string) => (row === undefined ? head : `${head} ${rowId}`);
  const optionId = (index: number) => `${uid}-option-${index}`;

  let lane = $state<HTMLElement | null>(null);
  let list = $state<HTMLElement | null>(null);
  let open = $state(false);
  let query = $state<string | null>(null);
  let active = $state(0);
  /* Only an arrow key, or the pointer, lights an option: typing keeps the reader in the text. */
  let navigated = $state(false);

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
  const listed = $derived(showing && hits.length > 0);

  /* Disabled options stay in the arrow path, so a reader hears they exist; `take` refuses them. */
  const step = (from: number, by: 1 | -1) =>
    (((from + by) % hits.length) + hits.length) % hits.length;

  // Scrolls the list alone: the box is fixed in the top layer, and scrollIntoView could move the page.
  function reveal(): void {
    const node = document.getElementById(optionId(active));
    if (!list || !node) return;
    const view = list.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    if (box.top < view.top) list.scrollTop -= view.top - box.top;
    else if (box.bottom > view.bottom) list.scrollTop += box.bottom - view.bottom;
  }

  function show(byKey: boolean): void {
    query = null;
    open = true;
    navigated = byKey;
    active = Math.max(
      0,
      hits.findIndex((option) => option.value === value)
    );
    void tick().then(reveal);
  }

  function hide(): void {
    open = false;
    query = null;
    navigated = false;
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
    active = 0;
    navigated = false;
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return show(true);
      if (hits.length === 0) return;
      const by = event.key === 'ArrowDown' ? 1 : -1;
      active = navigated ? step(active, by) : by === 1 ? 0 : hits.length - 1;
      navigated = true;
      reveal();
    } else if (event.key === 'Enter' && listed && navigated) {
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
the suggestions, which follow the ARIA list autocomplete pattern. Typing only searches and
lights nothing, the arrows light an option and wrap, Enter commits it, and Escape closes the
list and puts the chosen value back. A disabled option is on the arrow path but cannot be
chosen. "Nothing matches that" is announced through a polite status.

`keyLabel` and `valueLabel` are visible column headings above the lane, never placeholders,
which leave as the reader types. In a group, stack the pairs in a grid whose columns are
`minmax(0, auto) auto minmax(0, auto) auto`, give each its `row`, and draw `heads` on the
first pair only. Every pair then lines its halves up under
the headings, and each field is named by its heading and its row, such as "Alias 2".

The chevron belongs to the picker and the cross at the lane's end removes the pair, so the two
never share a target. `error` is about the key: it marks the lane and stands 8px under it. A
reset for a row of pairs belongs beside the whole group, which `SettingRow` draws with `onclear`.
-->

{#snippet head(id: string, text: string, column: 'key' | 'value')}
  {#if heads}
    <span {id} class="sui-pair-head" data-column={column}>{text}</span>
  {:else}
    <VisuallyHidden {id}>{text}</VisuallyHidden>
  {/if}
{/snippet}

<div {...rest} class={['sui-pair-entry', className, { grouped: row !== undefined }]}>
  {@render head(keyHead, keyLabel, 'key')}
  {@render head(valueHead, valueLabel, 'value')}
  {#if row !== undefined}<VisuallyHidden id={rowId}>{row}</VisuallyHidden>{/if}
  <div bind:this={lane} class="sui-pair-lane" class:invalid={Boolean(error)} class:disabled>
    <label class="sui-pair-half">
      <input
        bind:value={key}
        aria-labelledby={named(keyHead)}
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
        aria-labelledby={named(valueHead)}
        aria-autocomplete="list"
        aria-expanded={listed}
        aria-controls={listId}
        aria-activedescendant={listed && navigated ? optionId(active) : undefined}
        placeholder={valuePlaceholder}
        autocomplete="off"
        spellcheck="false"
        {disabled}
        {oninput}
        {onkeydown}
        onblur={hide}
        onclick={() => {
          if (!open) show(false);
        }}
      />
      <Icon name="chevron-down" size="xs" />
    </label>
    <IconButton icon="close" label={removal} {disabled} onclick={onremove} />
  </div>
  {#if error}<p id={errorId} class="sui-pair-error">{error}</p>{/if}
  <VisuallyHidden role="status"
    >{showing && hits.length === 0 ? 'Nothing matches that' : ''}</VisuallyHidden
  >
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
    aria-labelledby={named(valueHead)}
    hidden={hits.length === 0}
  >
    {#each hits as option, index (option.value)}
      <!-- Keys are handled on the field, which keeps focus while an option is active. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id={optionId(index)}
        role="option"
        tabindex="-1"
        class={['sui-pair-option', { active: navigated && index === active }]}
        aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined}
        onclick={() => take(index)}
        onpointermove={() => {
          if (option.disabled) return;
          active = index;
          navigated = true;
        }}
      >
        <span class="sui-pair-option-label">{option.label}</span>
        {#if option.description}
          <span class="sui-pair-option-note">{option.description}</span>
        {/if}
      </div>
    {/each}
  </div>
  <!-- The status in the pair speaks this, so the drawn copy stays out of the tree. -->
  {#if hits.length === 0}<p class="sui-pair-empty" aria-hidden="true">Nothing matches that</p>{/if}
</Popover>

<style>
  /* Four columns: key, arrow, value and cross. The halves may shrink, so a narrow row
     ellipsizes them instead of overflowing. */
  .sui-pair-entry {
    column-gap: 0;
    display: grid;
    grid-template-columns: minmax(0, auto) auto minmax(0, auto) auto;
    inline-size: fit-content;
    max-inline-size: 100%;
    min-inline-size: 0;
    row-gap: var(--sui-row-copy-gap);
  }

  /* A pair with a `row` sits in its group's four-column grid and subgrids it, so every
     pair of the group shares one set of columns under the first pair's headings. */
  .grouped {
    grid-column: 1 / span 4;
    grid-template-columns: subgrid;
  }

  /* The lane's border and 2px inset stand before the key half, so the key heading steps in
     by both to start on the typed text. */
  .sui-pair-head {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: 600 var(--sui-font-size-control) / var(--sui-row-copy-leading) var(--sui-sans);
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
    min-inline-size: 0;
    padding-inline-start: calc(1px + 2px + var(--sui-space-2));
    text-box: trim-both cap alphabetic;
  }

  .sui-pair-head[data-column='value'] {
    grid-column: 3;
    padding-inline-start: var(--sui-space-2);
  }

  /* 34px less the border leaves 32px; each half and the cross stand 28px tall in it, 2px clear
     of the border all round, so a half's inset ring never touches the lane's edge. */
  .sui-pair-lane {
    align-items: center;
    background-color: var(--sui-control-bg);
    block-size: var(--sui-control-height-compact);
    border: 1px solid var(--sui-field-frame);
    border-block-end-color: var(--sui-field-border);
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    column-gap: 0;
    display: grid;
    grid-column: 1 / span 4;
    grid-template-columns: subgrid;
    min-inline-size: 0;
    padding-inline: 2px;
    transition: border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  .sui-pair-lane:hover:not(.disabled):not(:focus-within) {
    border-color: var(--sui-field-frame-hover);
    border-block-end-color: var(--sui-field-border-hover);
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

  /* Each half is as wide as what it holds, inside a bound, where the browser can measure it,
     and fills a column that a longer pair in the group widened. */
  .sui-pair-half input {
    appearance: none;
    flex: 1 1 auto;
    background: none;
    block-size: var(--sui-tier-quiet);
    border: 0;
    box-sizing: border-box;
    color: var(--sui-text-primary);
    font: 400 var(--sui-font-size-input) / var(--sui-leading-input) var(--sui-mono);
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
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
    opacity: var(--sui-disabled-opacity);
  }

  .sui-pair-error {
    block-size: var(--sui-block-snap);
    color: var(--sui-danger);
    contain: inline-size;
    grid-column: 1 / span 4;
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

  .sui-pair-option.active:not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-pair-option:active:not([aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-pair-option[aria-disabled='true'] {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
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

  /* A finger needs a 44px target, so the hit area grows past the drawn box (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-pair-half {
      position: relative;
    }

    .sui-pair-half::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }
</style>
