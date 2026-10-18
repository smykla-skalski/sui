<script module lang="ts">
  import type { IconName } from '../icons/Icon.svelte';

  export type ActionMenuItem =
    | {
        label: string;
        icon?: IconName;
        /** `stop` marks an act that takes something away, in the danger ink. */
        tone?: 'default' | 'stop';
        /** Keeps the item in the arrow order while choosing it does nothing. */
        disabled?: boolean;
        /** One short line under the label, such as why the item is disabled. */
        description?: string;
        onselect: () => void;
      }
    | { separator: true };
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
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
    preview = false,
    optionName = word(
      'ActionMenu.optionName',
      (label: string, description: string) => `${label}${mark('comma')}${description}`
    ),
    children
  }: {
    items: readonly ActionMenuItem[];
    /** `end` hangs the menu from the trigger's trailing edge, for a control at the end of a row. */
    align?: 'start' | 'end';
    disabled?: boolean;
    /** Draws the menu open under the trigger in the page's flow, with its first item highlighted and no keyboard. */
    preview?: boolean;
    /** An item's accessible name from its label and its description, in the language's order. */
    optionName?: (label: string, description: string) => string;
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
  const highlighted = $derived(
    preview ? items.findIndex((item) => 'label' in item && !item.disabled) : -1
  );
  // A preview trigger opens nothing, so it carries no popup wiring and no handlers.
  const triggerProps = $derived(
    preview
      ? { 'aria-expanded': true, 'aria-controls': menuId }
      : {
          popovertarget: popupId,
          'aria-haspopup': 'menu' as const,
          'aria-expanded': open,
          'aria-controls': menuId,
          onclick,
          onkeydown: ontriggerkeydown
        }
  );

  // Disabled items stay focusable, as the menu pattern asks, so a reader can find them.
  const menuItems = () => [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  async function show(edge: 'first' | 'last'): Promise<void> {
    open = true;
    await tick();
    // The menu takes its place on the next frame, so focus must not scroll to where it was.
    const found = menuItems();
    (edge === 'first' ? found[0] : found.at(-1))?.focus({ preventScroll: true });
  }

  function close(): void {
    open = false;
    trigger?.focus({ preventScroll: true });
  }

  function activate(item: Extract<ActionMenuItem, { label: string }>): void {
    if (item.disabled || preview) return;
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
    const found = menuItems();
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
      // Focus moves on to the next control in the page's order, not back to the trigger.
      open = false;
      return;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)
      next = seek(found, at, event.key, event.timeStamp);
    else return;
    event.preventDefault();
    found[next]?.focus({ preventScroll: true });
  }
</script>

<!--
@component
A menu of acts behind one trigger, following the ARIA menu button pattern. A menu holds things
that happen; a place to go is a link on the page. Put a destructive act last with the `stop`
tone, so it is never the row under the pointer by accident.

The trigger is an `IconButton` when given `label` and `icon`, and a `Button` with a chevron
when given its label as children. Opening moves focus to the first item. Arrows wrap, Home and
End jump, and typing a letter jumps to the next item that starts with it. Escape closes and
returns focus to the trigger, and Tab closes it and moves on to the next control. A disabled
item stays in the arrow order with its `description`, and choosing it does nothing. Choosing
any other item closes the menu and focuses the trigger before `onselect` runs. A dialog the
item opens then returns focus there too. Labels wrap rather than being cut short.

- Semantics: a menu button (`aria-haspopup="menu"`, `aria-expanded`) and a `menu` of `menuitem` buttons named by the trigger, with `separator` rows between groups.
- Content: items with a label, an optional icon and one line of description; a destructive item last; labels and descriptions wrap.
- States: closed, open, an item highlighted by focus or pointer, pressed, disabled (dimmed label with its reason at full contrast), `stop` in the danger ink, and a disabled trigger.
- Keyboard: Enter, Space, Down or Up opens on the first or last item; arrows wrap, Home and End jump, a letter jumps, Enter or Space chooses, Escape closes to the trigger and Tab closes and moves on.
- Pointer and touch: items are one control tall, 34px and 44px on a phone or touch screen; the pointer's item takes focus as it moves.
- Focus: opening moves focus to the first item, choosing or Escape returns it to the trigger before `onselect` runs, and Tab hands it to the next control.
- Responsive: the menu is at least 13rem and at most 24rem wide or the viewport less 24px, flips above the trigger when there is more room, and scrolls inside when tall.
- Accessibility: the trigger names the menu, a disabled item is `aria-disabled`, an item's description is read in its name after the label through `optionName`, so the name holds every drawn word, and the highlight survives forced colours as an outline.
- Localization: every word is the caller's, and `align` start and end follow the reading direction, so a right-to-left page hangs the menu from the mirrored edge.
- Performance: items render only while the menu is in the page; the highlight fades its ground and the press sinks 1px, both removed under reduced motion.
- Analytics: each item's `onselect` reports the chosen act; a menu closed without a choice calls nothing.
- Failure: an empty `items` opens an empty menu, so leave the trigger out instead; a disabled item says why in its description.
-->
{#snippet control()}
  {#if children}
    <Button bind:element={button} id={triggerId} {tone} {disabled} {...triggerProps}>
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
      {...triggerProps}
    />
  {/if}<Popover
    id={popupId}
    anchor={trigger}
    bind:open
    inline={preview}
    width="min-trigger"
    {align}
  >
    <div
      bind:this={menu}
      id={menuId}
      role="menu"
      tabindex="-1"
      class="sui-action-menu"
      aria-labelledby={triggerId}
      onkeydown={preview ? undefined : onmenukeydown}
    >
      {#each items as item, index (index)}
        {#if 'separator' in item}
          <div role="separator" class="sui-action-menu-separator"></div>
        {:else}
          <button
            type="button"
            role="menuitem"
            tabindex="-1"
            class={['sui-action-menu-item', { active: index === highlighted }]}
            data-tone={item.tone ?? 'default'}
            aria-disabled={item.disabled || undefined}
            aria-label={item.description ? optionName(item.label, item.description) : undefined}
            onclick={() => activate(item)}
            onpointermove={(event) => {
              if (!preview && !item.disabled && document.activeElement !== event.currentTarget)
                event.currentTarget.focus({ preventScroll: true });
            }}
          >
            {#if iconic}
              <span class="sui-action-menu-icon">
                {#if item.icon}<Icon name={item.icon} size="base" />{/if}
              </span>
            {/if}
            <span class="sui-action-menu-text">
              <span class="sui-action-menu-label">{item.label}</span>
              {#if item.description}
                <span class="sui-action-menu-description">{item.description}</span>
              {/if}
            </span>
          </button>
        {/if}
      {/each}
    </div>
  </Popover>
{/snippet}

{#if preview}
  <div class="sui-action-menu-preview" data-align={align}>{@render control()}</div>
{:else}
  {@render control()}
{/if}

<style>
  .sui-action-menu-preview {
    display: inline-grid;
    gap: var(--sui-space-1);
    grid-template-columns: minmax(0, auto);
    inline-size: fit-content;
    max-inline-size: 100%;
  }

  .sui-action-menu-preview[data-align='end'] {
    justify-items: end;
  }

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

  /* The icon sits on the first line, never the middle of a two-line item: Material's lists
     top-align a leading icon with the primary text. The block padding centres one line in the
     control height, so a one-line item is exactly that tall (L-94). */
  .sui-action-menu-item {
    align-items: flex-start;
    background-color: transparent;
    min-block-size: var(--sui-control-height-compact);
    border: 0;
    border-radius: var(--sui-radius-control);
    box-sizing: border-box;
    color: var(--sui-text-primary);
    cursor: pointer;
    display: flex;
    font: var(--sui-weight-medium) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-2);
    inline-size: 100%;
    margin: 0;
    padding: calc((var(--sui-control-height-compact) - var(--sui-leading-meta)) / 2)
      var(--sui-space-3);
    text-align: start;
    transition:
      background-color var(--sui-duration-fast) var(--sui-ease-standard),
      translate var(--sui-duration-press) var(--sui-ease-standard);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Focus follows the pointer, so one highlight serves hover and the keyboard. */
  .sui-action-menu-item:focus:not(:active):not([aria-disabled='true']),
  .sui-action-menu-item.active:not(:active) {
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
  }

  /* The reason a disabled item gives stays at full contrast. */
  .sui-action-menu-item[aria-disabled='true'] :is(.sui-action-menu-icon, .sui-action-menu-label) {
    opacity: var(--sui-disabled-opacity);
  }

  .sui-action-menu-item[data-tone='stop'] {
    color: var(--sui-danger);
  }

  .sui-action-menu-icon {
    align-items: center;
    block-size: var(--sui-leading-meta);
    color: var(--sui-text-muted);
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-space-4);
    justify-content: center;
  }

  .sui-action-menu-item[data-tone='stop'] .sui-action-menu-icon {
    color: var(--sui-danger);
  }

  .sui-action-menu-text {
    display: grid;
    min-inline-size: 0;
  }

  /* No cap trim: a name has descenders, and the row centres it on its own. */
  .sui-action-menu-label {
    overflow-wrap: anywhere;
  }

  .sui-action-menu-description {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    overflow-wrap: anywhere;
  }

  .sui-action-menu-separator {
    background-color: var(--sui-popover-border);
    block-size: var(--sui-stroke);
    margin: var(--sui-space-1) calc(-1 * var(--sui-space-1));
  }

  /* The highlight is a veil, which high contrast drops, so it draws an outline there. */
  @media (forced-colors: active) {
    .sui-action-menu-item:focus:not([aria-disabled='true']),
    .sui-action-menu-item.active {
      outline: var(--sui-focus-ring-width) solid Highlight;
      outline-offset: var(--sui-focus-ring-inset);
    }
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
