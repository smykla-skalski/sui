<script module lang="ts">
  export const section = { title: 'Chip', order: 81 };
</script>

<script lang="ts">
  import { Chip } from '#lib';
  import Example from '../kit/Example.svelte';

  const tones = [
    ['neutral', 'Scheduled'],
    ['clear', 'Passing'],
    ['signal', 'Syncing'],
    ['accent', 'Managed'],
    ['warning', 'Drifted'],
    ['stop', 'Failing'],
    ['absent', 'No checks']
  ] as const;

  let labels = $state(['kuma.io/zone', 'team:platform', 'env=production', 'v2.9.1']);
</script>

<Example
  title="Tones"
  note="A tone says what a value means, so a column reads the same top to bottom"
>
  {#each tones as [tone, label] (tone)}
    <Chip {tone} {label} />
  {/each}
</Example>

<Example title="Small and with an icon" note="A small chip sits inside a line of text">
  <Chip tone="clear" icon="check" label="Merged" />
  <Chip tone="stop" icon="failure" label="Rejected" />
  <Chip small label="3 files" />
  <Chip small tone="signal" label="Draft" />
</Example>

<Example title="Technical values" note="IDs, paths and versions are mono with tabular figures">
  <Chip mono label="sha256:9f86d081" />
  <Chip mono tone="accent" label="refs/heads/main" />
  <Chip mono small label="v1.24.0" />
</Example>

<Example title="Removable" note="Each remove control is named for its value and has a 24px target">
  {#each labels as label (label)}
    <Chip mono {label} onremove={() => (labels = labels.filter((other) => other !== label))} />
  {/each}
  {#if labels.length === 0}
    <Chip tone="absent" label="No labels" />
  {/if}
</Example>

<Example title="Long value" note="A long value ends in an ellipsis and shows in full in a tooltip">
  <div class="narrow">
    <Chip
      mono
      label="registry.example.com/platform/control-plane/kuma-cp:2.9.1-rc.3"
      onremove={() => {}}
    />
  </div>
</Example>

<style>
  .narrow {
    display: flex;
    inline-size: min(100%, 16rem);
  }
</style>
