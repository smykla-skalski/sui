<script lang="ts">
  import { word } from '../words.js';
  import { tick } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { formatCount } from '../internal/locale.js';
  import Button from './Button.svelte';
  import IconButton from './IconButton.svelte';
  import TextInput from './TextInput.svelte';
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
    /** Each remove control's name, given its pattern. */
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
    disabled?: boolean;
    /** Layout for the call site only, never the list's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> = $props();

  let root = $state<HTMLElement | null>(null);
  let adder = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
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

  const fields = () => [...(root?.querySelectorAll('input') ?? [])];

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

  async function remove(index: number): Promise<void> {
    drop(index, value[index] ?? '');
    await tick();
    (fields()[index] ?? adder)?.focus();
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
  // can be brought back.
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

  // A paste of several lines becomes one entry per line, so a list copied from elsewhere goes
  // in at once.
  async function paste(index: number, event: ClipboardEvent): Promise<void> {
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
`TextInput` edited where it stands, with a 34px square cross that removes it, and the list ends
with an `add` button that opens an empty entry and moves focus to it. Leaving an entry empty
drops it, and a pattern that goes either way can be brought back with Undo.

`validate` judges each pattern against the whole list, so it can refuse a duplicate. A new
pattern is judged once the reader leaves it, and one already marked is judged again as it is
fixed. The answer stands 8px under the entry, which is marked invalid and described by it, and
the text stays as typed until the reader fixes it.

- Semantics: a `div` with `role="group"`, named by the caller's `aria-labelledby` or `aria-label`, holding a list of text fields, each named by `entryLabel`, its remove button, and an `add` button.
- Content: one pattern per entry of any length; a paste of several lines adds one entry per line.
- States: rest, focus, invalid (the danger edge and the problem under the entry), removed (`removedLabel` with Undo) and disabled.
- Keyboard: Tab walks each field and its remove button, then Undo and Add; Enter in a field does nothing of its own, so a surrounding form can submit.
- Pointer and touch: the remove buttons and Add are 34px, 44px on a phone.
- Focus: Add moves focus to the new entry; a removal moves it to the entry that took its place, else Add; Undo moves it back to the restored entry.
- Responsive: each field takes the room the list has, so a long pattern shows as much as fits; the list stacks one entry per line.
- Accessibility: the group is named by the caller; problems, removals and pastes are said through a polite status; each problem describes its field.
- Localization: every word is a prop, the counted and named ones functions; counts are grouped in the page's language; the remove button sits at the inline end.
- Performance: every entry renders; `validate` runs for the other entries only when the list they are judged against changes, never at a keystroke in an entry the reader is still typing; keep it to tens of patterns.
- Analytics: `onadd` hears each pattern added and `onremove` each one removed.
- Failure: an invalid pattern stays as typed and says why; an empty list shows only Add.
-->

<div bind:this={root} role="group" {...rest} class={['sui-pattern-entries', className]}>
  {#if value.length > 0}
    <ul class="sui-pattern-list" role="list">
      {#each value as pattern, index (index)}
        {@const problem = problems[index]}
        <li
          class="sui-pattern-entry"
          onfocusin={(event) => enter(index, event)}
          onfocusout={(event) => settle(index, event)}
          onpaste={(event) => paste(index, event)}
        >
          <div class="sui-pattern-line">
            <span class="sui-pattern-field">
              <TextInput
                mono
                value={pattern}
                aria-label={entryLabel(index + 1)}
                invalid={problem !== null}
                aria-describedby={problem === null ? undefined : `${uid}-problem-${index}`}
                autocomplete="off"
                spellcheck="false"
                {disabled}
                oninput={(event) => write(index, event.currentTarget.value)}
              />
            </span>
            <IconButton
              toolbar
              icon="close"
              label={pattern.trim() === '' ? removeEmptyLabel : removeLabel(pattern.trim())}
              {disabled}
              onclick={() => remove(index)}
            />
          </div>
          {#if problem !== null}
            <p id="{uid}-problem-{index}" class="sui-pattern-problem">{problem}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if removed}
    <div class="sui-pattern-removed">
      <span class="sui-pattern-said">{removedLabel(removed.pattern)}</span>
      <Button tone="ghost" {disabled} onclick={undo}>
        {#snippet icon()}<Icon name="undo" size="sm" />{/snippet}
        {undoLabel}
      </Button>
    </div>
  {/if}
  <Button tone="add" bind:element={adder} {disabled} onclick={add}>
    {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
    {addLabel}
  </Button>
  <VisuallyHidden role="status">{said}</VisuallyHidden>
</div>

<style>
  .sui-pattern-entries {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-pattern-list {
    display: grid;
    gap: var(--sui-space-2);
    justify-self: stretch;
    list-style: none;
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-pattern-entry {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .sui-pattern-line {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  /* At least a readable width, and as wide as the list allows, so a long pattern is cut only
     where the room ends. */
  .sui-pattern-field {
    display: grid;
    flex: 1 1 16rem;
    min-inline-size: 0;
  }

  /* Contained, so a long reason wraps under its entry instead of widening the list. */
  .sui-pattern-problem {
    block-size: var(--sui-block-snap);
    color: var(--sui-danger);
    contain: inline-size;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-pattern-removed {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .sui-pattern-said {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
