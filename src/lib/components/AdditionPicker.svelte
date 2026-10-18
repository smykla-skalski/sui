<script module lang="ts">
  export type AdditionChoice = {
    value: string;
    label: string;
    /** A short note set after the label, which drops under it when the line runs out. */
    description?: string;
  };
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { pageLocale } from '../internal/locale.js';
  import Button from './Button.svelte';
  import Popover from './Popover.svelte';

  const uid = $props.id();

  let {
    label,
    choices,
    added = [],
    onadd,
    done = word('AdditionPicker.done', 'Every choice is already added'),
    none = word('AdditionPicker.none', 'Nothing to add'),
    loading = false,
    loadingLabel = word('AdditionPicker.loadingLabel', 'Loading the choices…'),
    error = null,
    onretry,
    retryLabel = word('AdditionPicker.retryLabel', 'Try again'),
    optionName = word(
      'AdditionPicker.optionName',
      (label: string, description: string) => `${label}${mark('comma')}${description}`
    ),
    disabled = false,
    class: className = '',
    ...rest
  }: {
    /** The trigger's words, specific to what it adds, such as "Override another setting". */
    label: string;
    choices: readonly AdditionChoice[];
    /** Values already added. They are not offered again. */
    added?: readonly string[];
    onadd: (value: string) => void;
    /** Said in place of the list when every choice is already added. */
    done?: string;
    /** Said in place of the list when there are no choices at all. */
    none?: string;
    /** The choices are on their way. */
    loading?: boolean;
    loadingLabel?: string;
    /** Why the choices could not load, said in place of the list. */
    error?: string | null;
    /** Offers a retry beside `error`. */
    onretry?: () => void;
    retryLabel?: string;
    /** A choice's accessible name from its label and its description, in the language's order. */
    optionName?: (label: string, description: string) => string;
    disabled?: boolean;
    /** Layout for the call site only, never the trigger's own paint. */
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'class' | 'disabled' | 'onclick'> = $props();

  const popupId = `${uid}-popup`;
  const menuId = `${uid}-menu`;

  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let menu = $state<HTMLElement | null>(null);
  let open = $state(false);

  const offered = $derived(choices.filter((choice) => !added.includes(choice.value)));
  const items = () => [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  // `popovertarget` keeps the trigger the invoker, so the browser never light-dismisses on it,
  // but the press is handled here so focus can move into the list once it shows.
  async function toggle(event: MouseEvent): Promise<void> {
    event.preventDefault();
    open = !open;
    if (!open) return;
    await tick();
    items()[0]?.focus({ preventScroll: true });
  }

  // Focus left on nothing, or inside the closing list, goes back to the trigger; a press that
  // put it on another control keeps it there.
  function onclose(): void {
    const focused = document.activeElement;
    if (focused === document.body || (focused && menu?.contains(focused)))
      trigger?.focus({ preventScroll: true });
  }

  function choose(value: string): void {
    onadd(value);
    open = false;
  }

  function retry(): void {
    onretry?.();
    menu?.focus({ preventScroll: true });
  }

  // Typing jumps to the next choice that starts with what was typed, as a native menu does, so
  // a long list never has to be walked one arrow at a time.
  const TYPEAHEAD_MS = 500;
  let typed = '';
  let typedAt = 0;

  function typeahead(key: string, from: number): number {
    const now = performance.now();
    typed = now - typedAt > TYPEAHEAD_MS ? key : typed + key;
    typedAt = now;
    const locale = pageLocale();
    const words = items().map((item) => (item.textContent ?? '').trim().toLocaleLowerCase(locale));
    const sought = typed.toLocaleLowerCase(locale);
    const start = typed.length > 1 ? Math.max(from, 0) : from + 1;
    for (let step = 0; step < words.length; step++) {
      const at = (start + step) % words.length;
      if (words[at].startsWith(sought)) return at;
    }
    return -1;
  }

  function onkeydown(event: KeyboardEvent): void {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (at + 1) % all.length;
    else if (event.key === 'ArrowUp') next = (at <= 0 ? all.length : at) - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = all.length - 1;
    else if (event.key === 'Escape') {
      event.stopPropagation();
      open = false;
      trigger?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      // Focus moves on to the next control in the page's order, as the menu pattern asks.
      open = false;
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      next = typeahead(event.key, at);
      if (next < 0) return;
    } else return;
    event.preventDefault();
    all[next]?.focus({ preventScroll: true });
  }
</script>

<!--
@component
An `add` button that opens the choices of what to add, such as the settings a level can still
override. The choices float in a `Popover` under the trigger, so opening and closing never move
the trigger or grow the page. Whatever is in `added` is not offered again. Moving focus to the
new control after `onadd` is the caller's.

- Semantics: an `add` button with `aria-haspopup="menu"` and `aria-expanded`, opening a `menu` of `menuitem` buttons named by `label`.
- Content: choices of a label and an optional note, which drops under the label when the line runs out.
- States: closed, open, each choice's hover, focus and pressed, loading, failed, nothing to add, everything added, and a disabled trigger.
- Keyboard: opening moves focus to the first choice; arrows move and wrap, Home and End jump, typing jumps to the next choice that starts with the typed letters, Enter adds, Escape closes and returns focus to the trigger, and Tab closes and moves on.
- Pointer and touch: the trigger and every choice are 34px tall, 44px on a phone; a press outside closes the list.
- Focus: closing returns focus to the trigger unless a press put it on another control.
- Responsive: the list is at least as wide as the trigger, at most 24rem or the trigger's width, and scrolls inside its own box at `min(20rem, the room)` tall.
- Accessibility: the trigger says whether the list is open; a message in place of the list is a disabled item inside the menu, so the menu is never empty.
- Localization: `label`, `done`, `none`, `loadingLabel` and `retryLabel` are props with English defaults; type-ahead compares in the page's language; the list follows the reading direction.
- Performance: every offered choice renders; type-ahead is a linear search, fine for the few hundred a menu holds.
- Analytics: `onadd` hears each addition, and `onretry` each retry.
- Failure: no choices says `none`, everything added says `done`, `loading` says `loadingLabel`, and `error` says why with a `retryLabel` item when `onretry` is set.
-->

<Button
  bind:element={trigger}
  {...rest}
  tone="add"
  class={className}
  {disabled}
  aria-haspopup="menu"
  aria-expanded={open}
  aria-controls={menuId}
  popovertarget={popupId}
  onclick={toggle}
>
  {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
  {label}
</Button><Popover id={popupId} anchor={trigger} bind:open {onclose} width="min-trigger">
  <div
    bind:this={menu}
    id={menuId}
    role="menu"
    tabindex="-1"
    aria-label={label}
    class="sui-addition-menu"
    {onkeydown}
  >
    <!-- The trigger promises a menu, so any message in place of the choices is a disabled item inside one. -->
    {#if loading}
      <div role="menuitem" aria-disabled="true" tabindex="-1" class="sui-addition-done">
        {loadingLabel}
      </div>
    {:else if error}
      <div role="menuitem" aria-disabled="true" tabindex="-1" class="sui-addition-done problem">
        <Icon name="alert" size="sm" /><span>{error}</span>
      </div>
      {#if onretry}
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class="sui-addition-choice"
          onclick={retry}
        >
          <span class="sui-addition-label">{retryLabel}</span>
        </button>
      {/if}
    {:else}
      {#each offered as choice (choice.value)}
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class="sui-addition-choice"
          aria-label={choice.description ? optionName(choice.label, choice.description) : undefined}
          onclick={() => choose(choice.value)}
        >
          <span class="sui-addition-label">{choice.label}</span>
          {#if choice.description}
            <span class="sui-addition-note">{choice.description}</span>
          {/if}
        </button>
      {:else}
        <div role="menuitem" aria-disabled="true" tabindex="-1" class="sui-addition-done">
          {choices.length === 0 ? none : done}
        </div>
      {/each}
    {/if}
  </div>
</Popover>

<style>
  /* The popover's own 1px border sits outside this list, so the box as a whole stops at
     min(20rem, the room it has). */
  .sui-addition-menu {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-block-size: calc(min(20rem, var(--sui-floating-available-block)) - 2 * var(--sui-stroke));
    max-inline-size: max(24rem, var(--sui-floating-anchor-inline));
    outline: none;
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--sui-space-1);
    row-gap: 2px;
  }

  .sui-addition-choice {
    align-content: center;
    align-items: baseline;
    appearance: none;
    background-color: transparent;
    min-block-size: var(--sui-control-height-compact);
    border: 0;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    column-gap: var(--sui-space-2);
    display: flex;
    flex-wrap: wrap;
    font: var(--sui-weight-medium) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
    padding: var(--sui-space-1) var(--sui-space-3);
    text-align: start;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    user-select: none;
    -webkit-user-select: none;
  }

  .sui-addition-choice:focus-visible:not(:active) {
    background-color: var(--sui-interactive-hover-layer);
  }

  @media (hover: hover) {
    .sui-addition-choice:hover:not(:active) {
      background-color: var(--sui-interactive-hover-layer);
    }
  }

  .sui-addition-choice:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-addition-choice:active {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  /* No cap trim: a name has descenders, and the row centres it on its own. */
  .sui-addition-label,
  .sui-addition-note {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .sui-addition-note {
    color: var(--sui-text-muted);
    font-weight: var(--sui-weight-regular);
  }

  .sui-addition-done {
    align-items: center;
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: flex;
    min-block-size: var(--sui-control-height-compact);
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
    max-inline-size: 20rem;
    padding: 0 var(--sui-space-3);
  }

  .problem {
    color: var(--sui-danger);
    gap: var(--sui-space-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-addition-choice {
      transition: none;
    }

    .sui-addition-choice:active {
      translate: none;
    }
  }
</style>
