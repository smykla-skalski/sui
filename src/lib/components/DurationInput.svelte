<script lang="ts">
  import type { HTMLAttributes, HTMLInputAttributes } from 'svelte/elements';
  import Select from './Select.svelte';
  import TextInput from './TextInput.svelte';

  type Unit = 'seconds' | 'minutes' | 'hours';

  const SECONDS: Record<Unit, number> = { seconds: 1, minutes: 60, hours: 3600 };
  const UNITS = Object.keys(SECONDS) as Unit[];
  const unitOptions = UNITS.map((unit) => ({ value: unit, label: unit }));

  const uid = $props.id();

  let {
    value = $bindable(0),
    label,
    min = 0,
    max,
    disabled = false,
    invalid = false,
    onproblem,
    'aria-describedby': describedBy,
    class: className = '',
    ...rest
  }: {
    /** Seconds. Only a whole number of seconds inside `min` and `max` is ever written back. */
    value?: number;
    /** Names the amount and the unit for assistive technology, such as "Retry delay". */
    label: string;
    /** The fewest seconds accepted. */
    min?: number;
    /** The most seconds accepted. */
    max?: number;
    disabled?: boolean;
    /** Marks the amount as wrong for a reason the field cannot see, such as a refused save. */
    invalid?: boolean;
    /** Hears the field's own problem after each keystroke, so an owner can hold Save while one stands. */
    onproblem?: (problem: string | null) => void;
    /** Layout for the call site only, never the field's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLInputAttributes, 'value' | 'type' | 'min' | 'max' | 'disabled' | 'class'> = $props();

  /** The largest unit that holds the seconds whole, so showing a value never rounds it. */
  function unitFor(seconds: number): Unit {
    if (seconds === 0) return 'seconds';
    return [...UNITS].reverse().find((unit) => seconds % SECONDS[unit] === 0) ?? 'seconds';
  }

  /** Whole seconds, or null for text that does not say a whole number of them. */
  function exact(text: string, unit: Unit): number | null {
    if (text.trim() === '') return null;
    const amount = Number(text);
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
    return `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
  }

  const fits = (seconds: number) => seconds >= min && (max === undefined || seconds <= max);

  function check(text: string, unit: Unit): string | null {
    const seconds = exact(text, unit);
    if (seconds === null)
      return text.trim() === '' ? 'Enter a duration' : 'Enter a duration in whole seconds';
    if (fits(seconds)) return null;
    return max === undefined
      ? `Enter ${say(min)} or more`
      : `Enter a duration from ${say(min)} to ${say(max)}`;
  }

  // What the reader typed or picked holds only while `value` is still what it left behind,
  // so a value the owner replaces (a save, a discard) shows itself again.
  let edit = $state<{ text: string; unit: Unit; seconds: number } | null>(null);
  const held = $derived(edit !== null && edit.seconds === value ? edit : null);
  const unit = $derived(held?.unit ?? unitFor(value));
  const text = $derived(held?.text ?? String(value / SECONDS[unit]));
  const typed = $derived(exact(text, unit));
  const problem = $derived(check(text, unit));
  const describedby = $derived(
    [describedBy, problem && `${uid}-problem`].filter(Boolean).join(' ') || undefined
  );

  function type(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
    const shown = unit;
    const next = event.currentTarget.value;
    const seconds = exact(next, shown);
    if (seconds !== null && fits(seconds)) value = seconds;
    edit = { text: next, unit: shown, seconds: value };
    onproblem?.(check(next, shown));
  }

  // A unit only changes how the value is said: the seconds stay exactly as they were.
  function pick(next: Unit | null): void {
    if (next === null || typed === null) return;
    edit = { text: String(typed / SECONDS[next]), unit: next, seconds: value };
  }
</script>

<!--
@component
A duration stored in seconds and said as an amount and a unit: seconds, minutes or hours. The
amount is a mono `TextInput` and the unit a `Select`, both 34px on one line. A value is shown in
the largest unit that holds it whole, and picking another unit only changes how it is said, so
90 seconds becomes 1.5 minutes without writing anything.

Text that is not a whole number of seconds inside `min` and `max` stays on screen with the
reason under it and is never written to `value`, so a cleared or mistyped field never becomes
zero. `onproblem` hears that reason after each keystroke, so the owner can hold Save while it
stands; a value the owner writes, such as a discard, replaces the held text. The unit picker
waits while the amount cannot be read. `label` names both halves; other attributes, such as
`id`, land on the amount.
-->

<div class={['sui-duration-input', className]}>
  <div class="sui-duration-controls">
    <span class="sui-duration-amount">
      <TextInput
        {...rest}
        mono
        inputmode="decimal"
        autocomplete="off"
        spellcheck="false"
        value={text}
        {disabled}
        invalid={invalid || problem !== null}
        aria-label="{label} amount"
        aria-describedby={describedby}
        oninput={type}
      />
    </span>
    <!-- Named by reference, not `aria-label`: a name has to contain the words the trigger
         shows, and those are the unit, not the field. -->
    <Select
      options={unitOptions}
      bind:value={() => unit, pick}
      aria-labelledby="{uid}-unit"
      disabled={disabled || typed === null}
    />
    <span id="{uid}-unit" hidden>{label} unit</span>
  </div>
  {#if problem}<p id="{uid}-problem" class="sui-duration-problem">{problem}</p>{/if}
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

  .sui-duration-controls {
    align-items: center;
    display: flex;
    gap: var(--sui-space-2);
  }

  .sui-duration-amount {
    display: grid;
    flex: none;
    inline-size: 6rem;
  }

  /* Contained, so a long reason wraps under the controls instead of widening the field. */
  .sui-duration-problem {
    color: var(--sui-danger);
    contain: inline-size;
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    justify-self: stretch;
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
