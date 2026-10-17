<script module lang="ts">
  export const section = { title: 'Text input', order: 20 };
</script>

<script lang="ts">
  import { TextInput } from '#lib';
  import Example from '../kit/Example.svelte';

  let name = $state('');
  let digest = $state('sha256:9f86d081884c7d65');
</script>

<Example title="States" note="Rest, filled, invalid and disabled at the 34px tier" layout="stack">
  <div class="field">
    <TextInput aria-label="Project name" placeholder="your-project" bind:value={name} />
    <TextInput aria-label="Image digest" mono bind:value={digest} />
    <TextInput aria-label="Team name" value="Team with spaces" invalid />
    <TextInput aria-label="Owner" value="smykla-skalski" disabled />
  </div>
</Example>

<Example title="Taller tier" note="A surface opts into 40px through one custom property">
  <div class="tall">
    <TextInput aria-label="Search the projects" type="search" placeholder="Search" />
  </div>
</Example>

<style>
  .field {
    display: grid;
    gap: var(--sui-space-3);
    inline-size: min(100%, 24rem);
  }

  .tall {
    --sui-local-control-height: var(--sui-control-height);
    inline-size: min(100%, 24rem);
  }
</style>
