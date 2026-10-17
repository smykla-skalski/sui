<script module lang="ts">
  const DAY = 86_400_000;
  const near = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const midnight = (at: Date) => new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();

  /**
   * The reader's local calendar day of an instant, as `YYYY-MM-DD`. Group entries by this key
   * and head each group with `DayHeading`, so the groups and their headings share one
   * calendar and a local day is never split where it crosses midnight in UTC.
   */
  export function dayKey(value: string | number | Date): string {
    const at = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  }

  /* Rounded, because a day that changes the clock is 23 or 25 hours long. */
  function dayName(at: Date, now: Date): string {
    const days = Math.round((midnight(at) - midnight(now)) / DAY);
    if (Math.abs(days) <= 1) {
      const word = near.format(days, 'day');
      return word.charAt(0).toLocaleUpperCase() + word.slice(1);
    }
    return at.toLocaleDateString(undefined, {
      weekday: Math.abs(days) < 7 ? 'long' : undefined,
      day: 'numeric',
      month: 'short',
      year: at.getFullYear() === now.getFullYear() ? undefined : 'numeric'
    });
  }
</script>

<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { pageNow } from '../internal/clock.svelte.js';

  let {
    value,
    level = 3,
    class: className = '',
    ...rest
  }: {
    /** Any instant on the day, as an ISO 8601 string, epoch milliseconds or a `Date`. */
    value: string | number | Date;
    /** The heading level, one below the heading of the list the days belong to. */
    level?: 2 | 3 | 4 | 5 | 6;
    class?: HTMLAttributes<HTMLHeadingElement>['class'];
  } & Omit<HTMLAttributes<HTMLHeadingElement>, 'children'> = $props();

  const at = $derived(new Date(value));
  const name = $derived(dayName(at, new Date(pageNow())));
</script>

<!--
@component
The heading over a run of entries from one day: "Today", "Yesterday", or the date, with the
weekday inside the last week and the year only when it is not this one. The day is a heading
rather than a column, because that is how a reader asks for it.

Days follow the reader's own time zone, and the words roll over at local midnight on the
page's one clock. Group the entries with `dayKey`, which reads the same local calendar, so
one local day never opens two headings because its entries cross midnight in UTC. The case
is drawn by CSS, so a screen reader hears the words as written.
-->

<svelte:element this={`h${level}`} {...rest} class={['sui-day-heading', className]}
  ><time datetime={dayKey(at)}>{name}</time></svelte:element
>

<style>
  .sui-day-heading {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: 600 var(--sui-font-size-micro) / var(--sui-leading-tight) var(--sui-sans);
    letter-spacing: 0.07em;
    margin: 0;
    text-box: trim-both cap alphabetic;
    text-transform: uppercase;
  }
</style>
