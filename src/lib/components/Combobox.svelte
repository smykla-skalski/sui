<script module lang="ts">
  export type ComboboxOption = {
    value: string;
    label: string;
    /** A short note set after the label; it wraps with it when the row is narrow. */
    description?: string;
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import { flushSync, tick } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { formatCount } from '../internal/locale.js';
  import Popover from './Popover.svelte';
  import TextInput from './TextInput.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();
  const SEARCH_PAUSE = 180;

  let {
    value = $bindable(''),
    options = [],
    search,
    free = false,
    invalid = false,
    preview = false,
    limit = 100,
    name,
    emptyLabel = word('Combobox.emptyLabel', 'Nothing matches that'),
    searchingLabel = word('Combobox.searchingLabel', 'Searching…'),
    failedLabel = word(
      'Combobox.failedLabel',
      'Suggestions could not load, so keep typing to try again'
    ),
    useLabel = word('Combobox.useLabel', (text: string) => `Use “${text}”`),
    countLabel = word('Combobox.countLabel', (count: number) =>
      count === 1 ? '1 suggestion' : `${formatCount(count)} suggestions`
    ),
    moreLabel = word(
      'Combobox.moreLabel',
      (count: number) => `${formatCount(count)} more, so keep typing to narrow them`
    ),
    onselect,
    onsearcherror,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** An option's `value`, or the typed text when `free` takes it. Empty means nothing chosen. */
    value?: string;
    options?: readonly ComboboxOption[];
    /** Asks for suggestions as the reader types, in place of filtering `options`. Late answers are dropped. */
    search?: (query: string) => Promise<readonly ComboboxOption[]>;
    /** Offers what was typed as the last row, and keeps it when focus leaves or Enter sends the form. */
    free?: boolean;
    /** Marks the value as wrong; pass a `Field`'s `invalid` here, with its error in `aria-describedby`. */
    invalid?: boolean;
    /** Draws the list open under a read-only field in the page's flow, with the value's row active and no keyboard. */
    preview?: boolean;
    /** The most suggestions drawn at once; the rest are counted under the list. */
    limit?: number;
    /** Posts `value`, never the label, with a form. */
    name?: string;
    /** Said when the typed text matches no option. */
    emptyLabel?: string;
    /** Said while `search` has not answered. */
    searchingLabel?: string;
    /** Said when `search` was refused. */
    failedLabel?: string;
    /** The row that offers the typed text itself, with `free`. */
    useLabel?: (text: string) => string;
    /** Spoken as the suggestions change while the reader types. */
    countLabel?: (count: number) => string;
    /** Drawn under the list when more match than `limit` draws. */
    moreLabel?: (count: number) => string;
    /** Hears each value the reader commits, the empty one included. */
    onselect?: (value: string) => void;
    /** Hears a refused `search`. */
    onsearcherror?: (error: unknown) => void;
    element?: HTMLInputElement | null;
    class?: HTMLInputAttributes['class'];
  } & Omit<
    HTMLInputAttributes,
    'value' | 'type' | 'role' | 'class' | 'name' | 'onselect'
  > = $props();

  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  let open = $state(false);
  let focused = $state(false);
  /* The field shows `query` instead of the committed label. A draft the reader left behind
     holds only while `value` is still what the draft left, so an owner's new value shows. */
  let typed = $state(false);
  let typedFor = $state('');
  let query = $state('');
  let active = $state(0);
  /* Only an arrow key, or the pointer, lights an option: typing keeps the reader in the text. */
  let navigated = $state(false);
  let found = $state.raw<readonly ComboboxOption[]>([]);
  let pending = $state(false);
  let failed = $state(false);
  let list = $state<HTMLElement | null>(null);
  let generation = 0;
  let timer = 0;

  const known = $derived([...options, ...found].find((option) => option.value === value));
  const shown = $derived(known?.label ?? value);
  const drafting = $derived(typed && (focused || typedFor === value));
  const asked = $derived(drafting ? query.trim() : '');
  const needle = $derived(asked.toLowerCase());
  const hits = $derived(
    search
      ? found
      : needle === ''
        ? options
        : options.filter((option) => option.label.toLowerCase().includes(needle))
  );
  const visible = $derived(hits.slice(0, Math.max(0, limit)));
  const beyond = $derived(hits.length - visible.length);
  const offers = $derived(
    free &&
      asked !== '' &&
      asked !== value &&
      !hits.some((option) => option.label.toLowerCase() === needle)
  );
  const rows = $derived(visible.length + (offers ? 1 : 0));
  const empty = $derived(asked !== '' && rows === 0 && !pending && !failed);
  const searching = $derived(pending && asked !== '');
  const note = $derived(
    failed && asked !== '' ? failedLabel : empty ? emptyLabel : searching ? searchingLabel : ''
  );
  const spoken = $derived(
    note || (open && asked !== '' && hits.length > 0 ? countLabel(hits.length) : '')
  );
  const showing = $derived((preview || open) && (rows > 0 || note !== ''));
  const listed = $derived(showing && rows > 0);
  const current = $derived(
    preview
      ? Math.max(
          0,
          visible.findIndex((option) => option.value === value)
        )
      : navigated
        ? active
        : -1
  );
  const listLabel = $derived(
    rest['aria-label'] ??
      ([...(element?.labels ?? [])]
        .map((label) => label.textContent?.trim())
        .filter(Boolean)
        .join(mark('space')) ||
        undefined)
  );

  $effect(() => () => clearTimeout(timer));

  /* Disabled options stay in the arrow path, so a reader hears they exist; `take` refuses them. */
  const step = (from: number, by: 1 | -1) => (((from + by) % rows) + rows) % rows;

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
    failed = false;
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
        active = 0;
        navigated = false;
      } catch (error) {
        if (mine !== generation) return;
        // Old suggestions answered an older query, so a refusal clears them rather than leave them standing.
        found = [];
        failed = true;
        onsearcherror?.(error);
      } finally {
        if (mine === generation) pending = false;
      }
    }, SEARCH_PAUSE);
  }

  function commit(next: string): void {
    typed = false;
    if (next === value) return;
    value = next;
    onselect?.(next);
  }

  function show(byKey: boolean): void {
    if (!drafting) typed = false;
    open = true;
    navigated = byKey;
    active = Math.max(
      0,
      visible.findIndex((option) => option.value === value)
    );
    void tick().then(reveal);
  }

  function hide(): void {
    open = false;
    navigated = false;
  }

  function take(index: number): void {
    if (preview) return;
    if (index === visible.length && offers) commit(asked);
    else {
      const option = visible[index];
      if (!option || option.disabled) return;
      commit(option.value);
    }
    hide();
  }

  /* What the reader typed is never thrown away: an emptied field clears the value, a label
     typed in full picks its option, free text is the value, and anything else stays on
     screen as a draft while the value it replaced is cleared. */
  function settle(): void {
    if (!typed) return;
    const match = options
      .concat(found)
      .find((option) => !option.disabled && option.label.toLowerCase() === needle);
    if (asked === '') commit('');
    else if (match) commit(match.value);
    else if (free) commit(asked);
    else {
      commit('');
      typed = true;
      typedFor = '';
    }
  }

  function oninput(event: Event): void {
    query = (event.currentTarget as HTMLInputElement).value;
    typed = true;
    open = true;
    active = 0;
    navigated = false;
    ask(query.trim());
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return show(true);
      if (rows === 0) return;
      const by = event.key === 'ArrowDown' ? 1 : -1;
      active = navigated ? step(active, by) : by === 1 ? 0 : rows - 1;
      navigated = true;
      reveal();
    } else if (event.key === 'Enter' && listed && navigated) {
      event.preventDefault();
      take(active);
    } else if (event.key === 'Enter') {
      // The form sends after this handler, so the value it posts must already be written.
      settle();
      hide();
      flushSync();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  }

  function onfocus(): void {
    if (typed && typedFor !== value) typed = false;
    focused = true;
  }

  function onblur(): void {
    settle();
    hide();
    focused = false;
  }
</script>

<!--
@component
A text field that suggests values as the reader types and commits one. It filters `options` by
label, or asks `search` for suggestions, marks the matched characters, and says "Searching…"
while an answer is on its way, "Nothing matches that" when nothing does and that suggestions
could not load when `search` is refused. Each is announced through a polite status that is
always in the page, and so is the number of suggestions. `free` also offers what was typed as a
value of its own. Reach for `Select` when the list is short enough to read whole.

It follows the ARIA list autocomplete pattern: focus stays in the field, and typing never
lights an option. The arrows light one and wrap, Enter commits it, and Escape closes the list
without closing a surrounding dialog. A disabled option is on the arrow path but cannot be
chosen. `aria-expanded` is true only while options show. Leaving the field keeps what was
typed: free text is the value, a label typed in full picks its option, and other text stays as
a draft while the value it replaced is cleared. `name` posts the value through a hidden input.
Name it with a `<label>` or `aria-label`, as any field.

- Semantics: a text input with `role="combobox"` and `aria-autocomplete="list"`, a `role="listbox"` of `role="option"` rows in a popover, a polite `role="status"`, and a hidden input that posts `value`.
- Content: options with a short label and an optional note, both wrapping; at most `limit` rows are drawn and the rest are counted.
- States: closed, open, searching, nothing matches, search refused, invalid (the field's danger edge) and disabled; in the list a row is active (a veil and an inset 2px ring), committed (a check mark), pressed (a deeper veil, an inset shadow and a 1px sink) or disabled (0.7 opacity).
- Keyboard: typing filters, Down and Up open the list and light a row with wrap-around, Enter commits the lit row or settles the typed text, and Escape closes the list and stops there.
- Pointer and touch: the field is 34px tall, 44px on a phone or any touch screen, every row at least that tall, and a press on a row commits it.
- Focus: focus stays in the field the whole time; the lit row is `aria-activedescendant`, set only once an arrow or the pointer moved to it.
- Responsive: the list is at least as wide as the field and at most the room it has, and rows wrap their words and grow.
- Accessibility: the field's label names the list, the status says searching, nothing found, a refusal and the number of suggestions, and the lit row's ring holds 3:1.
- Localization: `emptyLabel`, `searchingLabel`, `failedLabel`, `useLabel`, `countLabel` and `moreLabel` are props with English defaults, counts follow the page language, and the list hangs from the start edge in either direction.
- Performance: filtering runs on each keystroke over `options`, `search` waits 180ms and drops late answers, and at most `limit` rows render.
- Analytics: `onselect` hears each committed value and `onsearcherror` each refused search.
- Failure: a refused search clears its old suggestions and says so, nothing found is said in words, and typed text is never thrown away on blur.
-->

{#snippet marked(label: string)}
  {@const at = needle === '' ? -1 : label.toLowerCase().indexOf(needle)}
  {#if at < 0}{label}{:else}{label.slice(0, at)}<mark>{label.slice(at, at + needle.length)}</mark
    >{label.slice(at + needle.length)}{/if}
{/snippet}

{#snippet control()}
  <TextInput
    bind:element
    {...rest}
    class={className}
    value={drafting ? query : shown}
    {invalid}
    readonly={preview || rest.readonly}
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    aria-autocomplete="list"
    aria-expanded={listed}
    aria-controls={listId}
    aria-activedescendant={listed && current >= 0 ? optionId(current) : undefined}
    {oninput}
    onkeydown={preview ? undefined : onkeydown}
    {onfocus}
    {onblur}
    onclick={() => {
      if (!open && !preview) show(false);
    }}
  />{#if name}<input
      type="hidden"
      {name}
      {value}
      form={rest.form}
      disabled={rest.disabled}
    />{/if}<VisuallyHidden role="status">{spoken}</VisuallyHidden><Popover
    anchor={element}
    open={showing}
    inline={preview}
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
      {#each visible as option, index (option.value)}
        <!-- Keys are handled on the field, which keeps focus while an option is active. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={optionId(index)}
          role="option"
          tabindex="-1"
          class={['sui-combobox-option', { active: index === current }]}
          aria-selected={option.value === value}
          aria-disabled={option.disabled || undefined}
          onclick={() => take(index)}
          onpointermove={() => {
            if (option.disabled) return;
            active = index;
            navigated = true;
          }}
        >
          <span class="sui-combobox-check"><Icon name="check" size="base" /></span>
          <span class="sui-combobox-text"
            ><span class="sui-combobox-label">{@render marked(option.label)}</span
            >{#if option.description}<span class="sui-combobox-note"
                >{mark('space')}{option.description}</span
              >{/if}</span
          >
        </div>
      {/each}
      {#if offers}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          id={optionId(visible.length)}
          role="option"
          tabindex="-1"
          class={['sui-combobox-option', { active: current === visible.length }]}
          aria-selected="false"
          onclick={() => take(visible.length)}
          onpointermove={() => {
            active = visible.length;
            navigated = true;
          }}
        >
          <span class="sui-combobox-check"></span>
          <span class="sui-combobox-text">{useLabel(asked)}</span>
        </div>
      {/if}
    </div>
    <!-- The status beside the field speaks these, so the drawn copy stays out of the tree. -->
    {#if note}<p class="sui-combobox-empty" aria-hidden="true">{note}</p>{/if}
    {#if beyond > 0 && rows > 0}
      <p class="sui-combobox-empty" aria-hidden="true">{moreLabel(beyond)}</p>
    {/if}
  </Popover>
{/snippet}

{#if preview}
  <div class="sui-combobox-preview">{@render control()}</div>
{:else}
  {@render control()}
{/if}

<style>
  .sui-combobox-preview {
    display: grid;
    gap: var(--sui-space-1);
    min-inline-size: 0;
  }

  /* The popover's own 1px border sits outside this list, so the box as a whole stops at
     min(20rem, the room it has). */
  .sui-combobox-list {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-block-size: calc(min(20rem, var(--sui-floating-available-block)) - 2 * var(--sui-stroke));
    max-inline-size: max(24rem, var(--sui-floating-anchor-inline));
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--sui-space-1);
    row-gap: 2px;
  }

  .sui-combobox-list[hidden] {
    display: none;
  }

  /* One line centres in the control height; a long label or note wraps and the row grows. */
  .sui-combobox-option {
    align-content: center;
    align-items: start;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    column-gap: var(--sui-space-2);
    cursor: pointer;
    display: grid;
    font: var(--sui-weight-medium) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    grid-template-columns: var(--sui-icon-base) minmax(0, 1fr);
    min-block-size: var(--sui-control-height-compact);
    outline: none;
    padding-block: var(--sui-space-1);
    padding-inline: var(--sui-space-2) var(--sui-space-3);
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-user-select: none;
    user-select: none;
  }

  /* The lit row is where the keyboard is, so it wears the focus ring, inset inside the list's
     clip, and not only a veil. */
  .sui-combobox-option.active {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-combobox-option.active:not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-combobox-option:active:not([aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-combobox-option[aria-disabled='true'] {
    cursor: default;
    opacity: var(--sui-disabled-opacity);
  }

  /* Centred on the first line, however many lines the row wraps to (L-94). */
  .sui-combobox-check {
    display: flex;
    justify-content: center;
    /* One cap tall, so the check centres on the name's cap line. */
    margin-block: calc((1cap - var(--sui-icon-base)) / 2);
  }

  .sui-combobox-option:not([aria-selected='true']) .sui-combobox-check {
    visibility: hidden;
  }

  /* The name runs cap line to baseline, so the row's room above and under it match (L-102). */
  .sui-combobox-text {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-combobox-note {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
  }

  /* Muted ink drops under 4.5:1 on the active row's veil. */
  .sui-combobox-option.active .sui-combobox-note {
    color: var(--sui-text-secondary);
  }

  mark {
    background: none;
    color: var(--sui-match-ink);
    font-weight: var(--sui-weight-semibold);
  }

  .sui-combobox-empty {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
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
