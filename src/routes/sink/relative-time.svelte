<script module lang="ts">
  export const section = { title: 'Relative time', order: 85 };
</script>

<script lang="ts">
  import { RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';

  const MINUTE = 60_000;
  const loaded = Date.now();

  const past = [0, 4 * MINUTE, 3 * 60 * MINUTE, 2 * 24 * 60 * MINUTE, 30 * 24 * 60 * MINUTE].map(
    (ago) => new Date(loaded - ago).toISOString()
  );
  const future = [9 * MINUTE, 5 * 60 * MINUTE, 3 * 24 * 60 * MINUTE].map((ahead) =>
    new Date(loaded + ahead).toISOString()
  );
</script>

<Example
  title="Past"
  note="Press a time, or focus it, to read the whole instant with seconds and its zone"
>
  {#each past as value (value)}
    <span class="line"><RelativeTime {value} /></span>
  {/each}
</Example>

<Example title="Future" note="An instant still ahead reads as how soon">
  {#each future as value (value)}
    <span class="line"><RelativeTime {value} /></span>
  {/each}
</Example>

<Example
  title="In a sentence"
  note="The time stays one word, and every instance reads one page clock"
>
  <p class="line">
    Deployed by Ada <RelativeTime value={past[1]} /> · checked again <RelativeTime
      value={future[0]}
    />
  </p>
  <p class="line">Exported <RelativeTime value={past[3]} exact /></p>
</Example>

<style>
  .line {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
  }
</style>
