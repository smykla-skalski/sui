<script module lang="ts">
  export const section = {
    title: 'Text Input',
    lead: 'A single line the reader types. Inside a form, wrap it in a Field so it has a label, help and an error.',
    components: ['TextInput']
  };
</script>

<script lang="ts">
  import { FactLine, Field, TextInput } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let name = $state('');
  let display = $state('Acme Web');
  let digest = $state('sha256:9f86d081884c7d65');
</script>

<Example
  title="States"
  note="Rest, filled, invalid, read only and disabled, and the locked ones say why"
  layout="grid"
>
  <Specimen label="Rest">
    <Field label="Project name">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} placeholder="acme-web…" bind:value={name} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Filled">
    <Field label="Display name">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} bind:value={display} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Filled, technical value">
    <Field label="Image digest">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} mono bind:value={digest} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Invalid">
    <Field label="Team name" error="Use letters, digits and dashes only">
      {#snippet control({ id, describedby, invalid })}
        <TextInput {id} aria-describedby={describedby} {invalid} value="Team with spaces" />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Read only">
    <Field label="Repository ID" hint="Fixed when the repository was created">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} mono readonly value="R_kgDOJ8x2Qw" />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled">
    <Field label="Owner" hint="Only an owner can transfer the repository">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} value="smykla-skalski" disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<!-- Each tier says the height it draws. A phone or a touch screen lifts every tier to the touch
     height, so there one specimen stands for all three. -->
{#snippet defaultTier()}<FactLine
    ><span><span class="fine">Default</span><span class="coarse">All tiers</span></span><span
      ><span class="fine">34 px</span><span class="coarse">44 px</span></span
    ></FactLine
  >{/snippet}
{#snippet tallTier()}<FactLine><span>Tall</span><span>40 px</span></FactLine>{/snippet}
{#snippet touchTier()}<FactLine><span>Touch</span><span>44 px</span></FactLine>{/snippet}

<Example
  title="Tiers"
  note="34 px by default and 44 px on phones, and a surface may opt into 40 px"
  layout="grid"
>
  <Specimen label={defaultTier}>
    <Field label="Filter the projects">
      {#snippet control({ id, describedby })}
        <TextInput {id} aria-describedby={describedby} placeholder="api…" value="api-gateway" />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label={tallTier}>
    <div class="tall">
      <Field label="Search the projects">
        {#snippet control({ id, describedby })}
          <TextInput {id} aria-describedby={describedby} placeholder="platform…" value="platform" />
        {/snippet}
      </Field>
    </div>
  </Specimen>
  <Specimen label={touchTier}>
    <div class="touch">
      <Field label="Find a repository">
        {#snippet control({ id, describedby })}
          <TextInput {id} aria-describedby={describedby} placeholder="sui…" value="sui" />
        {/snippet}
      </Field>
    </div>
  </Specimen>
</Example>

<style>
  .tall,
  .touch {
    display: grid;
    inline-size: 100%;
  }

  .tall {
    --sui-local-control-height: var(--sui-control-height);
  }

  .touch {
    --sui-local-control-height: var(--sui-touch-target);
  }

  .coarse {
    display: none;
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .fine,
    :global(.specimen):has(.tall, .touch) {
      display: none;
    }

    .coarse {
      display: inline;
    }
  }
</style>
