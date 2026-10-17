<script module lang="ts">
  export type Pair = { key: string; value: string };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Button from './Button.svelte';
  import Combobox, { type ComboboxOption } from './Combobox.svelte';
  import Field from './Field.svelte';
  import Popover from './Popover.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();

  let {
    value = $bindable([]),
    options,
    keyLabel = 'Key',
    valueLabel = 'Value',
    validate,
    addLabel = 'Add a pair',
    doneLabel = 'Done',
    removeLabel = 'Remove',
    removeName = (key: string) => `${removeLabel} ${key}`,
    removedLabel = (key: string) => `Removed ${key}`,
    reason,
    onadd,
    onedit,
    onremove,
    disabled = false,
    class: className = '',
    ...rest
  }: {
    value?: Pair[];
    /** The values a pair may map to. A pair's chip shows the chosen option's label. */
    options: readonly ComboboxOption[];
    /** Names the key, such as "Alias": the editor's first field and every chip's spoken name. */
    keyLabel?: string;
    /** Names the value, such as "Command": the editor's second field. */
    valueLabel?: string;
    /** Says what is wrong with a key, or null when it is fine. `index` is the pair's place in `pairs`. */
    validate?: (key: string, index: number, pairs: readonly Pair[]) => string | null;
    /** The add button's words, specific to what the pairs are. */
    addLabel?: string;
    /** The editor's confirming button. */
    doneLabel?: string;
    /** The editor's remove button. */
    removeLabel?: string;
    /** Each chip's remove control's name, given the pair's key. */
    removeName?: (key: string) => string;
    /** Said once a pair has gone, given its key. */
    removedLabel?: (key: string) => string;
    /** Why the pairs are read only, drawn under them and tied to every chip and to Add. */
    reason?: string;
    /** Hears each new pair once Done accepts it. */
    onadd?: (pair: Pair) => void;
    /** Hears each changed pair once Done accepts it, with its place. */
    onedit?: (pair: Pair, index: number) => void;
    /** Hears each removed pair. */
    onremove?: (pair: Pair) => void;
    disabled?: boolean;
    /** Layout for the call site only, never the chips' own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> = $props();

  const editorId = `${uid}-editor`;
  const reasonId = `${uid}-reason`;
  const problemId = (index: number) => `${uid}-problem-${index}`;
  const described = (index?: number) =>
    [reason && reasonId, index !== undefined && problems[index] && problemId(index)]
      .filter(Boolean)
      .join(' ') || undefined;

  let root = $state<HTMLElement | null>(null);
  let adder = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let anchor = $state<HTMLElement | null>(null);
  let form = $state<HTMLFormElement | null>(null);
  let open = $state(false);
  /** The pair in the editor: its index, or -1 for a new one. */
  let editing = $state(-1);
  let draft = $state<Pair>({ key: '', value: '' });
  let draftProblem = $state<string | null>(null);
  let said = $state('');

  const labelOf = (pick: string) => options.find((option) => option.value === pick)?.label ?? pick;
  const problems = $derived(
    value.map((pair, index) => validate?.(pair.key.trim(), index, value) ?? null)
  );

  const chips = () => [...(root?.querySelectorAll<HTMLElement>('.sui-pair-edit') ?? [])];

  const focusKey = () => form?.querySelector('input')?.focus({ preventScroll: true });

  // The invoker's press lands before the browser opens the editor, so the draft is seeded here
  // and the editor opens on the pair that was pressed. A press while it is open only closes it.
  function seed(index: number, event: MouseEvent & { currentTarget: HTMLElement }): void {
    if (open) return;
    editing = index;
    draft = index < 0 ? { key: '', value: options[0]?.value ?? '' } : { ...value[index] };
    draftProblem = null;
    anchor = event.currentTarget;
  }

  // Focus goes to the pair that took the removed one's place, else the one before, else Add,
  // so it never falls to the page (L-89).
  async function remove(index: number): Promise<void> {
    const gone = value[index];
    value = value.filter((_, at) => at !== index);
    open = false;
    if (gone) {
      said = removedLabel(gone.key);
      onremove?.(gone);
    }
    await tick();
    const left = chips();
    (left[index] ?? left[index - 1] ?? adder)?.focus();
  }

  function done(event: SubmitEvent): void {
    event.preventDefault();
    const pair = { key: draft.key.trim(), value: draft.value };
    const at = editing < 0 ? value.length : editing;
    const next = value.toSpliced(at, 1, pair);
    draftProblem = validate?.(pair.key, at, next) ?? null;
    if (draftProblem) {
      focusKey();
      return;
    }
    value = next;
    open = false;
    if (editing < 0) onadd?.(pair);
    else onedit?.(pair, at);
  }

  // Delete and Backspace remove a focused chip, as an accelerator for its remove control.
  function chipKeys(index: number, event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    event.preventDefault();
    void remove(index);
  }
</script>

<!--
@component
Pairs of a key and the value it maps to, such as aliases and the commands they run, as chips
that wrap side by side: "ship → deploy". Pressing a chip opens an editor beside it with a field
for the key and a picker of `options` for the value; Done checks the key with `validate` and
keeps the editor open, focused on the key, while it is wrong. Escape or a press outside closes
the editor and drops its draft, and focus returns to the chip. `addLabel` opens the same editor
for a new pair, which joins the end of the row on Done.

In a `SettingRow`, give the row's `labelledby` to this group. The chips wrap within the room the
row gives them and fall under the copy on a narrow row.

- Semantics: a `div` with `role="group"` holding a list of chips, each an edit `button` with `aria-haspopup="dialog"` and a remove `button`, an `add` button, and a dialog `Popover` with a `Field` and a `Combobox`.
- Content: pairs of a short key and one of `options`; a long key or value ends in an ellipsis inside its chip, and the editor shows it whole.
- States: rest, hover, pressed and focus on each part, open (the chip's edge takes the focus color), invalid (the danger edge, an alert mark and the problem in words under the row), and disabled with `reason`.
- Keyboard: Tab walks each chip's edit and remove parts, then Add; Enter or Space opens the editor; Delete or Backspace on a chip removes it; in the editor Enter is Done and Escape closes.
- Pointer and touch: each part is 28px, and 44px on a phone or a coarse pointer; the remove part sits outside the edit target.
- Focus: the editor opens on the key field and returns focus to its chip on close; after a removal focus moves to the next chip, the one before, or Add.
- Responsive: chips wrap one by one within the row's room, and the editor is at most 20rem wide and inside the viewport.
- Accessibility: every chip is named by `keyLabel` and `valueLabel`, such as "Alias ship, Command deploy"; a problem and `reason` describe the chips; a removal is said through a polite status.
- Localization: every word is a prop, the named ones functions of the key; the arrow between key and value turns with the reading direction.
- Performance: every pair renders a chip, and one editor serves them all.
- Analytics: `onadd`, `onedit` and `onremove` hear each accepted change.
- Failure: a key `validate` refuses keeps the editor open with the problem and never reaches `value`; a stored pair it refuses is marked and described; with `disabled` the chips read only, so say why with `reason`.
-->

<div
  {...rest}
  bind:this={root}
  class={['sui-pair-entry', className, { disabled }]}
  role="group"
  aria-describedby={rest['aria-describedby'] ?? (reason ? reasonId : undefined)}
>
  <ul class="sui-pair-chips" role="list">
    {#each value as pair, index (index)}
      <li>
        <span
          class={['sui-pair-chip', { invalid: problems[index], open: open && editing === index }]}
        >
          <button
            type="button"
            class="sui-pair-edit"
            popovertarget={editorId}
            aria-haspopup="dialog"
            aria-expanded={open && editing === index}
            aria-describedby={described(index)}
            {disabled}
            onclick={(event) => seed(index, event)}
            onkeydown={(event) => chipKeys(index, event)}
          >
            {#if problems[index]}<span class="sui-pair-mark"><Icon name="alert" size="xs" /></span
              >{/if}
            <VisuallyHidden>{keyLabel}</VisuallyHidden>
            <code class="sui-pair-key">{pair.key}</code>
            <span class="sui-pair-arrow" aria-hidden="true">→</span>
            <VisuallyHidden>, {valueLabel}</VisuallyHidden>
            <code class="sui-pair-value">{labelOf(pair.value)}</code>
          </button>
          <span class="sui-pair-divider" aria-hidden="true"></span>
          <button
            type="button"
            class="sui-pair-remove"
            aria-label={removeName(pair.key)}
            aria-describedby={described()}
            {disabled}
            onclick={() => remove(index)}
          >
            <Icon name="close" size="xs" />
          </button>
        </span>
      </li>
    {/each}
    <li>
      <Button
        bind:element={adder}
        tone="add"
        popovertarget={editorId}
        aria-haspopup="dialog"
        aria-expanded={open && editing < 0}
        aria-describedby={described()}
        {disabled}
        onclick={(event: MouseEvent & { currentTarget: HTMLElement }) => seed(-1, event)}
      >
        {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
        {addLabel}
      </Button>
    </li>
  </ul>
  {#each value as pair, index (index)}
    {#if problems[index]}
      <p id={problemId(index)} class="sui-pair-problem">
        <code>{pair.key}</code>: {problems[index]}
      </p>
    {/if}
  {/each}
  {#if reason}<p id={reasonId} class="sui-pair-reason">{reason}</p>{/if}
  <VisuallyHidden role="status">{said}</VisuallyHidden>
</div>

<Popover
  id={editorId}
  {anchor}
  bind:open
  role="dialog"
  aria-label={editing < 0 ? addLabel : `${keyLabel} ${value[editing]?.key ?? ''}`}
  ontoggle={(event: ToggleEvent) => {
    if (event.newState === 'open') void tick().then(focusKey);
  }}
>
  <form bind:this={form} class="sui-pair-editor" onsubmit={done}>
    <Field
      label={keyLabel}
      bind:value={draft.key}
      error={draftProblem ?? undefined}
      autocomplete="off"
      spellcheck="false"
    />
    <Field label={valueLabel}>
      {#snippet control({ id, describedby })}
        <Combobox {id} bind:value={draft.value} {options} aria-describedby={describedby} />
      {/snippet}
    </Field>
    <div class="sui-pair-actions">
      {#if editing >= 0}
        <Button tone="ghost" onclick={() => remove(editing)}>{removeLabel}</Button>
      {/if}
      <Button tone="signal" type="submit">{doneLabel}</Button>
    </div>
  </form>
</Popover>

<style>
  /* A chip is 28px on a pointer and a finger's 44px on a phone (L-38), and so are its parts. */
  .sui-pair-entry {
    --sui-pair-chip: var(--sui-tier-quiet);
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    min-inline-size: 0;
  }

  .sui-pair-chips {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    max-inline-size: 100%;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-pair-chips > li {
    display: flex;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* The frame is drawn over the chip, not around it, so each part is a whole control tier tall
     and the remove part is square (L-37, L-44). */
  .sui-pair-chip {
    --sui-pair-edge: var(--sui-control-border);
    background-color: var(--sui-control-bg);
    border-radius: var(--sui-radius-control);
    display: flex;
    max-inline-size: 100%;
    min-inline-size: 0;
    position: relative;
  }

  .sui-pair-chip::after {
    border: var(--sui-stroke) solid var(--sui-pair-edge);
    border-radius: inherit;
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
    transition: border-color var(--sui-duration-fast) var(--sui-ease-standard);
  }

  @media (hover: hover) {
    .sui-pair-chip:hover:not(.invalid, .open) {
      --sui-pair-edge: var(--sui-control-border-hover);
    }
  }

  .sui-pair-chip.open {
    --sui-pair-edge: var(--sui-focus);
  }

  .sui-pair-chip.invalid {
    --sui-pair-edge: var(--sui-danger);
  }

  .sui-pair-edit,
  .sui-pair-remove {
    align-items: center;
    appearance: none;
    background-color: transparent;
    block-size: var(--sui-pair-chip);
    border: 0;
    border-radius: inherit;
    box-sizing: border-box;
    color: var(--sui-text-secondary);
    cursor: pointer;
    display: flex;
    margin: 0;
    position: relative;
    touch-action: manipulation;
    transition: background-color var(--sui-duration-fast) var(--sui-ease-standard);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
  }

  /* The parts share the chip's frame, so each keeps only its own two round corners and its
     ring stays inside the frame (L-41). */
  .sui-pair-edit {
    border-end-end-radius: 0;
    border-start-end-radius: 0;
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    gap: var(--sui-space-1);
    min-inline-size: 0;
    padding-inline: var(--sui-space-2);
  }

  .sui-pair-remove {
    border-end-start-radius: 0;
    border-start-start-radius: 0;
    color: var(--sui-text-muted);
    flex: none;
    inline-size: var(--sui-pair-chip);
    justify-content: center;
    padding: 0;
  }

  .sui-pair-divider {
    background-color: var(--sui-pair-edge);
    flex: none;
    inline-size: var(--sui-stroke);
  }

  .sui-pair-mark {
    color: var(--sui-danger);
    display: flex;
    flex: none;
  }

  @media (hover: hover) {
    :is(.sui-pair-edit, .sui-pair-remove):hover:not(:disabled, :active) {
      background-color: var(--sui-interactive-hover-layer);
      color: var(--sui-text-primary);
    }
  }

  :is(.sui-pair-edit, .sui-pair-remove):active:not(:disabled) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  :is(.sui-pair-edit, .sui-pair-remove):focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  .sui-pair-key,
  .sui-pair-value {
    font: var(--sui-weight-regular) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sui-pair-key {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-medium);
  }

  /* The arrow points from the key to its value, so it turns with the reading direction. */
  .sui-pair-arrow {
    color: var(--sui-text-muted);
    flex: none;
    font-family: var(--sui-sans);
  }

  .sui-pair-arrow:dir(rtl) {
    scale: -1 1;
  }

  .disabled .sui-pair-chip {
    opacity: var(--sui-disabled-opacity);
  }

  .disabled :is(.sui-pair-edit, .sui-pair-remove) {
    cursor: default;
  }

  .sui-pair-problem code {
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-mono);
  }

  .sui-pair-reason {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-pair-problem {
    block-size: var(--sui-block-snap);
    color: var(--sui-danger);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-pair-editor {
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-4);
    inline-size: min(20rem, calc(100vw - 2 * var(--sui-space-2) - 2 * var(--sui-stroke)));
    margin: 0;
    padding: var(--sui-space-4);
  }

  .sui-pair-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-content: flex-end;
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-pair-entry {
      --sui-pair-chip: var(--sui-touch-target);
    }
  }

  /* High contrast draws every edge in one ink, so the chip whose editor is open keeps the
     system's selection color. */
  @media (forced-colors: active) {
    .sui-pair-chip.open::after {
      border-color: Highlight;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sui-pair-chip::after,
    .sui-pair-edit,
    .sui-pair-remove {
      transition: none;
    }
  }
</style>
