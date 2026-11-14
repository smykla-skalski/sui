<script module lang="ts">
  export const section = {
    title: 'Relative Time',
    short: 'Time',
    lead: 'A time read as how long ago or how soon, with the whole instant in a tooltip. The day over a run of entries is a DayHeading.',
    components: ['RelativeTime']
  };
</script>

<script lang="ts">
  import { FactLine, RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const loaded = Date.now();
  const at = (offset: number) => new Date(loaded + offset).toISOString();

  // The page is written before its reader's zone is known, and no instant falls on one date in
  // every zone, so the fixed ones are read in UTC and script never redraws their date or hour.
  const zone = 'UTC';

  const past: { label: string; value: string; timeZone?: string }[] = [
    { label: 'Just now', value: at(0) },
    { label: 'Minutes ago', value: at(-4.5 * MINUTE) },
    { label: 'Hours ago', value: at(-3.5 * HOUR) },
    { label: 'Days ago', value: at(-2.5 * DAY) },
    // Past a week a time reads as its date, and a date counted from now turns over once a day,
    // which could fall between the server's render and the page's, so this one is fixed.
    { label: 'Weeks ago', value: '2026-03-14T12:00:00Z', timeZone: zone }
  ];
  // Half a step past a whole count, as the past ones are, so the moments between the server's
  // render and the page's never cross into the next count.
  const future = [
    { label: 'In minutes', value: at(9.5 * MINUTE) },
    { label: 'In hours', value: at(5.5 * HOUR) },
    { label: 'In days', value: at(3.5 * DAY) }
  ];
  // The whole instant shows its seconds, so it is a fixed one rather than one counted from now.
  const instant = '2026-03-14T09:26:53Z';
</script>

<Example
  title="Past"
  note="Hover a time, or press and hold it, to read the whole instant with seconds and its zone"
  layout="grid"
  --specimen-min="8rem"
  --specimen-max="max-content"
  --specimen-column-gap="clamp(var(--sui-space-6), 5%, calc(2 * var(--sui-space-6)))"
>
  {#each past as time (time.label)}
    <Specimen label={time.label}
      ><RelativeTime value={time.value} timeZone={time.timeZone} /></Specimen
    >
  {/each}
</Example>

<Example
  title="Future"
  note="An instant still ahead reads as how soon"
  layout="grid"
  --specimen-min="8rem"
  --specimen-max="max-content"
  --specimen-column-gap="clamp(var(--sui-space-6), 5%, calc(2 * var(--sui-space-6)))"
>
  {#each future as time (time.label)}
    <Specimen label={time.label}><RelativeTime value={time.value} /></Specimen>
  {/each}
</Example>

<Example
  title="Exact"
  note="The whole instant shows in place, for a reader who chose it, and the tooltip goes away"
>
  <Specimen label="Whole instant"><RelativeTime value={instant} exact timeZone={zone} /></Specimen>
</Example>

<Example
  title="In Context"
  note="The time stays one word in a sentence, and every instance reads one page clock"
>
  <p class="line">
    <FactLine
      ><span class="clause"
        >Deployed by Ada <span class="when"><RelativeTime value={past[1].value} /></span></span
      ><span class="clause"
        >checked again <span class="when"><RelativeTime value={future[0].value} /></span></span
      ></FactLine
    >
  </p>
</Example>

<style>
  .line {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
  }

  /* The times are what the line reports, so they read in the primary ink over its muted words,
     as the standalone times above do. */
  /* Each clause wraps whole to the next line when it fits there, so a line never parts the
     words of one clause. */
  .clause {
    display: inline-block;
  }

  .when {
    color: var(--sui-text-primary);
  }
</style>
