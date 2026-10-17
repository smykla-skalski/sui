<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type ActionMenuItem =
    | {
        label: string;
        icon?: IconName;
        /** `stop` marks an act that takes something away, in the danger ink. */
        tone?: 'default' | 'stop';
        disabled?: boolean;
        onselect: () => void;
      }
    | { separator: true };
</script>

<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import Icon from '../icons/Icon.svelte';
  import Button, { type ButtonTone } from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import Popover from './Popover.svelte';

  const uid = $props.id();
  const TYPEAHEAD_PAUSE = 500;

  let {
    items,
    label,
    icon,
    tone = 'default',
    align = 'start',
    disabled = false,
    children
  }: {
    items: readonly ActionMenuItem[];
    /** `end` hangs the menu from the trigger's trailing edge, for a control at the end of a row. */
    align?: 'start' | 'end';
    disabled?: boolean;
  } & (
    | {
        /** The accessible name and tooltip of the icon trigger. */
        label: string;
        icon: IconName;
        tone?: never;
        children?: never;
      }
    | {
        label?: never;
        icon?: never;
        tone?: ButtonTone;
        /** The visible label of a `Button` trigger, drawn with a trailing chevron. */
        children: Snippet;
      }
  ) = $props();

  const triggerId = `${uid}-trigger`;
  const popupId = `${uid}-popup`;
  const menuId = `${uid}-menu`;

  let open = $state(false);
  let button = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let iconButton = $state<HTMLButtonElement | null>(null);
  let menu = $state<HTMLElement | null>(null);
  let typed = '';
  let typedAt = 0;

  const trigger = $derived(button ?? iconButton);
  const iconic = $derived(items.some((item) => 'label' in item && item.icon));

  const enabledItems = () =>
    menu
      ? [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')]
      : [];

  async function show(edge: 'first' | 'last'): Promise<void> {
    open = true;
    await tick();
    const found = enabledItems();
    (edge === 'first' ? found[0] : found.at(-1))?.focus();
  }

  function close(): void {
    open = false;
    trigger?.focus();
  }

  function activate(item: Extract<ActionMenuItem, { label: string }>): void {
    if (item.disabled) return;
    // Focus is back on the trigger before the act runs, so a dialog it opens returns there.
    close();
    item.onselect();
  }

  // `popovertarget` stays on the trigger so the browser treats it as the invoker and never
  // light-dismisses on it, but the click is handled here so focus lands on the first item.
  function onclick(event: MouseEvent): void {
    event.preventDefault();
    if (open) open = false;
    else void show('first');
  }

  function ontriggerkeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    void show(event.key === 'ArrowDown' ? 'first' : 'last');
  }

  function seek(found: HTMLElement[], at: number, key: string, time: number): number {
    typed = time - typedAt > TYPEAHEAD_PAUSE ? key : typed + key;
    typedAt = time;
    const needle = typed.toLowerCase();
    const from = typed.length === 1 ? at + 1 : Math.max(at, 0);
    for (let distance = 0; distance < found.length; distance++) {
      const index = (from + distance) % found.length;
      if (found[index].textContent?.trim().toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  }

  function onmenukeydown(event: KeyboardEvent): void {
    const found = enabledItems();
    const at = found.indexOf(document.activeElement as HTMLElement);
    const count = found.length;
    let next = -1;
    if (event.key === 'ArrowDown') next = (at + 1) % count;
    else if (event.key === 'ArrowUp') next = at <= 0 ? count - 1 : at - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    } else if (event.key === 'Tab') {
      open = false;
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)
      next = seek(found, at, event.key, event.timeStamp);
    else return;
    event.preventDefault();
    found[next]?.focus();
  }
</script>

<!--
@component
A menu of acts behind one trigger, following the ARIA menu button pattern. A menu holds things
that happen; a place to go is a link on the page. Put a destructive act last with the `stop`
tone, so it is never the row under the pointer by accident.

The trigger is an `IconButton` when given `label` and `icon`, and a `Button` with a chevron
when given its label as children. Opening moves focus to the first item, arrows wrap, Home and
End jump, typing a letter jumps to the next item that starts with it, and Escape closes and
returns focus to the trigger. Choosing an item closes the menu and puts focus back on the
trigger before `onselect` runs, so a dialog the item opens returns focus there too.
-->

{#if children}
  <Button
    bind:element={button}
    id={triggerId}
    {tone}
    {disabled}
    popovertarget={popupId}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={menuId}
    {onclick}
    onkeydown={ontriggerkeydown}
  >
    {@render children()}
    {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
  </Button>
{:else if label && icon}
  <IconButton
    bind:element={iconButton}
    id={triggerId}
    {icon}
    {label}
    {disabled}
    popovertarget={popupId}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={menuId}
    {onclick}
    onkeydown={ontriggerkeydown}
  />
{/if}

<Popover id={popupId} anchor={trigger} bind:open width="min-trigger" {align}>
  <div
    bind:this={menu}
    id={menuId}
    role="menu"
    tabindex="-1"
    class="sui-action-menu"
    aria-labelledby={triggerId}
    onkeydown={onmenukeydown}
  >
    {#each items as item, index (index)}
      {#if 'separator' in item}
        <div role="separator" class="sui-action-menu-separator"></div>
      {:else}
        <button
          type="button"
          role="menuitem"
          tabindex="-1"
          class="sui-action-menu-item"
          data-tone={item.tone ?? 'default'}
          aria-disabled={item.disabled || undefined}
          onclick={() => activate(item)}
          onpointermove={(event) => {
            if (!item.disabled && document.activeElement !== event.currentTarget)
              event.currentTarget.focus();
          }}
        >
          {#if iconic}
            <span class="sui-action-menu-icon">
              {#if item.icon}<Icon name={item.icon} size="base" />{/if}
            </span>
          {/if}
          <span class="sui-action-menu-label">{item.label}</span>
        </button>
      {/if}
    {/each}
  </div>
</Popover>

<style>
  .sui-action-menu {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    max-inline-size: min(24rem, calc(100vw - 2 * var(--sui-space-3)));
    min-inline-size: 13rem;
    outline: none;
    padding: var(--sui-space-1);
    row-gap: 2px;
  }

  .sui-action-menu-item {
    align-items: center;
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
    inline-size: 100%;
    margin: 0;
    padding: 0 var(--sui-space-3);
    text-align: start;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
  }

  /* Focus follows the pointer, so one highlight serves hover and the keyboard. */
  .sui-action-menu-item:focus:not(:active):not([aria-disabled='true']) {
    background-color: var(--sui-interactive-hover-layer);
  }

  .sui-action-menu-item:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-action-menu-item:focus:not(:focus-visible) {
    outline: none;
  }

  .sui-action-menu-item:active:not([aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    translate: 0 1px;
  }

  .sui-action-menu-item[aria-disabled='true'] {
    cursor: default;
    opacity: 0.5;
  }

  .sui-action-menu-item[data-tone='stop'] {
    color: var(--sui-danger);
  }

  .sui-action-menu-icon {
    color: var(--sui-text-muted);
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-space-4);
    justify-content: center;
  }

  .sui-action-menu-item[data-tone='stop'] .sui-action-menu-icon {
    color: var(--sui-danger);
  }

  /* No cap trim: a name has descenders, and the row centres it on its own. */
  .sui-action-menu-label {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-action-menu-separator {
    background-color: var(--sui-popover-border);
    block-size: 1px;
    margin: var(--sui-space-1) calc(-1 * var(--sui-space-1));
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-action-menu-item {
      transition: none;
    }

    .sui-action-menu-item:active:not([aria-disabled='true']) {
      translate: none;
    }
  }
</style>
