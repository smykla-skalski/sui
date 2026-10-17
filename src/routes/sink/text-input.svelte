<script module lang="ts">
  export const section = { title: 'Text input', order: 20 };
</script>

<script lang="ts">
  import { TextInput } from '#lib';
  import Example from '../kit/Example.svelte';

  let name = $state('');
  let digest = $state('sha256:9f86d081884c7d65');
</script>

<Example
  title="States"
  note="Rest, filled, invalid and disabled at the 34px tier, with the reason beside the locked one"
  layout="stack"
>
  <div class="field">
    <TextInput aria-label="Project name" placeholder="your-project" bind:value={name} />
    <TextInput aria-label="Image digest" mono bind:value={digest} />
    <TextInput aria-label="Team name" value="Team with spaces" invalid />
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
  </div>
</Example>

<Example title="Taller tier" note="A surface opts into 40px through one custom property">
  <div class="tall">
    <TextInput aria-label="Search the projects" type="search" placeholder="Search" />
  </div>
</Example>

<style>
  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  .reason {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

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
