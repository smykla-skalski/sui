<script module lang="ts">
  export const section = {
    title: 'Day Heading',
    lead: 'The heading over a run of entries from one day, in the reader’s own calendar. A single time inside a row is a RelativeTime.',
    components: ['DayHeading']
  };
</script>

<script lang="ts">
  import { formatLocale } from '../../lib/internal/locale.js';
  import { DayHeading, dayKey } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const now = new Date();
  const local = (daysAgo: number, hour: number, minute: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute);

  const readings = [
    { label: 'Today', value: now },
    { label: 'Yesterday', value: local(1, 9, 30) },
    { label: 'This week', value: local(4, 14, 5) },
    { label: 'Earlier this year', value: local(8, 11, 0) },
    { label: 'Another year', value: local(400, 16, 45) }
  ];

  // Every time shown is a fixed minute of its day, so the server's render and the page agree.
  const entries = [
    { at: local(0, 0, 20), what: 'Merged the release workflow' },
    { at: local(0, 0, 10), what: 'Opened a pull request just after local midnight' },
    { at: local(1, 23, 50), what: 'Closed an issue just before local midnight' },
    { at: local(1, 9, 30), what: 'Synced 84 files' },
    { at: local(4, 14, 5), what: 'Invited a member' },
    { at: local(40, 11, 0), what: 'Archived a repository' },
    { at: local(400, 16, 45), what: 'Created the workspace' }
  ];

  /* Runs of one local day, keyed by the same calendar the headings read. */
  const days: { key: string; entries: typeof entries }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.at);
    const last = days.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, entries: [entry] });
  }

  const clock = (at: Date) =>
    at.toLocaleTimeString(formatLocale(), { hour: '2-digit', minute: '2-digit' });
</script>

<Example
  title="Readings"
  note="Today and yesterday in words, the weekday inside the last week, and the year only when it is not this one"
  layout="grid"
>
  {#each readings as day (day.label)}
    <Specimen label={day.label}><DayHeading value={day.value} level={4} /></Specimen>
  {/each}
  <Specimen label="Not a date"><DayHeading value="soon" level={4} /></Specimen>
</Example>

<Example
  title="In Context"
  note="Entries group by the reader’s calendar, so one local day keeps one heading across midnight in UTC"
  layout="stack"
>
  <div class="days">
    {#each days as day (day.key)}
      <div class="day">
        <DayHeading value={day.entries[0].at} level={4} />
        <ul class="entries" role="list">
          {#each day.entries as entry (entry.what)}
            <li>
              <span class="what">{entry.what}</span>
              <time class="time" translate="no" datetime={entry.at.toISOString()}
                >{clock(entry.at)}</time
              >
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</Example>

<style>
  /* A day stands twice as far from the last as its heading stands over its entries, so each
     heading reads as the head of the run under it and the runs still read as one feed. */
  .days {
    display: grid;
    gap: var(--sui-space-6);
  }

  .day {
    display: grid;
    gap: var(--sui-space-3);
  }

  .entries {
    display: grid;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Each time keeps the column at the row's end at every width, so the times read down one
     edge; an entry too long for its line wraps its own words beside its time. */
  .entries > li {
    align-items: baseline;
    column-gap: var(--sui-space-4);
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
  }

  .what {
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .time {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-compact) / var(--sui-leading-compact)
      var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
