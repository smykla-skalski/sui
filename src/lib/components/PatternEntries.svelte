<script lang="ts">
  import { mark, word } from '../words.js';
  import { tick } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import { tokenizeGlob } from '../internal/glob-syntax.js';
  import { held as heldByWork, holdAround } from '../internal/held.svelte.js';
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
  /* The list's own save, or work on the form around it, holds every entry as it stands. */
  const around = holdAround();
  const busy = $derived(pending || heldByWork(root, around) !== null);
  /* A busy dialog or a saving pane has moved focus to its busy action, so the list is disabled. */
  const firm = $derived(heldByWork(root, around) === 'firm');
  let adder = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let removers = $state<(HTMLButtonElement | null)[]>([]);
  /* The entry being typed into that showed no problem when focus came, so a half-typed pattern
     is judged once the reader leaves it rather than at every keystroke. */
  let quiet = $state<number | null>(null);
  /* What an entry held when focus came, so emptying it and leaving can be undone. */
  let held = $state<{ index: number; pattern: string } | null>(null);
  let removed = $state<{ index: number; pattern: string } | null>(null);
  let said = $state('');
  /* The entry an input method is composing in, which shows its own text for the composition's
     marks. */
  let composing = $state<number | null>(null);

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
    if (busy) return;
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
    if (busy) return;
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

  /* The colored copy under a field follows the field's own scroll, so each color stays under
     the character it colors while a long pattern scrolls. Only a composited shift moves. */
  const follow: Attachment<HTMLInputElement> = (input) => {
    const line = input.previousElementSibling?.firstElementChild;
    if (!(line instanceof HTMLElement)) return;
    const sync = () => line.style.setProperty('translate', `${-input.scrollLeft}px 0`);
    input.addEventListener('scroll', sync, { passive: true });
    return () => input.removeEventListener('scroll', sync);
  };

  // A paste of several lines becomes one entry per line, so a list copied from elsewhere goes
  // in at once.
  async function paste(index: number, event: ClipboardEvent): Promise<void> {
    if (busy) return;
    const lines = (event.clipboardData?.getData('text') ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    const keep = value[index]?.trim() ? 1 : 0;
    value = value.toSpliced(index + keep, 1 - keep, ...lines);
    // Every pasted line is reported for the paste; leaving the replaced entry is not a new add.
    held = { index, pattern: value[index] ?? '' };
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
end, and the entries flow side by side and wrap as tags do. An `add` button follows the last
entry on its line, opens an empty entry and moves focus to it. Backspace in an empty entry
steps back to the one before. Leaving an entry empty drops it, and a pattern that goes either
way can be brought back with Undo.

Each pattern shows its glob syntax in the code palette's roles: wildcards (`*`, `**`, `?`),
a leading `!`, the characters a set (`[…]`, `{a,b}`) lists or an escape makes literal, and the
separators and brackets between the plain names. A field cannot color parts of its value, so
its own words are clear and a colored copy that no reader hears lies under them, following the
field's scroll; an input method's composition and forced colors show the field's own words.

`validate` judges each pattern against the whole list, so it can refuse a duplicate. A new
pattern is judged once the reader leaves it, and one already marked is judged again as it is
fixed. The entry takes the danger edge and an alert mark, its problem stands under the entries
after the pattern it names, and it describes the entry; the text stays as typed until the
reader fixes it. `pending` holds the list while a save that carries it runs, and a busy dialog or
a saving pane around it holds it the same way.

- Semantics: a `div` with `role="group"`, named by the caller's `aria-labelledby` or `aria-label`, holding a list of joined fields, each a text field named by `entryLabel` and a remove button named by `removeLabel`, and an `add` button as the list's last item.
- Content: one pattern per entry of any length; a paste of several lines adds one entry per line.
- States: rest (the pattern in its syntax colors, each 4.5:1 on every ground the field takes, in a changed row too), hover and focus on the field (its ring) and on the cross (its own inset ring, a selection as opaque as a code block's), pressed cross (a deeper veil and an inset shadow), invalid (the danger edge, an alert mark and the problem under the entries), removed (`removedLabel` with Undo), pending (busy, every entry read only at the disabled opacity, and Add and Undo loading) and disabled.
- Keyboard: Tab walks each field and its cross, then Add, then Undo; typing, selection, undo and input methods are the field's own; Backspace in an empty entry moves to the end of the one before; Enter in a field does nothing of its own, so a surrounding form can submit.
- Pointer and touch: the field, its cross and Add are one height, 34px, or 44px on a phone or any touch screen; the cross is a square of the field's height with its chip 4px inside the frame, so its target reaches the frame and never the pattern's.
- Focus: Add moves focus to the new entry; a removal moves it to the entry that took its place, else the one before, else Add; Undo moves it back to the restored entry; a pending list keeps focus where it is.
- Responsive: each field is as wide as its pattern, at least a few characters and at most the list's width, and the entries wrap from the start edge, Add after the last one on its line or on a line of its own; a pattern longer than the line scrolls inside its field.
- Accessibility: the group is named by the caller and is `aria-busy` while pending; a screen reader hears each field's plain value, never the colored copy; problems, removals and pastes are said through a polite status; each problem describes its field and names the pattern it is about.
- Localization: every word is a prop, the counted and named ones functions; counts are grouped in the page's language; the entries flow from the inline start with the cross at each field's inline end, and a pattern reads left to right in either direction.
- Performance: every entry renders and sizes itself to its text with `field-sizing` where the browser has it, else at a fixed width; a keystroke colors one pattern again, and a scroll moves only its copy by a composited shift; `validate` runs for the other entries only when the list they are judged against changes, never at a keystroke in an entry the reader is still typing; keep it to tens of patterns.
- Analytics: `onadd` hears each pattern added and `onremove` each one removed.
- Failure: an invalid pattern stays as typed and says why, and a malformed glob, such as an unclosed `[` or `{`, shows as plain characters; an empty list shows only Add; a pending list refuses edits, removals, pastes and Undo until the save ends.
-->

<div
  bind:this={root}
  role="group"
  aria-busy={pending || undefined}
  {...rest}
  class={['sui-pattern-entries', className]}
>
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
        <JoinedField invalid={problem !== null} disabled={disabled || busy}>
          {#snippet start()}
            <!-- A label, so a press on the mark lands in the field it marks. -->
            <label class="sui-pattern-value">
              {#if problem !== null}
                <span class="sui-pattern-mark"><Icon name="alert" size="xs" /></span>
              {/if}
              <!-- A field's value cannot be painted in parts, so its own text is clear and a
                   colored copy that no reader hears lies under it. -->
              <span class={['sui-pattern-text', { composing: composing === index }]}>
                <code class="sui-pattern-copy" dir="ltr" aria-hidden="true"
                  ><span class="sui-pattern-line"
                    >{#each tokenizeGlob(pattern) as piece, at (at)}<span class={piece.cls}
                        >{piece.text}</span
                      >{/each}</span
                  ></code
                >
                <input
                  class="sui-pattern-input"
                  dir="ltr"
                  value={pattern}
                  aria-label={entryLabel(index + 1)}
                  aria-invalid={problem !== null || undefined}
                  aria-describedby={problem === null ? undefined : problemId(index)}
                  autocomplete="off"
                  spellcheck="false"
                  disabled={disabled || firm}
                  readonly={busy}
                  aria-disabled={busy || undefined}
                  {@attach follow}
                  oninput={(event) => write(index, event.currentTarget.value)}
                  onkeydown={(event) => back(index, event)}
                  oncompositionstart={() => (composing = index)}
                  oncompositionend={() => (composing = null)}
                />
              </span>
            </label>
          {/snippet}
          {#snippet end()}
            <button
              bind:this={removers[index]}
              type="button"
              class="sui-pattern-remove"
              aria-label={removeName}
              aria-disabled={busy || undefined}
              disabled={disabled || firm}
              onclick={() => remove(index)}
            >
              <span class="sui-pattern-glyph"><Icon name="close" size="xs" strokeWidth={2} /></span>
            </button>
          {/snippet}
        </JoinedField>
        <Tooltip anchor={removers[index]} text={removeName} />
      </li>
    {/each}
    <li class="sui-pattern-add">
      <Button
        tone="add"
        bind:element={adder}
        disabled={disabled || firm}
        loading={busy}
        onclick={add}
      >
        {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
        {addLabel}
      </Button>
    </li>
  </ul>
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
      <Button tone="ghost" disabled={disabled || firm} loading={busy} onclick={undo}>
        {#snippet icon()}<Icon name="undo" size="sm" />{/snippet}
        {undoLabel}
      </Button>
    </div>
  {/if}
  <VisuallyHidden role="status">{said}</VisuallyHidden>
</div>

<style>
  .sui-pattern-entries {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  /* On touch the cross's 44px box lies over the field's frame, and the clip lets it reach the
     frame's outer edge, never past it, so the targets of neighbouring lines stay apart (L-38). */
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

  /* Add follows the last entry on its line and wraps like one, at the entries' height. */
  .sui-pattern-entry,
  .sui-pattern-add {
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

  /* The field's own start padding follows the mark, so the mark gives back all but 4px of it
     and the pattern stands 4px after it, the field's transparent start lying over its end. */
  .sui-pattern-mark {
    color: var(--sui-danger);
    display: flex;
    flex: none;
    margin-inline: var(--sui-space-2) calc(var(--sui-space-1) - var(--sui-space-2));
  }

  /* The field and its colored copy share one cell, and only the field sizes it. */
  .sui-pattern-text {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  /* Both set the pattern alike, so every character of the copy lies under the field's own.
     Each is one line tall inside padding that makes up the control height: a field taller than
     its line places its words a pixel lower than a block of the same line does. Every
     character of a glob shows as typed: the mono face joins `/**` into one glyph, and Chrome
     drops its slash from typed text. */
  .sui-pattern-input,
  .sui-pattern-copy {
    box-sizing: border-box;
    font: var(--sui-weight-regular) var(--sui-font-size-input) / var(--sui-leading-input)
      var(--sui-mono);
    font-variant-ligatures: none;
    font-variant-numeric: tabular-nums;
    grid-area: 1 / 1;
    margin: 0;
    padding-block: round(
      calc(
        (
            var(--sui-local-control-height, var(--sui-control-height-compact)) -
              var(--sui-leading-input)
          ) /
          2
      ),
      1px
    );
    padding-inline: var(--sui-space-2);
    text-align: match-parent;
  }

  /* The ground, edge and ring are the joined field's, and the words are the copy's, so the
     field draws only its caret and a selection as opaque as a code block's (L-65). It stands
     over the copy, which its clip lifts into a layer of its own, so a selection covers the
     copy's colors. Without `field-sizing` every entry is the field's own width of about twenty
     characters. */
  .sui-pattern-input {
    background: transparent;
    border: 0;
    caret-color: var(--sui-text-primary);
    color: transparent;
    inline-size: 100%;
    min-inline-size: 0;
    outline: none;
    position: relative;
  }

  .sui-pattern-input::selection {
    background-color: var(--sui-code-selection-bg);
    color: var(--sui-code-selection-ink);
  }

  /* Clipped to its content box, where the field clips its own text as it scrolls. */
  .sui-pattern-copy {
    clip-path: inset(0 var(--sui-space-2));
    color: var(--sui-text-primary);
    contain: inline-size;
    pointer-events: none;
    user-select: none;
    white-space: pre;
  }

  .sui-pattern-line {
    display: inline-block;
  }

  /* An input method draws its own marks under the text it composes, so the field shows its
     words until the composition ends. */
  .composing > .sui-pattern-input {
    color: var(--sui-text-primary);
  }

  .composing > .sui-pattern-copy {
    visibility: hidden;
  }

  .tok-const {
    color: var(--sui-code-const);
  }

  .tok-key {
    color: var(--sui-code-key);
  }

  .tok-str {
    color: var(--sui-code-string);
  }

  .tok-pun {
    color: var(--sui-code-punct);
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

  /* The cross takes the field's whole end: a square as tall as the field that lies over its
     frame, so a line of entries and Add is one height (L-101) and on touch the box itself is
     the 44px target. Its quiet chip stands 4px inside the frame, as the copy chip in a link field
     does: the ground under the glyph, and over it the inset ring, so focus on it never looks
     like focus on the pattern. A part of a shared frame presses without a sink (L-42). */
  .sui-pattern-remove {
    align-items: center;
    appearance: none;
    background-color: transparent;
    block-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    border: 0;
    box-sizing: border-box;
    color: var(--sui-text-muted);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    inline-size: var(--sui-local-control-height, var(--sui-control-height-compact));
    justify-content: center;
    margin-block: calc(-1 * var(--sui-stroke));
    margin-inline: 0 calc(-1 * var(--sui-stroke));
    padding: 0;
    position: relative;
    touch-action: manipulation;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
  }

  .sui-pattern-remove::before,
  .sui-pattern-remove::after {
    border-radius: var(--sui-radius-chip);
    content: '';
    inset: calc(var(--sui-stroke) + var(--sui-space-1));
    position: absolute;
  }

  /* Laid out after the chip's ground, so the glyph paints over it. */
  .sui-pattern-glyph {
    display: flex;
    position: relative;
  }

  @media (hover: hover) {
    .sui-pattern-remove:hover:not(:active, :disabled, [aria-disabled='true']) {
      color: var(--sui-text-primary);
    }

    .sui-pattern-remove:hover:not(:active, :disabled, [aria-disabled='true'])::before {
      background-color: var(--sui-interactive-hover-layer);
    }
  }

  .sui-pattern-remove:active:not(:disabled, [aria-disabled='true']) {
    color: var(--sui-text-primary);
  }

  .sui-pattern-remove:active:not(:disabled, [aria-disabled='true'])::before {
    background-color: var(--sui-interactive-pressed);
    box-shadow: var(--sui-pressed-inset);
  }

  .sui-pattern-remove:focus-visible {
    color: var(--sui-text-primary);
    outline: none;
  }

  .sui-pattern-remove:focus-visible::after {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-inset);
  }

  /* The joined field dims the whole entry, so the cross takes no opacity of its own. */
  .sui-pattern-remove:is(:disabled, [aria-disabled='true']) {
    cursor: default;
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

  /* High contrast drops the veil, so a hovered cross draws its chip's edge instead, and the
     field shows its own words, plain, in place of the colored copy. */
  @media (hover: hover) and (forced-colors: active) {
    .sui-pattern-remove:hover:not(:disabled, [aria-disabled='true'], :focus-visible)::before {
      outline: var(--sui-stroke) solid Highlight;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }

  @media (forced-colors: active) {
    .sui-pattern-input {
      color: CanvasText;
    }

    .sui-pattern-copy {
      display: none;
    }
  }
</style>
