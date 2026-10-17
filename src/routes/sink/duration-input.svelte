<script module lang="ts">
  export const section = {
    title: 'Duration input',
    order: 104,
    lead: 'A duration stored in seconds and said as an amount and a unit. A count of anything else is a TextInput.',
    components: ['DurationInput']
  };
</script>

<script lang="ts">
  import { Button, DurationInput } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
  title="Units"
  note="A value shows in the largest unit that holds it whole, and picking another unit leaves the seconds alone"
>
  <Specimen label="Stored as {retry} seconds" code="bind:value max">
    <DurationInput label="Retry delay" bind:value={retry} max={86400} />
  </Specimen>
  <Specimen label="Stored as {merge} seconds" code="bind:value">
    <DurationInput label="Merge window" bind:value={merge} />
  </Specimen>
</Example>

<Example
  title="States"
  note="Text outside the range stays on screen with its reason and is never stored, and a locked field says why"
>
  <Specimen label="Out of range" code="min max">
    <DurationInput label="Sweep interval" value={0} min={60} max={86400} />
  </Specimen>
  <Specimen label="Refused" code="invalid">
    <div class="described">
      <DurationInput
        label="Cache lifetime"
        value={300}
        invalid
        aria-describedby="sink-duration-refused"
      />
      <p id="sink-duration-refused" class="refused">The server refused this lifetime</p>
    </div>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="described">
      <DurationInput
        label="Lock timeout"
        value={600}
        disabled
        aria-describedby="sink-duration-locked"
      />
      <p id="sink-duration-locked" class="reason">Only an owner can change the lock timeout</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Saving with a problem"
  note="Type 0.5 and save: the button stays enabled and sends focus to the amount, where the reason already shows"
>
  <Specimen label="Saved as {saved} seconds" code="onproblem">
    <div class="save">
      <DurationInput
        id="sink-duration-cadence"
        label="Check cadence"
        bind:value={cadence}
        min={1}
        onproblem={(next) => (problem = next)}
      />
      <Button onclick={save}>Save the cadence</Button>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A long reason wraps under the controls instead of widening the field"
  layout="stack"
>
  <Specimen label="Long reason" code="min max">
    <div class="narrow">
      <DurationInput label="Backoff" value={5} min={60} max={3600} />
    </div>
  </Specimen>
</Example>

<style>
  .described {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    min-inline-size: 0;
  }

  .refused,
  .reason {
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .refused {
    color: var(--sui-danger);
  }

  .reason {
    color: var(--sui-text-secondary);
  }

  .save {
    align-items: start;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
  }

  .narrow {
    inline-size: 12rem;
    max-inline-size: 100%;
  }
</style>
