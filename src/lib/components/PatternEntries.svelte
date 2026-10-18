<script lang="ts">
  import { mark, word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import JoinedField from '../internal/JoinedField.svelte';
  import { formatCount } from '../internal/locale.js';
  import Button from './Button.svelte';
  import Tooltip from './Tooltip.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const uid = $props.id();

  let {
    value = $bindable([]),
    validate,
    addLabel = word('PatternEntries.addLabel', 'Add a pattern'),
    entryLabel = word('PatternEntries.entryLabel', (position: number) => `Pattern ${position}`),
    removeLabel = word('PatternEntries.removeLabel', (pattern: string) => `Remove ${pattern}`),
    removeEmptyLabel = word('PatternEntries.removeEmptyLabel', 'Remove the empty pattern'),
    removedLabel = word('PatternEntries.removedLabel', (pattern: string) => `Removed ${pattern}`),
    addedLabel = word(
      'PatternEntries.addedLabel',
      (count: number, formatted: string) =>
        `Added ${formatted} ${count === 1 ? 'pattern' : 'patterns'}`
    ),
    undoLabel = word('PatternEntries.undoLabel', 'Undo'),
    onadd,
    onremove,
    pending = false,
    disabled = false,
    class: className = '',
    ...rest
  }: {
    value?: string[];
    /** Says what is wrong with one pattern, or null when it is fine. An empty entry is never asked about. */
    validate?: (pattern: string, index: number, patterns: readonly string[]) => string | null;
    /** The add button's words, specific to what the patterns match. */
    addLabel?: string;
    /** Each field's name inside the group, given its place from 1. */
    entryLabel?: (position: number) => string;
    /** Each remove control's name and tooltip, given its pattern. */
    removeLabel?: (pattern: string) => string;
    removeEmptyLabel?: string;
    /** Said and shown once a pattern has gone, beside Undo. */
    removedLabel?: (pattern: string) => string;
    /** Said after a paste of several lines, given the count and the count formatted. */
    addedLabel?: (count: number, formatted: string) => string;
    undoLabel?: string;
    /** Hears each pattern added, one call per pasted line. */
    onadd?: (pattern: string) => void;
    /** Hears each pattern removed, by its control or by being emptied. */
    onremove?: (pattern: string) => void;
    /** The list is being saved: it is busy, and holds every entry as it stands until the save ends. */
    pending?: boolean;
    disabled?: boolean;
    /** Layout for the call site only, never the list's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> = $props();

  let root = $state<HTMLElement | null>(null);
  let adder = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let removers = $state<(HTMLButtonElement | null)[]>([]);
  /* The entry being typed into that showed no problem when focus came, so a half-typed pattern
     is judged once the reader leaves it rather than at every keystroke. */
  let quiet = $state<number | null>(null);
  /* What an entry held when focus came, so emptying it and leaving can be undone. */
  let held = $state<{ index: number; pattern: string } | null>(null);
  let removed = $state<{ index: number; pattern: string } | null>(null);
  let said = $state('');

  /* The other entries are judged against the list as it stood before the entry in hand was
     typed into, so a half-typed pattern never changes another entry's verdict, and `validate`
     runs for them again only when that list changes, never at a keystroke in the entry. The
     entry in hand is quiet, or, when it showed a problem as focus came, follows each keystroke. */
  const judged = $derived(
    JSON.stringify(held === null ? value : value.toSpliced(held.index, 1, held.pattern))
  );
  const verdicts = $derived.by(() => {
    const list: string[] = JSON.parse(judged);
    return list.map((pattern, index) =>
      pattern.trim() === '' ? null : (validate?.(pattern.trim(), index, list) ?? null)
    );
  });
  const problems = $derived(
    value.map((pattern, index) => {
      if (pattern.trim() === '' || index === quiet) return null;
      if (index === held?.index) return validate?.(pattern.trim(), index, value) ?? null;
      return verdicts[index] ?? null;
    })
  );

  const problemId = (index: number) => `${uid}-problem-${index}`;
  const fields = () => [...(root?.querySelectorAll<HTMLInputElement>('.sui-pattern-input') ?? [])];

  // An empty entry already open is the new entry, so Add returns to it instead of minting another.
  async function add(): Promise<void> {
    removed = null;
    let at = value.findIndex((pattern) => pattern.trim() === '');
    if (at < 0) {
      at = value.length;
      value = [...value, ''];
    }
    await tick();
    fields()[at]?.focus();
  }

  function drop(index: number, pattern: string): void {
    value = value.filter((_, at) => at !== index);
    if (pattern.trim() === '') return;
    removed = { index, pattern: pattern.trim() };
    said = removedLabel(pattern.trim());
    onremove?.(pattern.trim());
  }

  // Focus goes to the entry that takes the removed one's place, else the one before, else Add,
  // so it never falls to the page (L-89). The items are kept by place, so the last one is the
  // item that leaves; focus moves out of it first, and leaving an empty entry may drop it there.
  // Any other item stays and holds the next entry with focus still inside, so what it now holds
  // is noted here rather than as focus comes.
  async function remove(index: number): Promise<void> {
    if (pending) return;
    if (index === value.length - 1) (fields()[index - 1] ?? adder)?.focus();
    if (index >= value.length) return;
    drop(index, value[index]);
    if (index === value.length) return;
    held = { index, pattern: value[index] };
    await tick();
    fields()[index]?.focus();
  }

  async function undo(): Promise<void> {
    if (!removed) return;
    const { index, pattern } = removed;
    value = value.toSpliced(index, 0, pattern);
    removed = null;
    said = '';
    onadd?.(pattern);
    await tick();
    fields()[index]?.focus();
  }

  function enter(index: number, event: FocusEvent & { currentTarget: HTMLElement }): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      held = { index, pattern: value[index] ?? '' };
    if (event.target instanceof HTMLInputElement) quiet = problems[index] === null ? index : null;
  }

  // Leaving the field judges it and says any problem. Clearing an entry to retype it never
  // deletes it under the keyboard; leaving the entry empty does, and one that held a pattern
  // can be brought back. A list being saved keeps every entry as it stands.
  function settle(index: number, event: FocusEvent & { currentTarget: HTMLElement }): void {
    if (event.target instanceof HTMLInputElement) {
      quiet = null;
      const typed = value[index]?.trim() ?? '';
      const problem = typed === '' ? null : (validate?.(typed, index, value) ?? null);
      if (problem) said = problem;
    }
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    const trimmed = value[index]?.trim();
    const before = held?.index === index ? held.pattern : '';
    held = null;
    if (pending) return;
    if (trimmed === '') {
      drop(index, before);
      return;
    }
    if (trimmed === undefined) return;
    if (trimmed !== value[index])
      value = value.map((pattern, at) => (at === index ? trimmed : pattern));
    if (before.trim() === '') onadd?.(trimmed);
  }

  const write = (index: number, next: string) => {
    removed = null;
    value = value.map((pattern, at) => (at === index ? next : pattern));
  };

  /* Backspace in an empty entry steps back to the end of the one before, as a token field's
     Backspace returns to its last token, and leaving drops the empty entry. It only moves
     focus, never removes a pattern, and a held key never runs on into the entry before. */
  function back(index: number, event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
    if (event.key !== 'Backspace' || event.repeat || index === 0 || event.currentTarget.value)
      return;
    const previous = fields()[index - 1];
    if (!previous) return;
    event.preventDefault();
    previous.focus();
    previous.setSelectionRange(previous.value.length, previous.value.length);
  }

  // A paste of several lines becomes one entry per line, so a list copied from elsewhere goes
  // in at once.
  async function paste(index: number, event: ClipboardEvent): Promise<void> {
    if (pending) return;
    const lines = (event.clipboardData?.getData('text') ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    const keep = value[index]?.trim() ? 1 : 0;
    value = value.toSpliced(index + keep, 1 - keep, ...lines);
    said = addedLabel(lines.length, formatCount(lines.length));
    for (const line of lines) onadd?.(line);
    await tick();
    fields()[index + keep + lines.length - 1]?.focus();
  }
</script>

<!--
@component
An editable list of patterns, such as branches or paths to leave alone. Each entry is a mono
field as wide as its pattern, edited where it stands, with its remove cross inside the field's
end, and the entries flow side by side and wrap as tags do. An `add` button under them opens
an empty entry at the end of the flow and moves focus to it. Backspace in an empty entry steps
back to the one before. Leaving an entry empty drops it, and a pattern that goes either way
can be brought back with Undo.

`validate` judges each pattern against the whole list, so it can refuse a duplicate. A new
pattern is judged once the reader leaves it, and one already marked is judged again as it is
fixed. The entry takes the danger edge and an alert mark, its problem stands under the entries
after the pattern it names, and it describes the entry; the text stays as typed until the
reader fixes it. `pending` holds the list while a save that carries it runs.

- Semantics: a `div` with `role="group"`, named by the caller's `aria-labelledby` or `aria-label`, holding a list of joined fields, each a text field named by `entryLabel` and a remove button named by `removeLabel`, and an `add` button under the list.
- Content: one pattern per entry of any length; a paste of several lines adds one entry per line.
- States: rest, hover and focus on the field (its ring) and on the cross (its own inset ring), pressed cross (a deeper veil and an inset shadow), invalid (the danger edge, an alert mark and the problem under the entries), removed (`removedLabel` with Undo), pending (busy, every entry read only at the disabled opacity, and Add and Undo loading) and disabled.
- Keyboard: Tab walks each field and its cross, then Undo and Add; Backspace in an empty entry moves to the end of the one before; Enter in a field does nothing of its own, so a surrounding form can submit.
- Pointer and touch: the field is 34px tall and its cross 24px, 4px inside the frame; on a phone or any touch screen the field is 44px and the cross's target is 44px, reaching the frame and never the pattern's target.
- Focus: Add moves focus to the new entry; a removal moves it to the entry that took its place, else the one before, else Add; Undo moves it back to the restored entry; a pending list keeps focus where it is.
- Responsive: each field is as wide as its pattern, at least a few characters and at most the list's width, and the entries wrap from the start edge; a pattern longer than the line scrolls inside its field.
- Accessibility: the group is named by the caller and is `aria-busy` while pending; problems, removals and pastes are said through a polite status; each problem describes its field and names the pattern it is about.
- Localization: every word is a prop, the counted and named ones functions; counts are grouped in the page's language; the entries flow from the inline start with the cross at each field's inline end, and a pattern reads left to right in either direction.
- Performance: every entry renders and sizes itself to its text with `field-sizing` where the browser has it, else at a fixed width; `validate` runs for the other entries only when the list they are judged against changes, never at a keystroke in an entry the reader is still typing; keep it to tens of patterns.
- Analytics: `onadd` hears each pattern added and `onremove` each one removed.
- Failure: an invalid pattern stays as typed and says why; an empty list shows only Add; a pending list refuses edits, removals, pastes and Undo until the save ends.
-->

<div
  bind:this={root}
  role="group"
  aria-busy={pending || undefined}
  {...rest}
  class={['sui-pattern-entries', className]}
>
  {#if value.length > 0}
    <ul class="sui-pattern-list" role="list">
      {#each value as pattern, index (index)}
        {@const problem = problems[index]}
        {@const removeName = pattern.trim() === '' ? removeEmptyLabel : removeLabel(pattern.trim())}
        <li
          class="sui-pattern-entry"
          onfocusin={(event) => enter(index, event)}
          onfocusout={(event) => settle(index, event)}
          onpaste={(event) => paste(index, event)}
        >
          <JoinedField invalid={problem !== null} disabled={disabled || pending}>
            {#snippet start()}
              <!-- A label, so a press on the mark lands in the field it marks. -->
              <label class="sui-pattern-value">
                {#if problem !== null}
                  <span class="sui-pattern-mark"><Icon name="alert" size="xs" /></span>
                {/if}
                <input
                  class="sui-pattern-input"
                  dir="ltr"
                  value={pattern}
                  aria-label={entryLabel(index + 1)}
                  aria-invalid={problem !== null || undefined}
                  aria-describedby={problem === null ? undefined : problemId(index)}
                  autocomplete="off"
                  spellcheck="false"
                  {disabled}
                  readonly={pending}
                  oninput={(event) => write(index, event.currentTarget.value)}
                  onkeydown={(event) => back(index, event)}
                />
              </label>
            {/snippet}
            {#snippet end()}
              <button
                bind:this={removers[index]}
                type="button"
                class="sui-pattern-remove"
                aria-label={removeName}
                aria-disabled={pending || undefined}
                {disabled}
                onclick={() => remove(index)}
              >
                <Icon name="close" size="xs" strokeWidth={2} />
              </button>
            {/snippet}
          </JoinedField>
          <Tooltip anchor={removers[index]} text={removeName} />
        </li>
      {/each}
    </ul>
  {/if}
  {#each problems as problem, index (index)}
    {#if problem !== null}
      <p id={problemId(index)} class="sui-pattern-problem">
        <code dir="ltr">{value[index]?.trim()}</code>{mark('colon')}{problem}
      </p>
    {/if}
  {/each}
  {#if removed}
    <div class="sui-pattern-removed">
      <span class="sui-pattern-said">{removedLabel(removed.pattern)}</span>
      <Button tone="ghost" {disabled} loading={pending} onclick={undo}>
        {#snippet icon()}<Icon name="undo" size="sm" />{/snippet}
        {undoLabel}
      </Button>
    </div>
  {/if}
  <Button tone="add" bind:element={adder} {disabled} loading={pending} onclick={add}>
    {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
    {addLabel}
  </Button>
  <VisuallyHidden role="status">{said}</VisuallyHidden>
</div>

<style>
  /* The cross stands 4px inside the frame on every side, as the copy chip in a link field
     does, so the field keeps the control height. */
  .sui-pattern-entries {
    --sui-local-joined-end-inset: var(--sui-space-1);
    --sui-pattern-cross: calc(
      var(--sui-local-control-height, var(--sui-control-height-compact)) - 2 * var(--sui-stroke) -
        2 * var(--sui-space-1)
    );
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* On touch the cross's 44px hit area reaches the field's outer edge, never past it, so the
     targets of entries on neighbouring lines stay apart (L-38). */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    .sui-pattern-entries {
      --sui-local-joined-reach: var(--sui-stroke);
    }
  }

  .sui-pattern-list {
    align-items: start;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-self: stretch;
    list-style: none;
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-pattern-entry {
    display: flex;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* The label lies over the frame's edge, so the field's target keeps the full control
     height. */
  .sui-pattern-value {
    align-items: center;
    display: flex;
    margin-block: calc(-1 * var(--sui-stroke));
    min-inline-size: 0;
  }

  .sui-pattern-mark {
    color: var(--sui-danger);
    display: flex;
    flex: none;
    margin-inline-start: var(--sui-space-2);
  }

  /* The ground, edge and ring are the joined field's. Without `field-sizing` every entry is the
     field's own width of about twenty characters. Every character of a glob shows as typed:
     the mono face joins `/**` into one glyph, and Chrome drops its slash from typed text. */
  .sui-pattern-input {
    background: transparent;
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 0;
    box-sizing: border-box;
    color: var(--sui-text-primary);
    flex: 1 1 auto;
    font: var(--sui-weight-regular) var(--sui-font-size-input) / var(--sui-leading-input)
      var(--sui-mono);
    font-variant-ligatures: none;
    font-variant-numeric: tabular-nums;
    margin: 0;
    min-inline-size: 0;
    outline: none;
    padding: 0 var(--sui-space-2);
  }

  .sui-pattern-mark + .sui-pattern-input {
    padding-inline-start: var(--sui-space-1);
  }

  /* As wide as the pattern, and never narrower than the 4rem a joined field keeps for its
     value, so an empty or short entry keeps room for a few characters and its cross never
     drops onto a line of its own. */
  @supports (field-sizing: content) {
    .sui-pattern-input {
      field-sizing: content;
      min-inline-size: 4rem;
    }
  }

  .sui-pattern-input:disabled {
    cursor: default;
  }

  /* A quiet square inside the field's end: no frame and no sink, as a part of a shared frame
     presses (L-42), and an inset ring of its own, so focus on it never looks like focus on the
     pattern. */
  .sui-pattern-remove {
    align-items: center;
    appearance: none;
    background-color: transparent;
    block-size: var(--sui-pattern-cross);
    border: 0;
    border-radius: var(--sui-radius-chip);
    box-sizing: border-box;
    color: var(--sui-text-muted);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-pattern-cross);
    justify-content: center;
    margin: 0;
    padding: 0;
    position: relative;
    touch-action: manipulation;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
  }

  @media (hover: hover) {
    .sui-pattern-remove:hover:not(:active, :disabled, [aria-disabled='true']) {
      background-color: var(--sui-interactive-hover-layer);
      color: var(--sui-text-primary);
    }
  }

  .sui-pattern-remove:active:not(:disabled, [aria-disabled='true']) {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
    color: var(--sui-text-primary);
  }

  .sui-pattern-remove:focus-visible {
    color: var(--sui-text-primary);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* The joined field dims the whole entry, so the cross takes no opacity of its own. */
  .sui-pattern-remove:is(:disabled, [aria-disabled='true']) {
    cursor: default;
  }

  /* A finger's 44px target reaches the frame's outer edge on three sides, and on the fourth it
     stops where the pattern's target ends, so the two never overlap (L-38). */
  @media (pointer: coarse), (max-width: 47.9375rem) {
    .sui-pattern-remove {
      margin-inline-start: calc((var(--sui-touch-target) - var(--sui-pattern-cross)) / 2);
    }

    .sui-pattern-remove::after {
      content: '';
      inset: calc((100% - var(--sui-touch-target)) / 2);
      position: absolute;
    }
  }

  /* Contained, so a long reason wraps under the entries instead of widening the list. */
  .sui-pattern-problem {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-danger);
    contain: inline-size;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    justify-self: stretch;
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-pattern-problem code {
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-mono);
  }

  .sui-pattern-removed {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-pattern-said {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  /* High contrast drops the veil, so a hovered cross draws its edge instead. */
  @media (hover: hover) and (forced-colors: active) {
    .sui-pattern-remove:hover:not(:disabled, [aria-disabled='true'], :focus-visible) {
      outline: var(--sui-stroke) solid Highlight;
      outline-offset: var(--sui-focus-ring-inset);
    }
  }
</style>
