<script module lang="ts">
  export const section = {
    title: 'Text input',
    order: 20,
    lead: 'A single line the reader types. Inside a form, wrap it in a Field so it has a label, help and an error.',
    components: ['TextInput']
  };
</script>

<script lang="ts">
  import { TextInput } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let name = $state('');
  let digest = $state('sha256:9f86d081884c7d65');
</script>

<Example
  title="States"
  note="Rest, filled, invalid and disabled, and the locked one says why"
  layout="grid"
>
  <Specimen label="Rest" code="placeholder">
    <TextInput aria-label="Project name" placeholder="your-project" bind:value={name} />
  </Specimen>
  <Specimen label="Filled, technical value" code="mono">
    <TextInput aria-label="Image digest" mono bind:value={digest} />
  </Specimen>
  <Specimen label="Invalid" code="invalid">
    <TextInput aria-label="Team name" value="Team with spaces" invalid />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <TextInput
        aria-label="Owner"
        aria-describedby="sink-text-input-owner-reason"
        value="smykla-skalski"
        disabled
      />
      <p id="sink-text-input-owner-reason" class="reason">
        Only an owner can move the repository to another account
      </p>
    </div>
  </Specimen>
</Example>

<Example title="Tiers" note="34px by default and 44px on phones, and a surface may opt into 40px">
  <Specimen label="Default" code="--sui-control-height-compact">
    <TextInput aria-label="Filter the projects" placeholder="Filter" />
  </Specimen>
  <Specimen label="Tall" code="--sui-local-control-height">
    <div class="tall">
      <TextInput aria-label="Search the projects" type="search" placeholder="Search" />
    </div>
  </Specimen>
</Example>

<style>
  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    inline-size: 100%;
  }

  .reason {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .tall {
    --sui-local-control-height: var(--sui-control-height);
    display: flex;
    inline-size: 100%;
  }
</style>
