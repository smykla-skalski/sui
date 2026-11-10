<script module lang="ts">
  export const section = {
    title: 'Duration Input',
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
  let poll = $state(900);
  let cadence = $state(30);
  let saved = $state(30);
  let cadenceReset = $state(0);
  let problem = $state<string | null>(null);

  function save(): void {
    if (problem === null) saved = cadence;
    else document.getElementById('sink-duration-cadence')?.focus();
  }

  function discard(): void {
    cadence = saved;
    cadenceReset += 1;
  }
</script>

<Example
  title="Units"
  layout="grid"
  --specimen-min="13.5rem"
  --specimen-max="19rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="A value shows in the largest unit that holds it whole, and a unit that says it plainly keeps its seconds"
>
  <Specimen label="Stored as {retry}&nbsp;{retry === 1 ? 'second' : 'seconds'}">
    <Field label="Retry delay">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} bind:value={retry} max={86400} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Stored as {merge}&nbsp;{merge === 1 ? 'second' : 'seconds'}">
    <Field label="Merge window">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} bind:value={merge} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Stored as {poll}&nbsp;{poll === 1 ? 'second' : 'seconds'}">
    <Field label="Poll interval">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} bind:value={poll} />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="States"
  layout="grid"
  --specimen-min="13.5rem"
  --specimen-max="19rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="The range shows before anything goes wrong, text outside it keeps its reason, and a locked field says why"
>
  <Specimen label="Out of range">
    <Field label="Sweep interval">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} value={0} min={60} max={86400} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Refused">
    <Field label="Cache lifetime" error="Enter a lifetime of 1 day or less">
      {#snippet control({ id, describedby, invalid })}
        <DurationInput {id} aria-describedby={describedby} {invalid} value={172800} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled">
    <Field label="Lock timeout" hint="Only an owner can change the lock timeout">
      {#snippet control({ id, describedby })}
        <DurationInput {id} aria-describedby={describedby} value={600} disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Saving with a Problem"
  note="Type 0.5 and save: the button stays enabled and sends focus to the amount, where the reason shows"
>
  <Specimen label="Saved as {saved}&nbsp;{saved === 1 ? 'second' : 'seconds'}">
    <div class="save">
      <Field id="sink-duration-cadence" label="Check cadence">
        {#snippet control({ id, describedby })}
          <DurationInput
            {id}
            aria-describedby={describedby}
            bind:value={cadence}
            resetKey={cadenceReset}
            min={1}
            onproblem={(next) => (problem = next)}
          />
        {/snippet}
      </Field>
      <div class="actions">
        <Button tone="signal" onclick={save}>Save the Cadence</Button>
        <Button onclick={discard} data-reset={cadenceReset}>Discard the Cadence</Button>
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow Width"
  note="A long hint or reason wraps under the controls instead of widening the field"
  layout="stack"
>
  <Specimen label="Long reason">
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

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
  }

  .narrow {
    inline-size: 13rem;
    max-inline-size: 100%;
  }
</style>
