<script module lang="ts">
  export const section = {
    title: 'Duration input',
    order: 104,
    lead: 'A duration stored in seconds and said as an amount and a unit. A count of anything else is a TextInput.',
    components: ['DurationInput']
  };
</script>

<script lang="ts">
  import { Button, DurationInput, Field } from '#lib';
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
  <Specimen label="Stored as {retry} {retry === 1 ? 'second' : 'seconds'}" code="bind:value max">
    <Field label="Retry delay">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} bind:value={retry} max={86400} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Stored as {merge} {merge === 1 ? 'second' : 'seconds'}" code="bind:value">
    <Field label="Merge window">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} bind:value={merge} />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="States"
  note="The range shows before anything goes wrong, text outside it keeps its reason, and a locked field says why"
>
  <Specimen label="Out of range" code="min max">
    <Field label="Sweep interval">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} value={0} min={60} max={86400} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Refused" code="invalid">
    <Field label="Cache lifetime" error="The server refused this lifetime">
      {#snippet control({ id, describedby, invalid })}
        <DurationInput {id} aria-describedby={describedby} {invalid} value={300} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <Field label="Lock timeout" hint="Only an owner can change the lock timeout">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} value={600} disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Saving with a problem"
  note="Type 0.5 and save: the button stays enabled and sends focus to the amount, where the reason shows"
>
  <Specimen label="Saved as {saved} seconds" code="onproblem">
    <div class="save">
      <Field id="sink-duration-cadence" label="Check cadence">
        {#snippet control({ id, describedby })}
          <DurationInput
            {id}
            aria-describedby={describedby}
            bind:value={cadence}
            min={1}
            onproblem={(next) => (problem = next)}
          />
        {/snippet}
      </Field>
      <Button onclick={save}>Save the cadence</Button>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A long hint or reason wraps under the controls instead of widening the field"
  layout="stack"
>
  <Specimen label="Long reason" code="min max">
    <div class="narrow">
      <Field label="Backoff">
        {#snippet control({ id, describedby })}
          <DurationInput {id} aria-describedby={describedby} value={5} min={60} max={3600} />
        {/snippet}
      </Field>
    </div>
  </Specimen>
</Example>

<style>
  .save {
    display: grid;
    gap: var(--sui-space-4);
    justify-items: start;
  }

  .narrow {
    inline-size: 12rem;
    max-inline-size: 100%;
  }
</style>
