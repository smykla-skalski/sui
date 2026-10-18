<script module lang="ts">
  export type DurationUnit = 'seconds' | 'minutes' | 'hours';
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLAttributes, HTMLInputAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import JoinedField from '../internal/JoinedField.svelte';
  import { pageLocale } from '../internal/locale.js';
  import Select from './Select.svelte';
  import TextInput from './TextInput.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  const SECONDS: Record<DurationUnit, number> = { seconds: 1, minutes: 60, hours: 3600 };
  const UNITS = Object.keys(SECONDS) as DurationUnit[];

  const uid = $props.id();

  let {
    value = $bindable(0),
    label,
    min = 0,
    max,
    disabled = false,
    invalid = false,
    name,
    durationName = word(
      'DurationInput.durationName',
      (amount: string, unit: string) => `${amount} ${unit}`
    ),
    unitLabel = word('DurationInput.unitLabel', (unit: DurationUnit, amount: number) =>
      amount === 1 ? unit.slice(0, -1) : unit
    ),
    amountName = word('DurationInput.amountName', (field: string) => `${field} amount`),
    unitName = word('DurationInput.unitName', (field: string) => `${field} unit`),
    emptyMessage = word('DurationInput.emptyMessage', 'Enter a duration'),
    wholeMessage = word('DurationInput.wholeMessage', 'Enter a duration in whole seconds'),
    minMessage = word('DurationInput.minMessage', (least: string) => `Enter ${least} or more`),
    rangeMessage = word(
      'DurationInput.rangeMessage',
      (least: string, most: string) => `Enter a duration from ${least} to ${most}`
    ),
    minHint = word('DurationInput.minHint', (least: string) => `${least} or more`),
    rangeHint = word(
      'DurationInput.rangeHint',
      (least: string, most: string) => `From ${least} to ${most}`
    ),
    onproblem,
    onchange,
    'aria-describedby': describedBy,
    class: className = '',
    ...rest
  }: {
    /** Seconds. Only a whole number of seconds inside `min` and `max` is ever written back. */
    value?: number;
    /** Names both parts for assistive technology when no `<label for>` names the amount, such as "Retry delay". */
    label?: string;
    /** The fewest seconds accepted. */
    min?: number;
    /** The most seconds accepted. */
    max?: number;
    disabled?: boolean;
    /** Marks the amount as wrong for a reason the field cannot see, such as a refused save. */
    invalid?: boolean;
    /** Posts `value` in seconds with a form. */
    name?: string;
    /** A unit's name after an amount, such as "1 minute" or "90 seconds". */
    unitLabel?: (unit: DurationUnit, amount: number) => string;
    /** Puts an amount and its unit together, such as "90 seconds", in the language's order. */
    durationName?: (amount: string, unit: string) => string;
    /** The amount's accessible name from the field's name. */
    amountName?: (field: string) => string;
    /** The unit picker's accessible name from the field's name. */
    unitName?: (field: string) => string;
    emptyMessage?: string;
    wholeMessage?: string;
    /** The problem when only `min` bounds the value, given the least duration in words. */
    minMessage?: (least: string) => string;
    /** The problem when `max` bounds the value too. */
    rangeMessage?: (least: string, most: string) => string;
    /** The hint, shown before any problem, when only `min` bounds the value. */
    minHint?: (least: string) => string;
    /** The hint, shown before any problem, when `max` bounds the value too. */
    rangeHint?: (least: string, most: string) => string;
    /** Hears the field's own problem after each keystroke and unit pick, so a Save can send focus back to the amount. */
    onproblem?: (problem: string | null) => void;
    /** Hears each new value in seconds the field writes. */
    onchange?: (seconds: number) => void;
    /** Layout for the call site only, never the field's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<
    HTMLInputAttributes,
    'value' | 'type' | 'min' | 'max' | 'disabled' | 'class' | 'name' | 'onchange'
  > = $props();

  /* Amounts read and print in the page's language, so "1,5" is a minute and a half where the
     comma is the decimal mark. A full stop there is a group mark, which an amount never needs,
     so it is refused rather than read as something else. */
  const locale = pageLocale();
  const decimal =
    new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === 'decimal')
      ?.value ?? '.';
  const numbers = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 });

  function read(text: string): number {
    const trimmed = text.trim();
    if (decimal !== '.' && trimmed.includes('.')) return Number.NaN;
    return Number(decimal === '.' ? trimmed : trimmed.replace(decimal, '.'));
  }

  /** The largest unit that holds the seconds whole, so showing a value never rounds it. */
  function unitFor(seconds: number): DurationUnit {
    if (seconds === 0) return 'seconds';
    return [...UNITS].reverse().find((unit) => seconds % SECONDS[unit] === 0) ?? 'seconds';
  }

  /** Whole seconds, or null for text that does not say a whole number of them. */
  function exact(text: string, unit: DurationUnit): number | null {
    if (text.trim() === '') return null;
    const amount = read(text);
    const seconds = amount * SECONDS[unit];
    const whole = Math.round(seconds);
    // One second said in hours repeats forever, so float noise passes and a real fraction does not.
    const noise = Number.EPSILON * Math.max(1, seconds) * 4;
    return Number.isFinite(amount) &&
      amount >= 0 &&
      Number.isSafeInteger(whole) &&
      Math.abs(seconds - whole) <= noise
      ? whole
      : null;
  }

  function say(seconds: number): string {
    const unit = unitFor(seconds);
    const amount = seconds / SECONDS[unit];
    return durationName(numbers.format(amount), unitLabel(unit, amount));
  }

  const fits = (seconds: number) => seconds >= min && (max === undefined || seconds <= max);

  function check(text: string, unit: DurationUnit): string | null {
    const seconds = exact(text, unit);
    if (seconds === null) return text.trim() === '' ? emptyMessage : wholeMessage;
    if (fits(seconds)) return null;
    return max === undefined ? minMessage(say(min)) : rangeMessage(say(min), say(max));
  }

  // What the reader typed or picked holds only while `value` is still what it left behind,
  // so a value the owner replaces (a save, a discard) shows itself again.
  let edit = $state<{ text: string; unit: DurationUnit; seconds: number } | null>(null);
  // A problem the reader is still typing towards waits until they leave the amount or pick a
  // unit; once shown it follows each keystroke until it is fixed.
  let revealed = $state(false);
  let amount = $state<HTMLInputElement | null>(null);
  const held = $derived(edit !== null && edit.seconds === value ? edit : null);
  const unit = $derived(held?.unit ?? unitFor(value));
  const text = $derived(held?.text ?? numbers.format(value / SECONDS[unit]));
  const typed = $derived(exact(text, unit));
  const problem = $derived(check(text, unit));
  const showing = $derived(problem !== null && (held === null || revealed));
  const wrong = $derived(invalid || showing);
  const hint = $derived(
    min > 0 || max !== undefined
      ? max === undefined
        ? minHint(say(min))
        : rangeHint(say(min), say(max))
      : null
  );
  const describedby = $derived(
    [describedBy, hint !== null && `${uid}-hint`, showing && `${uid}-problem`]
      .filter(Boolean)
      .join(' ') || undefined
  );
  const named = $derived(
    Boolean(rest['aria-label'] || rest['aria-labelledby'] || amount?.labels?.length)
  );
  const field = $derived(
    label ??
      ([...(amount?.labels ?? [])]
        .map((node) => node.textContent?.trim())
        .filter(Boolean)
        .join(' ') ||
        rest['aria-label'] ||
        '')
  );
  const shownAmount = $derived(read(text));
  const unitOptions = $derived(
    UNITS.map((each) => ({ value: each, label: unitLabel(each, shownAmount) }))
  );

  /** Holds what the reader sees and writes the seconds only when they are whole and in range. */
  function hold(next: string, shown: DurationUnit): void {
    const seconds = exact(next, shown);
    if (seconds !== null && fits(seconds) && seconds !== value) {
      value = seconds;
      onchange?.(seconds);
    }
    edit = { text: next, unit: shown, seconds: value };
    const found = check(next, shown);
    if (found === null) revealed = false;
    onproblem?.(found);
  }

  function type(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
    hold(event.currentTarget.value, unit);
  }

  // A readable amount keeps its seconds and is said in the new unit when that takes at most two
  // decimals, so 90 seconds becomes 1.5 minutes. Otherwise the amount stays as written and is
  // read in the new unit, so 1 second becomes 1 minute, never 0.016666 minutes, and text that
  // cannot be read, such as 0.5 seconds, becomes 0.5 minutes.
  function pick(next: DurationUnit | null): void {
    if (next === null) return;
    revealed = true;
    const converted = typed === null ? null : typed / SECONDS[next];
    const readable = converted !== null && Math.round(converted * 100) === converted * 100;
    hold(readable ? numbers.format(converted) : text, next);
  }
</script>

<!--
@component
A duration stored in seconds and said as an amount and a unit: seconds, minutes or hours. The
amount and the unit are one field that reads as one phrase, "90 seconds": the amount is typed
at the start and the unit picker finishes it at the end, with one frame and one error edge. A
value is shown in the largest unit that holds it whole. Picking another unit keeps the seconds
when the new unit says them in at most two decimals, so 90 seconds becomes 1.5 minutes without
writing anything; otherwise the amount stays as written and is read in the new unit, so 1
second becomes 1 minute rather than 0.016666 minutes.

Text that is not a whole number of seconds inside `min` and `max` stays on screen and is never
written to `value`, so a cleared or mistyped field never becomes zero. The accepted range shows
under the field before anything goes wrong, and the reason shows once the reader leaves the
amount or picks a unit. `onproblem` hears that reason after each keystroke and each unit pick,
so a Save can send focus back to the amount while it stands. A value the owner writes, such as
a discard, replaces the held text. Name it with a `Field` or a `SettingRow`, whose label points
at its `id`, or with `label`; other attributes land on the amount.

- Semantics: a text input for the amount and a native `<select>` for the unit, inside one joined field, with a hidden input that posts the seconds.
- Content: an amount in the page's number format, one of three units named for that amount, an optional range hint and a problem line.
- States: rest, focus on the amount (the field's ring), focus on the unit (its own inset ring), pressed unit, a hint for the range, invalid (a danger edge and a problem with a warning mark) and disabled (0.7 opacity).
- Keyboard: the amount takes typing in the page's decimal mark, Tab moves to the unit, and the unit takes the select's own keys.
- Pointer and touch: 34px tall, 44px on a phone or any touch screen, and a phone opens its own unit picker.
- Focus: it never moves focus; a Save that hears a problem through `onproblem` sends focus to the amount.
- Responsive: as wide as a short amount and its unit, and a long hint or problem wraps under it without widening it.
- Accessibility: each part has its own name, the hint and the problem describe the amount, and the problem is spoken when it shows.
- Localization: `unitLabel`, `amountName`, `unitName` and every message and hint are props with English defaults, a unit's name follows its amount's plural, amounts read and print in the page's language, and the unit sits at the inline end in either direction.
- Performance: a few string checks per keystroke and nothing that animates.
- Analytics: `onchange` hears each new value in seconds and `onproblem` each problem.
- Failure: text that is empty, not a whole number of seconds or out of range is kept with its reason and never written, and `invalid` marks a value the server refused.
-->

<div class={['sui-duration-input', className]}>
  <JoinedField invalid={wrong} {disabled}>
    {#snippet start()}
      <span class="sui-duration-amount">
        <TextInput
          bind:element={amount}
          {...rest}
          bare
          mono
          inputmode="decimal"
          autocomplete="off"
          spellcheck="false"
          value={text}
          {disabled}
          invalid={wrong}
          aria-label={named || !field ? rest['aria-label'] : amountName(field)}
          aria-describedby={describedby}
          oninput={type}
          onblur={(event) => {
            if (problem !== null && held !== null) revealed = true;
            rest.onblur?.(event);
          }}
        />
      </span>
    {/snippet}
    {#snippet end()}
      <!-- Named by reference, not `aria-label`: a name has to contain the words the trigger
           shows, and those are the unit, not the field. -->
      <Select
        bare
        options={unitOptions}
        bind:value={() => unit, pick}
        aria-labelledby="{uid}-unit"
        {disabled}
      />
    {/snippet}
  </JoinedField>
  {#if name}<input type="hidden" {name} {value} form={rest.form} {disabled} />{/if}
  <span id="{uid}-unit" hidden>{unitName(field)}</span>
  {#if hint !== null}<p id="{uid}-hint" class="sui-duration-hint">{hint}</p>{/if}
  <!-- The status speaks the problem, so the drawn copy stays out of the tree; the amount's
       description still reads it. -->
  {#if showing}
    <p id="{uid}-problem" class="sui-duration-problem" aria-hidden="true">
      <span class="sui-duration-mark"><Icon name="alert" size="xs" /></span>
      <span class="sui-duration-words">{problem}</span>
    </p>
  {/if}
  <VisuallyHidden role="status">{showing ? problem : ''}</VisuallyHidden>
</div>

<style>
  .sui-duration-input {
    display: grid;
    gap: var(--sui-row-copy-gap);
    inline-size: fit-content;
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-duration-amount {
    display: grid;
    inline-size: 4.5rem;
  }

  /* Contained, so a long hint or reason wraps under the controls instead of widening the field. */
  .sui-duration-hint,
  .sui-duration-problem {
    contain: inline-size;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    justify-self: stretch;
    margin: 0;
  }

  .sui-duration-hint,
  .sui-duration-words {
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-duration-hint {
    color: var(--sui-text-secondary);
  }

  .sui-duration-problem {
    align-items: start;
    color: var(--sui-danger);
    column-gap: var(--sui-space-1);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
  }

  /* Centred on the first line's cap height, however many lines the reason wraps to. */
  .sui-duration-mark {
    display: flex;
    margin-block: round(calc((1cap - var(--sui-icon-xs)) / 2), 1px);
  }
</style>
