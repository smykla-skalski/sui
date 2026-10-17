<script module lang="ts">
  export type AdditionChoice = {
    value: string;
    label: string;
    /** A short note set after the label on the same line, so the row stays 34px. */
    description?: string;
  };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Button from './Button.svelte';
  import Popover from './Popover.svelte';

  const uid = $props.id();

  let {
    label,
    choices,
    added = [],
    onadd,
    done = 'Every choice is already added',
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
    disabled?: boolean;
    /** Layout for the call site only, never the trigger's own paint. */
    class?: HTMLButtonAttributes['class'];
  } & Omit<HTMLButtonAttributes, 'children' | 'class' | 'disabled' | 'onclick'> = $props();

  const popupId = `${uid}-popup`;

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

  function onkeydown(event: KeyboardEvent): void {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (at + 1) % all.length;
    else if (event.key === 'ArrowUp') next = (at <= 0 ? all.length : at) - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = all.length - 1;
    else if (event.key === 'Escape' || event.key === 'Tab') {
      event.stopPropagation();
      open = false;
    } else return;
    event.preventDefault();
    all[next]?.focus({ preventScroll: true });
  }
</script>

<!--
@component
An `add` button that opens the choices of what to add, such as the settings a level can still
override. The choices float in a `Popover` under the trigger, so opening and closing never move
the trigger or grow the page, and a long list scrolls inside its own box. The trigger says
whether the list is open with `aria-expanded`.

Opening moves focus to the first choice. Arrows move through them and wrap, Home and End jump,
Enter or a press adds one, and Escape, Tab or a press outside closes the list, handing focus back
to the trigger without scrolling. Whatever is in `added` is not offered again; when that is
everything, the list says so with `done` instead of offering duplicates. Moving focus to the new
control after `onadd` is the caller's.
-->

<Button
  bind:element={trigger}
  {...rest}
  tone="add"
  class={className}
  {disabled}
  aria-haspopup="menu"
  aria-expanded={open}
  aria-controls={popupId}
  popovertarget={popupId}
  onclick={toggle}
>
  {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
  {label}
</Button>

<Popover id={popupId} anchor={trigger} bind:open {onclose} width="min-trigger">
  <div
    bind:this={menu}
    role="menu"
    tabindex="-1"
    aria-label={label}
    class="sui-addition-menu"
    {onkeydown}
  >
    {#each offered as choice (choice.value)}
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="sui-addition-choice"
        onclick={() => choose(choice.value)}
      >
        <span class="sui-addition-label">{choice.label}</span>
        {#if choice.description}
          <span class="sui-addition-note">{choice.description}</span>
        {/if}
      </button>
    {:else}
      <!-- The trigger promises a menu, so "nothing left" is said by a disabled item inside one. -->
      <div role="menuitem" aria-disabled="true" tabindex="-1" class="sui-addition-done">
        {done}
      </div>
    {/each}
  </div>
</Popover>

<style>
  /* The popover's own 1px border sits outside this list, so the box as a whole stops at
     min(20rem, the room it has). */
  .sui-addition-menu {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-block-size: calc(min(20rem, var(--sui-floating-available-block)) - 2px);
    max-inline-size: max(24rem, var(--sui-floating-anchor-inline));
    outline: none;
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--sui-space-1);
    row-gap: 2px;
  }

  .sui-addition-choice {
    align-items: center;
    appearance: none;
    background-color: transparent;
    block-size: var(--sui-control-height-compact);
    border: 0;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    font: 500 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-2);
    margin: 0;
    padding: 0 var(--sui-space-3);
    text-align: start;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
  }

  .sui-addition-choice:where(:hover, :focus-visible):not(:active) {
    background-color: var(--sui-interactive-hover-layer);
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-addition-label {
    flex: 0 1 auto;
  }

  .sui-addition-note {
    color: var(--sui-text-muted);
    flex: 1 1 0;
    font-weight: 400;
  }

  .sui-addition-done {
    align-items: center;
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    display: flex;
    min-block-size: var(--sui-control-height-compact);
    font: 400 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
    max-inline-size: 20rem;
    padding: 0 var(--sui-space-3);
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
