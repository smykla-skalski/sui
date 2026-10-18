<script module lang="ts">
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  /* Elapsed time only, never calendar days: "yesterday" depends on the zone the page is
     read in. A week out, the date says more than a count. */
  function relative(at: number, now: number, locale: string | undefined): string {
    const counted = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
    const delta = at - now;
    const span = Math.abs(delta);
    const sign = Math.sign(delta);
    if (span < MINUTE)
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second');
    if (span < HOUR) return counted.format(sign * Math.floor(span / MINUTE), 'minute');
    if (span < DAY) return counted.format(sign * Math.floor(span / HOUR), 'hour');
    if (span < 7 * DAY) return counted.format(sign * Math.floor(span / DAY), 'day');
    return new Date(at).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /* The language decides the hour cycle and how the zone is spelled. */
  function exact(at: number, locale: string | undefined): string {
    return new Date(at).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'shortOffset'
    });
  }
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import type { HTMLTimeAttributes } from 'svelte/elements';
  import { pageNow } from '../internal/clock.svelte.js';
  import { pageLocale } from '../internal/locale.js';
  import Tooltip from './Tooltip.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    value,
    exact: exactOnly = false,
    locale,
    exactLabel = word(
      'RelativeTime.exactLabel',
      (time: string) => `${mark('comma')}exactly ${time}`
    ),
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** The instant, as an ISO 8601 string, epoch milliseconds or a `Date`. */
    value: string | number | Date;
    /** Show the whole instant in place, for a surface whose reader chose that. */
    exact?: boolean;
    /** The language the time is written in. The page's `lang` when left out. */
    locale?: string;
    /** What a screen reader hears after the relative reading, given the whole instant. */
    exactLabel?: (time: string) => string;
    element?: HTMLTimeElement | null;
    class?: HTMLTimeAttributes['class'];
  } & Omit<HTMLTimeAttributes, 'children' | 'datetime'> = $props();

  /* A negative tabindex is focus a script moves, such as the page's main landmark after a
     skip link: a reader never tabs there, and it holds every time on the page. */
  const FOCUSABLE =
    "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex^='-'])";

  const at = $derived(new Date(value).getTime());
  const valid = $derived(Number.isFinite(at));
  // The page's language is read on every tick of the clock, so a page that changes `lang`
  // writes both readings in the new one within half a minute.
  const language = $derived.by(() => {
    pageNow();
    return locale ?? pageLocale();
  });
  const resting = $derived(valid ? relative(at, pageNow(), language) : String(value));
  const whole = $derived(valid ? exact(at, language) : String(value));
  /* A time inside no control is a tab stop of its own, so the keyboard can show its whole
     instant; inside a control, that control's focus shows it. */
  const alone = $derived(!exactOnly && !element?.parentElement?.closest(FOCUSABLE));
</script>

<!--
@component
A time read as how long ago or how soon, with the whole instant, seconds and zone included,
in a tooltip on hover and on a long press. A screen reader hears both readings, because the
whole instant is also in the words, visually hidden.

Outside any control it is a tab stop of its own, so the keyboard shows the whole instant
too. Inside a row that is a control, the row's keyboard focus shows it, so a list of rows
gets no extra tab stops. Every instance reads
the page's one clock, so a list of times agrees on "now" and wakes the page once. The dotted
underline says a tooltip is there, and the hover area grows through a pseudo-element so the
line it sits in keeps its height. `exact` shows the whole instant in place and drops the
tooltip.

- Semantics: a `time` with a machine-readable `datetime`, read as the relative words and then `exactLabel` with the whole instant.
- Content: one reading, "4 minutes ago" or "in 3 days", turning into the date a week out; the whole instant with seconds and its zone.
- States: relative (dotted underline, the tip on hover and long press), hover (the secondary ink), and `exact` (the whole instant in place, free to wrap).
- Keyboard: outside any control it is a tab stop that shows the tip; inside a control, that control's focus shows the tip; Escape closes it.
- Pointer and touch: the hover area reaches 8px above and below and 6px to each side; a 500ms press shows the tip on touch, with the system's long-press menu and word selection held off.
- Focus: outside any control it takes focus and wears the 2px ring; it never moves focus.
- Responsive: the relative reading never breaks inside, and the exact one wraps where a column is narrow.
- Accessibility: the whole instant is in its words for a screen reader, and the tip repeats it, so the tip stays out of the accessibility tree.
- Localization: words, numbers, the hour cycle and the zone follow `locale`, else the page's `lang`; `exactLabel` carries the joining words; the underline and hover area are symmetric, so nothing mirrors.
- Performance: every instance shares the page's one 30-second clock, and the tooltip exists only once the time is in the page.
- Analytics: none; a time reports no outcome.
- Failure: a value that is not a date is shown as given, with no relative reading, so a bad record never reads "Invalid Date".
-->

<!-- A time outside any control must be reachable by keyboard to show its whole instant. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<time
  bind:this={element}
  aria-label={exactOnly ? undefined : `${resting}${exactLabel(whole)}`}
  {...rest}
  class={['sui-relative-time', className, { exact: exactOnly }]}
  tabindex={alone ? 0 : undefined}
  datetime={valid ? new Date(at).toISOString() : String(value)}
>
  {#if exactOnly}{whole}{:else}{resting}<VisuallyHidden>{exactLabel(whole)}</VisuallyHidden>{/if}
</time>
<!-- Mounted once the element exists, so the server never writes the tip's block box into
     the sentence a time sits in, where a parser would close the paragraph around it. -->
{#if element && !exactOnly}
  <Tooltip anchor={element} text={whole} />
{/if}

<style>
  .sui-relative-time {
    position: relative;
    text-decoration: underline dotted color-mix(in srgb, var(--sui-text-muted) 55%, transparent);
    text-decoration-thickness: var(--sui-stroke);
    text-underline-offset: 3px;
    white-space: nowrap;
  }

  @media (hover: hover) {
    .sui-relative-time:not(.exact):hover {
      color: var(--sui-text-secondary);
      text-decoration-color: var(--sui-text-secondary);
    }
  }

  .sui-relative-time:focus-visible {
    border-radius: var(--sui-radius-chip);
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .sui-relative-time::after {
    content: '';
    inset: calc(-1 * var(--sui-space-2)) calc(-1 * var(--sui-space-1) - 2px);
    position: absolute;
  }

  /* The whole instant is twice as long as the relative reading, so it may wrap where a
     column sized for the short one would otherwise clip it. */
  .exact {
    text-decoration: none;
    white-space: normal;
  }

  /* A long press shows the tip on touch, so the system's own long-press menu and word selection
     stay out of its way. */
  @media (pointer: coarse) {
    .sui-relative-time:not(.exact) {
      -webkit-touch-callout: none;
      user-select: none;
      -webkit-user-select: none;
    }
  }
</style>
