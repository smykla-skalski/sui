<script module lang="ts">
  export type ComboboxOption = {
    value: string;
    label: string;
    /** A short note set after the label on the same line, so the row stays 34px. */
    description?: string;
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Popover from './Popover.svelte';
  import TextInput from './TextInput.svelte';

  const uid = $props.id();
  const SEARCH_PAUSE = 180;

  let {
    value = $bindable(''),
    options = [],
    search,
    free = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** An option's `value`, or the typed text when `free` takes it. Empty means nothing chosen. */
    value?: string;
    options?: readonly ComboboxOption[];
    /** Asks for suggestions as the reader types, in place of filtering `options`. Late answers are dropped. */
    search?: (query: string) => Promise<readonly ComboboxOption[]>;
    /** Offers what was typed as the last row, and keeps it when focus leaves. */
    free?: boolean;
    element?: HTMLInputElement | null;
    class?: HTMLInputAttributes['class'];
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'role' | 'class'> = $props();

  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  let open = $state(false);
  let typed = $state(false);
  let query = $state('');
  let active = $state(0);
  let found = $state.raw<readonly ComboboxOption[]>([]);
  let pending = $state(false);
  let list = $state<HTMLElement | null>(null);
  let generation = 0;
  let timer = 0;

  const known = $derived([...options, ...found].find((option) => option.value === value));
  const shown = $derived(known?.label ?? value);
  const asked = $derived(typed ? query.trim() : '');
  const needle = $derived(asked.toLowerCase());
  const hits = $derived(
    search
      ? found
      : needle === ''
        ? options
        : options.filter((option) => option.label.toLowerCase().includes(needle))
  );
  const offers = $derived(
    free &&
      asked !== '' &&
      asked !== value &&
      !hits.some((option) => option.label.toLowerCase() === needle)
  );
  const rows = $derived(hits.length + (offers ? 1 : 0));
  const empty = $derived(asked !== '' && rows === 0 && !pending);
  const showing = $derived(open && (rows > 0 || empty));
  const listLabel = $derived(
    rest['aria-label'] ??
      ([...(element?.labels ?? [])]
        .map((label) => label.textContent?.trim())
        .filter(Boolean)
        .join(' ') ||
        undefined)
  );

  $effect(() => () => clearTimeout(timer));

  const enabled = (index: number) => (index === hits.length ? offers : !hits[index]?.disabled);

  function step(from: number, by: 1 | -1): number {
    for (let distance = 1; distance <= rows; distance++) {
      const at = (((from + by * distance) % rows) + rows) % rows;
      if (enabled(at)) return at;
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

  function ask(text: string): void {
    const run = search;
    if (!run) return;
    clearTimeout(timer);
    const mine = ++generation;
    if (text === '') {
      found = [];
      pending = false;
      return;
    }
    pending = true;
    timer = window.setTimeout(async () => {
      try {
        const answer = await run(text);
        if (mine !== generation) return;
        found = answer;
        active = Math.max(0, step(-1, 1));
      } finally {
        if (mine === generation) pending = false;
      }
    }, SEARCH_PAUSE);
  }

  function show(): void {
    typed = false;
    open = true;
    active = Math.max(
      0,
      hits.findIndex((option) => option.value === value)
    );
    void tick().then(reveal);
  }

  function hide(): void {
    open = false;
    typed = false;
  }

  function take(index: number): void {
    if (index === hits.length && offers) value = asked;
    else {
      const option = hits[index];
      if (!option || option.disabled) return;
      value = option.value;
    }
    hide();
  }

  function oninput(event: Event): void {
    query = (event.currentTarget as HTMLInputElement).value;
    typed = true;
    open = true;
    active = Math.max(0, step(-1, 1));
    ask(query.trim());
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return show();
      const next = step(active, event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) return;
      active = next;
      reveal();
    } else if (event.key === 'Enter' && showing && rows > 0) {
      event.preventDefault();
      take(active);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  }

  // Clearing the field clears the value; with `free`, whatever was typed is the value.
  function onblur(): void {
    if (typed && (free || asked === '')) value = asked;
    hide();
  }
</script>

<!--
@component
A text field that suggests values as the reader types and commits one. It filters `options` by
label, or asks `search` for suggestions, marks the matched characters, and says "Nothing
matches that" when nothing does. `free` also offers what was typed as a value of its own. Reach
for `Select` when the list is short enough to read whole.

It follows the ARIA combobox pattern: focus stays in the field, arrows wrap through the
suggestions, Enter commits the active one, and Escape closes the list without closing a
surrounding dialog. Leaving the field puts the committed label back, unless the field was
emptied or `free` keeps the typed text. Name it with a `<label>` or `aria-label`, as any field.
-->

{#snippet marked(label: string)}
  {@const at = needle === '' ? -1 : label.toLowerCase().indexOf(needle)}
  {#if at < 0}{label}{:else}{label.slice(0, at)}<mark>{label.slice(at, at + needle.length)}</mark
    >{label.slice(at + needle.length)}{/if}
{/snippet}

<TextInput
  bind:element
  {...rest}
  class={className}
  value={typed ? query : shown}
  role="combobox"
  autocomplete="off"
  spellcheck="false"
  aria-autocomplete="list"
  aria-expanded={showing}
  aria-controls={listId}
  aria-activedescendant={showing && rows > 0 ? optionId(active) : undefined}
  {oninput}
  {onkeydown}
  {onblur}
  onclick={() => {
    if (!open) show();
  }}
/>

<Popover
  anchor={element}
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
    class="sui-combobox-list"
    aria-label={listLabel}
    hidden={rows === 0}
  >
    {#each hits as option, index (option.value)}
      <!-- Keys are handled on the field, which keeps focus while an option is active. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id={optionId(index)}
        role="option"
        tabindex="-1"
        class={['sui-combobox-option', { active: index === active }]}
        aria-selected={option.value === value}
        aria-disabled={option.disabled || undefined}
        onclick={() => take(index)}
        onpointermove={() => {
          if (!option.disabled) active = index;
        }}
      >
        <span class="sui-combobox-label">{@render marked(option.label)}</span>
        {#if option.description}
          <span class="sui-combobox-note">{option.description}</span>
        {/if}
      </div>
    {/each}
    {#if offers}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        id={optionId(hits.length)}
        role="option"
        tabindex="-1"
        class={['sui-combobox-option', { active: active === hits.length }]}
        aria-selected="false"
        onclick={() => take(hits.length)}
        onpointermove={() => (active = hits.length)}
      >
        <span class="sui-combobox-label">Use “{asked}”</span>
      </div>
    {/if}
  </div>
  {#if empty}<p class="sui-combobox-empty">Nothing matches that</p>{/if}
</Popover>

<style>
  /* The popover's own 1px border sits outside this list, so the box as a whole stops at
     min(20rem, the room it has). */
  .sui-combobox-list {
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

  .sui-combobox-list[hidden] {
    display: none;
  }

  .sui-combobox-option {
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

  .sui-combobox-option.active:not([aria-disabled='true']):not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-combobox-option:active:not([aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-combobox-option[aria-disabled='true'] {
    cursor: default;
    opacity: 0.5;
  }

  /* No cap trim: a name has descenders, and the row centres it on its own. */
  .sui-combobox-label,
  .sui-combobox-note {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-combobox-label {
    flex: 0 1 auto;
  }

  .sui-combobox-note {
    color: var(--sui-text-muted);
    flex: 1 1 0;
    font-weight: 400;
  }

  mark {
    background: none;
    color: var(--sui-match-ink);
    font-weight: 600;
  }

  .sui-combobox-empty {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
    padding: var(--sui-space-2) var(--sui-space-3);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-combobox-option {
      transition: none;
    }

    .sui-combobox-option:active:not([aria-disabled='true']) {
      translate: none;
    }
  }
</style>
