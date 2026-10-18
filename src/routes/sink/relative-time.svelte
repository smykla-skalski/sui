<script module lang="ts">
  export const section = {
    title: 'Relative time',
    order: 85,
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

  const past = [
    { label: 'Just now', value: at(0) },
    { label: 'Minutes ago', value: at(-4.5 * MINUTE) },
    { label: 'Hours ago', value: at(-3.5 * HOUR) },
    { label: 'Days ago', value: at(-2.5 * DAY) },
    { label: 'A month ago', value: at(-30 * DAY) }
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
>
  {#each past as time (time.label)}
    <Specimen label={time.label}><RelativeTime value={time.value} /></Specimen>
  {/each}
</Example>

<Example title="Future" note="An instant still ahead reads as how soon">
  {#each future as time (time.label)}
    <Specimen label={time.label}><RelativeTime value={time.value} /></Specimen>
  {/each}
</Example>

<Example
  title="Exact"
  note="The whole instant shows in place, for a reader who chose it, and the tooltip goes away"
>
  <Specimen label="Whole instant" code="exact"><RelativeTime value={instant} exact /></Specimen>
</Example>

<Example
  title="In context"
  note="The time stays one word in a sentence, and every instance reads one page clock"
>
  <p class="line">
    <FactLine
      ><span>Deployed by Ada <RelativeTime value={past[1].value} /></span><span>checked again</span
      ></FactLine
    >
    <RelativeTime value={future[0].value} />
  </p>
</Example>

<style>
  .line {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
  }
</style>
