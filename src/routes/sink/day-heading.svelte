<script module lang="ts">
  export const section = { title: 'Day heading', order: 115 };
</script>

<script lang="ts">
  import { DayHeading, dayKey } from '#lib';
  import Example from '../kit/Example.svelte';

  const now = new Date();
  const local = (daysAgo: number, hour: number, minute: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute);

  const entries = [
    { at: now, what: 'Merged the release workflow' },
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
    at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
</script>

<Example
  title="Today and other days"
  note="Entries group by the reader's calendar, so one local day keeps one heading where it crosses midnight in UTC"
  layout="stack"
>
  <div class="days">
    {#each days as day (day.key)}
      <div class="day">
        <DayHeading value={day.entries[0].at} level={4} />
        <ul class="entries">
          {#each day.entries as entry (entry.what)}
            <li>
              <span class="what">{entry.what}</span>
              <time class="time" datetime={entry.at.toISOString()}>{clock(entry.at)}</time>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</Example>

<style>
  .days {
    display: grid;
    gap: var(--sui-space-5);
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

  .entries > li {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-1) var(--sui-space-3);
    justify-content: space-between;
  }

  .what {
    color: var(--sui-text-primary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .time {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-compact) / var(--sui-leading-compact) var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
