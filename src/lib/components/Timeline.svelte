<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { AvatarShape } from './Avatar.svelte';
  import type { PillTone } from './Pill.svelte';

  export type TimelineEvent = {
    /** When it happened, as an ISO 8601 string, epoch milliseconds or a `Date`. */
    at: string | number | Date;
    /** What happened, as a sentence that follows the actor's name when there is one. */
    text: string;
    /** Who did it: the name leads the words in semibold, after a small avatar. */
    actor?: { name: string; src?: string | null; shape?: AvatarShape };
    /** The standing the event left, drawn as a pill at the row's end. */
    status?: { label: string; tone?: PillTone };
    /** A `Link` with `standalone`, or a quiet button, at the row's end. */
    action?: Snippet;
  };

  /* A time that is not a date sorts after every real one, whichever way the list runs. */
  function compare(order: 'newest' | 'oldest') {
    return (a: TimelineEvent, b: TimelineEvent) => {
      const x = new Date(a.at).getTime();
      const y = new Date(b.at).getTime();
      if (Number.isNaN(x) || Number.isNaN(y))
        return Number(Number.isNaN(x)) - Number(Number.isNaN(y));
      return order === 'newest' ? y - x : x - y;
    };
  }
</script>

<script lang="ts">
  import { mark, word } from '../words.js';
  import type { HTMLOlAttributes } from 'svelte/elements';
  import { formatLocale } from '../internal/locale.js';
  import Avatar from './Avatar.svelte';
  import DayHeading, { dayKey } from './DayHeading.svelte';
  import Pill from './Pill.svelte';
  import RelativeTime from './RelativeTime.svelte';
  import Icon from '../icons/Icon.svelte';
  import VisuallyHidden from './VisuallyHidden.svelte';

  let {
    events,
    time = 'clock',
    order = 'newest',
    days = false,
    level = 3,
    loading = false,
    placeholders = 3,
    actors = false,
    locale,
    emptyLabel = word('Timeline.emptyLabel', 'Check back once the first event happens'),
    loadingLabel = word('Timeline.loadingLabel', 'Loading…'),
    refreshingLabel = word('Timeline.refreshingLabel', 'Refreshing…'),
    class: className = '',
    ...rest
  }: {
    events: readonly TimelineEvent[];
    /**
     * `clock` for the time of day in mono, as a log reads, with the date added only when the
     * events span days and `days` is off; `relative` for "4 minutes ago" with the whole instant
     * in a tip.
     */
    time?: 'clock' | 'relative';
    /** The way the list runs. The events are sorted by their time to match. */
    order?: 'newest' | 'oldest';
    /** Groups the events by the reader's calendar day, each run under a `DayHeading`. */
    days?: boolean;
    /** The day headings' level, one below the heading the timeline stands under. */
    level?: 2 | 3 | 4 | 5 | 6;
    /** Events are on their way: placeholders hold their place, or the loaded ones stay, busy. */
    loading?: boolean;
    /** How many placeholder events stand in while the first events load. */
    placeholders?: number;
    /** The events on their way have actors, so the placeholders' words stand past the avatar's seat, where the loaded words will. */
    actors?: boolean;
    /** The language the times are written in. The reader's locale in the page's `lang` when left out. */
    locale?: string;
    /** The one quiet sentence in the list's place when nothing has happened. */
    emptyLabel?: string;
    /** Announced while events load. */
    loadingLabel?: string;
    /** Shown and said while `loading` keeps the loaded events, as a refresh. */
    refreshingLabel?: string;
    class?: HTMLOlAttributes['class'];
  } & Omit<HTMLOlAttributes, 'children'> = $props();

  const sorted = $derived(events.toSorted(compare(order)));
  const language = $derived(locale ?? formatLocale());
  /* A time of day alone would read as today, so ungrouped events from several days carry the
     date as well. */
  const dated = $derived(!days && new Set(sorted.map((event) => dayKey(event.at))).size > 1);
  const clock = $derived(
    new Intl.DateTimeFormat(language, {
      day: dated ? 'numeric' : undefined,
      month: dated ? 'short' : undefined,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  );

  const space = mark('space');

  // A clock placeholder is as wide as a time in this locale's hour cycle, in the mono face, so
  // the words' placeholders start where the loaded words will.
  const clockWidth = $derived(`${clock.format(new Date(2000, 0, 1, 10, 0, 0)).length}ch`);

  const opensDay = (index: number) =>
    days && (index === 0 || dayKey(sorted[index].at) !== dayKey(sorted[index - 1].at));
</script>

<!--
@component
Events in time, as an ordered list: each a time, the event's words, and optionally who did it,
the standing it left and a link or action. It is how a detail pane tells what happened to the
thing it shows (MOJ and HMRC timelines, GitHub's and Linear's activity).

The times stand in one column as wide as the widest, so they line up down the list, and the
words hang on their own edge when they wrap. An avatar, a pill and an action centre on the
first line's cap band. Nothing connects the events: the time column already shows the
sequence, and a line with no marker to join would be decoration (one line per boundary).
Events stand one target's height plus 4px apart, so a link in one never reaches into the
next one's hit area. The events are sorted by their time in `order`, and `days` heads each
calendar day with a `DayHeading` inside the day's first event, so the list counts events
only and a `LoadMore` after it lands on the first new one. Page it in the order it runs.

- Semantics: an `ol` with `role="list"` of one `li` per event; each time is a `time` with a machine-readable `datetime`; a day heading is a real heading at `level`.
- Content: per event a time, a sentence, and an optional actor (avatar and name), a status pill and an action; the words wrap, a time never does.
- States: loaded; empty (`emptyLabel` as one quiet sentence in the list's place); loading (placeholder events in the final geometry, past the avatar's seat with `actors`, crossed by the placeholder light); refreshing (`loading` with events: they stay, the list is busy, and `refreshingLabel` stands over them after the refresh mark, as on a table's caption line).
- Keyboard: Tab reaches a relative time, which shows its whole instant, and each action, in reading order; a clock time is not a tab stop.
- Pointer and touch: an action keeps its own target; on a phone or a touch screen a wide timeline with actions spaces its events by the 44px target, so targets never meet.
- Focus: nothing here moves focus; a `LoadMore` after the list moves it to the first new event.
- Responsive: a container query under 25rem of its own width stands each time over its words, on the words' edge past an avatar's seat, stands each event 4px further from the next, sets the words at the body size and drops the pill and action under them, from the words' edge.
- Accessibility: name the list with `aria-labelledby` pointing at its section's heading; a busy list is `aria-busy` and a polite status says `loadingLabel`, or `refreshingLabel` over kept events; the actor's avatar is hidden because the name is in the words; times and words hold 4.5:1.
- Localization: `emptyLabel`, `loadingLabel` and `refreshingLabel` are props; the clock follows `locale`, else the reader's locale in the page's `lang`, for its hour cycle; the name and the words are joined by `marks.space`, name first; the columns and the light follow the reading direction.
- Performance: one formatter per timeline and no script per event; every event is in the page, but only the words near the screen are laid out and painted (`content-visibility: auto`), while the time column stays laid out to keep its width; page a long history with `LoadMore`; the placeholder light moves only by `transform` and holds still under reduced motion.
- Analytics: none of its own; actions and `LoadMore` report their own outcomes.
- Failure: a time that is not a date is shown as given and sorts last; a failed load is an `ErrorState` in the list's place, and a failed refresh an `ErrorState overContent` over the kept events.
-->

<!-- Before the list, so a LoadMore after it is the list's own next sibling. -->
<VisuallyHidden role="status"
  >{loading ? (events.length > 0 ? refreshingLabel : loadingLabel) : ''}</VisuallyHidden
>
<!-- A refresh keeps the events, so the line over them says the list is busy, as a table's does. -->
{#if loading && events.length > 0}
  <p class="sui-timeline-refreshing" aria-hidden="true">
    <span class="sui-timeline-refreshing-mark"><Icon name="refresh" size="sm" /></span><span
      class="sui-timeline-refreshing-words">{refreshingLabel}</span
    >
  </p>
{/if}
{#if events.length === 0 && !loading}
  <p class={['sui-timeline-empty', className]}>{emptyLabel}</p>
{:else}
  <ol
    role="list"
    {...rest}
    class={['sui-timeline', className]}
    aria-busy={loading || rest['aria-busy'] || undefined}
  >
    {#if events.length === 0}
      {#each { length: placeholders }, index (index)}
        <li class="sui-timeline-event placeholder" aria-hidden="true">
          <div class={['sui-timeline-time', time]}>
            <span class="bar" style:--sui-local-clock-width={clockWidth}></span>
          </div>
          {#if actors}
            <div class="sui-timeline-body">
              <span class="sui-timeline-face"></span>
              <div class="sui-timeline-words"><span class="bar"></span></div>
            </div>
          {:else}
            <div class="sui-timeline-words"><span class="bar"></span></div>
          {/if}
        </li>
      {/each}
    {:else}
      {#each sorted as event, index (index)}
        {@const at = new Date(event.at)}
        <li class="sui-timeline-event">
          {#if opensDay(index)}
            <div class="sui-timeline-day"><DayHeading value={event.at} {level} {locale} /></div>
          {/if}
          <div class={['sui-timeline-time', time]}>
            {#if Number.isNaN(at.getTime())}
              {String(event.at)}
            {:else if time === 'relative'}
              <RelativeTime value={at} {locale} />
            {:else}
              <!-- The language's own direction, so a time keeps its order in a right-to-left page. -->
              <time dir="auto" translate="no" datetime={at.toISOString()}>{clock.format(at)}</time>
            {/if}
          </div>
          <div class="sui-timeline-body">
            {#if event.actor}
              <span class="sui-timeline-face"
                ><Avatar
                  name={event.actor.name}
                  src={event.actor.src}
                  shape={event.actor.shape}
                  size={20}
                  alt=""
                /></span
              >
            {/if}
            <p class="sui-timeline-words">
              {#if event.actor}<span class="sui-timeline-actor">{event.actor.name}</span
                >{space}{/if}{event.text}
            </p>
          </div>
          {#if event.status || event.action}
            <div class="sui-timeline-side">
              {#if event.status}<Pill tone={event.status.tone}>{event.status.label}</Pill>{/if}
              {#if event.action}<span class="sui-timeline-action">{@render event.action()}</span
                >{/if}
            </div>
          {/if}
        </li>
      {/each}
    {/if}
  </ol>
{/if}

<style>
  /* One grid for every event, so the times share a column down the whole list, across days. */
  /* The refresh line reads as a table's: the refresh mark in the info hue 8px before the words
     in the secondary ink, 12px over the events. The mark hangs from a box of no height, centred
     on the words, so the line keeps their height. */
  .sui-timeline-refreshing {
    align-items: center;
    color: var(--sui-info);
    display: flex;
    gap: var(--sui-space-2);
    margin: 0 0 var(--sui-space-3);
  }

  .sui-timeline-refreshing-mark {
    align-items: center;
    block-size: 0;
    display: flex;
  }

  /* Trimmed to its cap band, as a table's refresh words are, so the mark centres on whole
     pixels (L-94, L-95). */
  .sui-timeline-refreshing-words {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .sui-timeline {
    --sui-local-timeline-target: var(--sui-field-target-min);
    column-gap: var(--sui-space-6);
    container: sui-timeline / inline-size;
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    grid-template-columns: max-content minmax(0, 1fr);
    list-style: none;
    margin: 0;
    min-inline-size: 0;
    padding: 0;
  }

  .sui-timeline:has(> li > .sui-timeline-side) {
    grid-template-columns: max-content minmax(0, 1fr) auto;
  }

  .sui-timeline-event {
    align-items: start;
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    min-inline-size: 0;
  }

  /* Each event's first ink stands one target's height plus 4px under the last one's, so the
     targets of two neighbouring actions never meet (WCAG 2.5.8), and the list reads at the
     same pitch with or without them. */
  .sui-timeline-event + .sui-timeline-event {
    margin-block-start: calc(
      var(--sui-local-timeline-target) - round(up, 1cap, 1px) + var(--sui-space-1)
    );
  }

  .sui-timeline-day {
    grid-column: 1 / -1;
    margin-block-end: var(--sui-space-3);
  }

  .sui-timeline-event:not(:first-child) > .sui-timeline-day {
    margin-block-start: var(--sui-space-3);
  }

  /* The pixel the snap adds goes above the cap, so each baseline lands on its box's foot and an
     event's last ink ends exactly where its box does. Both boxes are trimmed in the list's own
     face, so a time and the words beside it share one baseline. */
  .sui-timeline-time,
  .sui-timeline-words {
    align-content: end;
    block-size: var(--sui-block-snap);
    margin: 0;
    min-inline-size: 0;
    padding-block-start: var(--sui-block-snap-spare);
    text-box: trim-both cap alphabetic;
  }

  .sui-timeline-time {
    color: var(--sui-text-muted);
    white-space: nowrap;
  }

  .sui-timeline-time.clock > time {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  /* The words hang on their own edge, past the avatar, when they wrap. A long timeline lays out
     and paints only the words near the screen: the time column stays laid out, so it keeps its
     one width down the list. The avatar and the words' ink reach past the trimmed box, so the
     body pads out by a step and takes the step back, and the clip that skipping brings falls
     outside every ink. Until it is first drawn, an event takes one line of words, avatar or
     not: the avatar's seat hands back the pixel it adds, so a taller guess would shift the row
     a pixel when it is drawn. */
  .sui-timeline-body {
    align-items: start;
    column-gap: var(--sui-space-2);
    contain-intrinsic-block-size: auto round(up, 1cap, 1px);
    content-visibility: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    margin: calc(-1 * var(--sui-space-2));
    min-inline-size: 0;
    padding: var(--sui-space-2);
  }

  .sui-timeline-body:has(> .sui-timeline-face) {
    grid-template-columns: auto minmax(0, 1fr);
  }

  /* Where an event has an actor, every event's words stand where the actor's words do, past
     the 20px avatar's seat, so the words keep one edge down the list. */
  .sui-timeline:has(.sui-timeline-face) .sui-timeline-body {
    grid-template-columns: var(--sui-space-5) minmax(0, 1fr);
  }

  .sui-timeline:has(.sui-timeline-face) .sui-timeline-body > .sui-timeline-words {
    grid-column: -2;
  }

  .sui-timeline-words {
    color: var(--sui-text-primary);
    overflow-wrap: anywhere;
    text-wrap: pretty;
  }

  .sui-timeline-actor {
    font-weight: var(--sui-weight-semibold);
  }

  /* Seats as tall as the first line's cap band: what stands in them centres on it and reaches
     above and below it evenly, without raising the row. The seat rounds to an even height so a
     20px avatar centres to the pixel, and hands back the pixel that adds over an odd cap, so an
     event with an avatar keeps the list's pitch. */
  .sui-timeline-face,
  .sui-timeline-side {
    align-items: center;
    block-size: round(up, 1cap, 2px);
    display: flex;
    margin-block-end: calc(round(up, 1cap, 1px) - round(up, 1cap, 2px));
  }

  .sui-timeline-side {
    gap: var(--sui-space-3);
    justify-content: flex-end;
  }

  .sui-timeline-action {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
    white-space: nowrap;
  }

  /* A LoadMore after the list is its last row, under a hairline as far below the last
     event's words as the row's own words stand under it (L-63). */
  .sui-timeline:has(+ :global(.sui-load-more)) {
    padding-block-end: calc(var(--sui-row-pad-default) + var(--sui-row-hairline));
    position: relative;
  }

  .sui-timeline:has(+ :global(.sui-load-more))::after {
    background: var(--sui-border-divider);
    block-size: var(--sui-row-hairline);
    content: '';
    inset-block-end: 0;
    inset-inline: 0;
    position: absolute;
  }

  .sui-timeline-empty {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* The placeholder events are the frame the light crosses: each bar shows its part of one
     light, so it reads as one light over the whole list, and the list clips it. */
  .sui-timeline:has(> .placeholder) {
    overflow: clip;
    position: relative;
  }

  /* A bar is already a whole cap tall, so its line takes no room for one. */
  .placeholder :is(.sui-timeline-time, .sui-timeline-words) {
    padding-block-start: 0;
  }

  /* A placeholder paints no words for the skip to clip, so its body needs no bleed, which the
     list's clip would cut. */
  .placeholder > .sui-timeline-body {
    content-visibility: visible;
    margin: 0;
    padding: 0;
  }

  .bar {
    background: var(--sui-placeholder);
    block-size: round(up, 1cap, 1px);
    border-radius: var(--sui-radius-pill);
    clip-path: inset(0 round var(--sui-radius-pill));
    display: block;
    inline-size: min(18rem, 80%);
  }

  .clock .bar {
    font-family: var(--sui-mono);
    inline-size: var(--sui-local-clock-width);
  }

  .relative .bar {
    inline-size: 6rem;
  }

  .placeholder:nth-child(even) .sui-timeline-words .bar {
    inline-size: min(12rem, 56%);
  }

  .bar::after {
    animation: sui-timeline-sheen var(--sui-duration-shimmer) var(--sui-ease-linear) infinite;
    background: var(--sui-placeholder-sheen);
    content: '';
    inset-block: 0;
    inset-inline: calc(-1 * var(--sui-placeholder-reach));
    position: absolute;
  }

  .bar:dir(rtl)::after {
    scale: -1 1;
  }

  @keyframes sui-timeline-sheen {
    from {
      transform: translateX(-50%);
    }

    to {
      transform: translateX(50%);
    }
  }

  /* A touch target is 44px, so a wide timeline with actions spaces its events by it; once
     each time stands over its words, an action sits a time and a line of words away from the
     next one already. */
  @media (max-width: 47.9375rem), (pointer: coarse) {
    @container sui-timeline not (max-width: 25rem) {
      .sui-timeline:has(.sui-timeline-action) > .sui-timeline-event {
        --sui-local-timeline-target: var(--sui-touch-target);
      }
    }
  }

  /* Stacked, the avatar keeps its own column, so the time, the words and what drops under them
     hang on one edge, and the day spans both columns. */
  @container sui-timeline (max-width: 25rem) {
    .sui-timeline-event {
      column-gap: var(--sui-space-2);
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--sui-row-copy-gap);
    }

    .sui-timeline-event:has(> .sui-timeline-body > .sui-timeline-face) {
      grid-template-columns: auto minmax(0, 1fr);
    }

    /* Stacked, the seat is the event's column and holds only the avatar: each time stands over
       its words on their edge, so an event reads as one block. */
    .sui-timeline:has(.sui-timeline-face) > .sui-timeline-event {
      grid-template-columns: var(--sui-space-5) minmax(0, 1fr);
    }

    .sui-timeline:has(.sui-timeline-face) :is(.sui-timeline-time, .sui-timeline-words) {
      grid-column: -2;
    }

    /* Each line of words is a line of its own here, so it reads at the body size, as a phone's
       text does (L-22), and the avatar's seat centres on that cap; the times keep the meta size. */
    .sui-timeline-words,
    .sui-timeline-face {
      font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
        var(--sui-sans);
    }

    .sui-timeline-body {
      display: contents;
    }

    .sui-timeline-day,
    .sui-timeline-time {
      grid-column: 1 / -1;
    }

    /* Over its words a time may break after its date, so larger text never pushes it past the
       list. */
    .sui-timeline-time {
      white-space: normal;
    }

    .sui-timeline-day {
      margin-block-end: var(--sui-space-1);
    }

    /* Stacked, an event is a time a copy gap over its words, so the next event stands 4px
       further off than it does on one line, and each event reads as one block. */
    .sui-timeline-event + .sui-timeline-event {
      margin-block-start: calc(
        var(--sui-local-timeline-target) - round(up, 1cap, 1px) + var(--sui-space-2)
      );
    }

    .sui-timeline-side {
      block-size: auto;
      flex-wrap: wrap;
      grid-column: -2;
      justify-content: flex-start;
    }
  }

  @media (forced-colors: active) {
    .bar {
      outline: var(--sui-stroke) solid GrayText;
      outline-offset: calc(-1 * var(--sui-stroke));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar::after {
      animation: none;
      content: none;
    }
  }
</style>
