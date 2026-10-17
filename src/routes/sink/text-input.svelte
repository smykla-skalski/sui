<script module lang="ts">
  export const section = {
    title: 'Text input',
    order: 20,
    lead: 'A single line the reader types. Inside a form, wrap it in a Field so it has a label, help and an error.',
    components: ['TextInput']
  };
</script>

<script lang="ts">
  import { Field, TextInput } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let name = $state('');
  let digest = $state('sha256:9f86d081884c7d65');
</script>

<Example
  title="States"
  note="Rest, filled, invalid, read only and disabled, each under its label, and the locked one says why"
  layout="grid"
>
  <Specimen label="Rest" code="placeholder">
    <Field label="Project name">
      {#snippet control({ id, describedby })}
        <TextInput
          {id}
          aria-describedby={describedby}
          placeholder="your-project"
          bind:value={name}
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Filled, technical value" code="mono">
    <Field label="Image digest">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} mono bind:value={digest} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Invalid" code="invalid">
    <Field label="Team name" error="Use letters, digits and dashes only">
      {#snippet control({ id, describedby, invalid })}
        <TextInput {id} aria-describedby={describedby} {invalid} value="Team with spaces" />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Read only" code="readonly">
    <Field label="Repository ID" hint="Set when the repository was created">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} mono readonly value="R_kgDOJ8x2Qw" />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <Field label="Owner" hint="Only an owner can move the repository to another account">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} value="smykla-skalski" disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example title="Tiers" note="34px by default and 44px on phones, and a surface may opt into 40px">
  <Specimen label="Default" code="--sui-control-height-compact">
    <Field label="Filter the projects">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} placeholder="api" />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Tall" code="--sui-local-control-height">
    <div class="tall">
      <Field label="Search the projects">
        {#snippet control({ id, describedby })}
          <TextInput {id} aria-describedby={describedby} type="search" placeholder="platform" />
        {/snippet}
      </Field>
    </div>
  </Specimen>
</Example>

<style>
  .tall {
    --sui-local-control-height: var(--sui-control-height);
    display: grid;
    inline-size: 100%;
  }
</style>
