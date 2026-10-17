<script module lang="ts">
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const counted = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });
  const present = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  /* Elapsed time only, never calendar days: "yesterday" depends on the zone the page is
     read in. A week out, the date says more than a count. */
  function relative(at: number, now: number): string {
    const delta = at - now;
    const span = Math.abs(delta);
    const sign = Math.sign(delta);
    if (span < MINUTE) return present.format(0, 'second');
    if (span < HOUR) return counted.format(sign * Math.floor(span / MINUTE), 'minute');
    if (span < DAY) return counted.format(sign * Math.floor(span / HOUR), 'hour');
    if (span < 7 * DAY) return counted.format(sign * Math.floor(span / DAY), 'day');
    return new Date(at).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /* `shortOffset` spells the zone GMT+2; UTC names the same offset in the words the rest
     of a product uses. */
  function exact(at: number): string {
    return new Date(at)
      .toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZoneName: 'shortOffset'
      })
      .replace('GMT', 'UTC');
  }
</script>

<script lang="ts">
  import type { HTMLTimeAttributes } from 'svelte/elements';
  import { pageNow } from '../internal/clock.svelte.js';
  import Tooltip from './Tooltip.svelte';

  let {
    value,
    exact: exactFirst = false,
    element = $bindable(null),
    class: className = '',
    ...rest
  }: {
    /** The instant, as an ISO 8601 string, epoch milliseconds or a `Date`. */
    value: string | number | Date;
    /** Start on the whole instant, for a surface whose reader chose that. */
    exact?: boolean;
    element?: HTMLTimeElement | null;
    class?: HTMLTimeAttributes['class'];
  } & Omit<HTMLTimeAttributes, 'children' | 'datetime'> = $props();

  const at = $derived(new Date(value).getTime());
  const valid = $derived(Number.isFinite(at));
  const resting = $derived(valid ? relative(at, pageNow()) : String(value));
  const whole = $derived(valid ? exact(at) : String(value));

  /* Seeded from the surface's choice and owned by whoever presses it after that. */
  let showing = $derived(exactFirst);

  function toggle(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    showing = !showing;
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') toggle(event);
  }
</script>

<!--
@component
A time a reader can take either way: how long ago or how soon by default, and the whole
instant, with seconds and the zone, one press away. A press swaps the words in place, so
the stamp can be copied, and hover or keyboard focus shows it in a tooltip first.

Every instance reads the page's one clock, so a list of times agrees on "now" and wakes
the page once. The affordance is a dotted underline, and the hit area grows through a
pseudo-element so the line it sits in keeps its height. A press does not reach a row link
around it.
-->

<!-- A `time` rather than a `button`, so `datetime` keeps its meaning; the button recipe is
     here in full: role, tab stop, Enter and Space, and a name with both readings. -->
<time
  bind:this={element}
  {...rest}
  class={['sui-relative-time', className, { exact: showing }]}
  datetime={valid ? new Date(at).toISOString() : String(value)}
  role="button"
  tabindex="0"
  aria-label="{resting}, exactly {whole}"
  onclick={toggle}
  {onkeydown}>{showing ? whole : resting}</time
>
<!-- Mounted once the element exists, so the server never writes the tip's block box into
     the sentence a time sits in, where a parser would close the paragraph around it. -->
{#if element && !showing}
  <Tooltip anchor={element} text={whole} />
{/if}

<style>
  .sui-relative-time {
    cursor: pointer;
    position: relative;
    text-decoration: underline dotted color-mix(in srgb, var(--sui-text-muted) 55%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    white-space: nowrap;
  }

  .sui-relative-time:hover {
    color: var(--sui-text-secondary);
    text-decoration-color: var(--sui-text-secondary);
  }

  .sui-relative-time::after {
    content: '';
    inset: calc(-1 * var(--sui-space-2)) calc(-1 * var(--sui-space-1) - 2px);
    position: absolute;
  }

  /* The whole instant is twice as long as the relative reading, so it may wrap where a
     column sized for the short one would otherwise clip it. */
  .exact {
    color: var(--sui-text-secondary);
    text-decoration-color: transparent;
    white-space: normal;
  }

  .sui-relative-time:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
