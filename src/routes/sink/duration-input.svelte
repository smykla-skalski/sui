<script module lang="ts">
  export const section = { title: 'Duration input', order: 104 };
</script>

<script lang="ts">
  import { Button, DurationInput } from '#lib';
  import Example from '../kit/Example.svelte';

  const DAY = 86_400;

  let retry = $state(90);
  let merge = $state(7200);
  let cadence = $state(30);
  let saved = $state(30);
  let problem = $state<string | null>(null);

  function save(): void {
    if (problem === null) saved = cadence;
    else document.getElementById('sink-duration-cadence')?.focus();
  }
</script>

<Example
  title="States"
  note="A value shows in the largest unit that holds it whole, and picking another unit leaves the seconds alone"
>
  <div class="specimen">
    <DurationInput label="Retry delay" bind:value={retry} max={DAY} />
    <span class="state">value={retry}</span>
  </div>
  <div class="specimen">
    <DurationInput label="Merge window" bind:value={merge} />
    <span class="state">value={merge}</span>
  </div>
  <div class="specimen">
    <DurationInput label="Lock timeout" value={600} disabled />
  </div>
</Example>

<Example
  title="Invalid values"
  note="Text outside the range or short of a whole second stays on screen with its reason and is never stored"
>
  <DurationInput label="Sweep interval" value={0} min={60} max={DAY} />
  <div class="specimen">
    <DurationInput
      label="Cache lifetime"
      value={300}
      invalid
      aria-describedby="sink-duration-refused"
    />
    <p id="sink-duration-refused" class="refused">The server refused this lifetime</p>
  </div>
</Example>

<Example
  title="Saving with a problem"
  note="Type 0.5 and save: the button stays enabled and sends focus to the amount, where the reason already shows"
>
  <DurationInput
    id="sink-duration-cadence"
    label="Check cadence"
    bind:value={cadence}
    min={1}
    onproblem={(next) => (problem = next)}
  />
  <Button onclick={save}>Save the cadence</Button>
  <span class="state">saved={saved}</span>
</Example>

<Example
  title="Narrow width"
  note="A long reason wraps under the controls instead of widening the field"
  layout="stack"
>
  <div class="narrow">
    <DurationInput label="Backoff" value={5} min={60} max={3600} />
  </div>
</Example>

<style>
  .specimen {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    min-inline-size: 0;
  }

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }

  .refused {
    color: var(--sui-danger);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: 12rem;
    max-inline-size: 100%;
  }
</style>
