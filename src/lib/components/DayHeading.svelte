<script module lang="ts">
  const DAY = 86_400_000;

  const midnight = (at: Date) => new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();

  /**
   * The reader's local calendar day of an instant, as `YYYY-MM-DD`, or an empty string for a
   * value that is not a date. Group entries by this key and head each group with `DayHeading`,
   * so the groups and their headings share one calendar and a local day is never split where
   * it crosses midnight in UTC.
   */
  export function dayKey(value: string | number | Date): string {
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  }

  /* Rounded, because a day that changes the clock is 23 or 25 hours long. */
  function dayName(at: Date, now: Date, locale: string | undefined): string {
    const days = Math.round((midnight(at) - midnight(now)) / DAY);
    if (Math.abs(days) <= 1) {
      const word = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
      return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
    }
    return at.toLocaleDateString(locale, {
      weekday: Math.abs(days) < 7 ? 'long' : undefined,
      day: 'numeric',
      month: 'short',
      year: at.getFullYear() === now.getFullYear() ? undefined : 'numeric'
    });
  }
</script>

<script lang="ts">
  import { word } from '../words.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import { pageNow } from '../internal/clock.svelte.js';
  import { pageLocale } from '../internal/locale.js';

  let {
    value,
    level = 3,
    locale,
    unknownLabel = word('DayHeading.unknownLabel', 'Unknown day'),
    class: className = '',
    ...rest
  }: {
    /** Any instant on the day, as an ISO 8601 string, epoch milliseconds or a `Date`. */
    value: string | number | Date;
    /** The heading level, one below the heading of the list the days belong to. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** The language the day is written in. The page's `lang` when left out. */
    locale?: string;
    /** The heading over entries whose time is not a date. */
    unknownLabel?: string;
    class?: HTMLAttributes<HTMLHeadingElement>['class'];
  } & Omit<HTMLAttributes<HTMLHeadingElement>, 'children'> = $props();

  const at = $derived(new Date(value));
  const known = $derived(!Number.isNaN(at.getTime()));
  const name = $derived(
    known ? dayName(at, new Date(pageNow()), locale ?? pageLocale()) : unknownLabel
  );
</script>

<!--
@component
The heading over a run of entries from one day: "Today", "Yesterday", or the date, with the
weekday inside the last week and the year only when it is not this one. The day is a heading
rather than a column, because that is how a reader asks for it.

Days follow the reader's own time zone, and the words roll over at local midnight on the
page's one clock. Group the entries with `dayKey`, which reads the same local calendar, so
one local day never opens two headings because its entries cross midnight in UTC.

- Semantics: an `h2` to `h6` by `level`, holding a `time` whose `datetime` is the local day.
- Content: "Today", "Yesterday", "Tomorrow", a weekday and date inside the week, or a date with the year when it is not this one.
- States: one drawn state, at the label tier in the secondary ink, written as the language writes it.
- Keyboard: none; a heading is not a tab stop.
- Pointer and touch: none.
- Focus: it never takes focus.
- Responsive: a long date wraps rather than clipping.
- Accessibility: a real heading in the outline, one level below its list's heading, read exactly as drawn.
- Localization: the words and the date follow `locale`, else the page's `lang`; `unknownLabel` carries the built-in words; it starts at the inline start.
- Performance: every heading shares the page's one clock, which wakes every 30 seconds.
- Analytics: none; a heading reports no outcome.
- Failure: a value that is not a date says `unknownLabel` with no `datetime`, never "Invalid Date".
-->

<svelte:element this={`h${level}`} {...rest} class={['sui-day-heading', className]}
  >{#if known}<time datetime={dayKey(at)}>{name}</time>{:else}{name}{/if}</svelte:element
>

<style>
  .sui-day-heading {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
