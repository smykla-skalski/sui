<script module lang="ts">
  export const section = { title: 'Chip', order: 81 };
</script>

<script lang="ts">
  import { Chip } from '#lib';
  import Example from '../kit/Example.svelte';

  const github = [
    ['bug', 'd73a4a'],
    ['documentation', '0075ca'],
    ['duplicate', 'cfd3d7'],
    ['enhancement', 'a2eeef'],
    ['good first issue', '7057ff'],
    ['help wanted', '008672'],
    ['invalid', 'e4e669'],
    ['question', 'd876e3'],
    ['wontfix', 'ffffff']
  ] as const;

  const extremes = [
    ['white', '#ffffff'],
    ['cream', '#fef2c0'],
    ['grey', '#808080'],
    ['blue', '#1d76db'],
    ['violet', '#5319e7'],
    ['black', '#000000']
  ] as const;

  let labels = $state(['kuma.io/zone', 'team:platform', 'env=production', 'v2.9.1']);
</script>

<Example title="Values" note="A chip carries a value, and a small one sits inside a line of text">
  <Chip label="Scheduled" />
  <Chip label="3 files" />
  <Chip small label="12 rules" />
</Example>

<Example title="Technical values" note="IDs, paths and versions are mono with tabular figures">
  <Chip mono label="sha256:9f86d081" />
  <Chip mono label="refs/heads/main" />
  <Chip mono small label="v1.24.0" />
</Example>

<Example
  title="Chosen colors"
  note="The ink is dark or light for 4.5:1, and a mid tone like the red is nudged until one ink reads"
>
  {#each github as [label, color] (label)}
    <Chip {label} {color} />
  {/each}
</Example>

<Example
  title="Pale and dark"
  note="The edge is the fill pulled toward the ink, so a white chip still shows on a white card"
>
  {#each extremes as [label, color] (label)}
    <Chip {label} {color} />
  {/each}
</Example>

<Example
  title="Unreadable color"
  note="Anything but hex digits draws the plain chip, so a stored value never writes a style"
>
  <Chip label="imported" color="var(--brand)" />
  <Chip label="empty" color="" />
</Example>

<Example
  title="Removable"
  note="Each remove control names its value, and focus moves to the next one after a removal"
>
  <div class="group" role="group" aria-label="Labels">
    {#each labels as label (label)}
      <Chip mono {label} onremove={() => (labels = labels.filter((other) => other !== label))} />
    {:else}
      <span class="empty">No labels</span>
    {/each}
  </div>
</Example>

<Example title="Long value" note="A long value wraps inside the chip rather than being cut">
  <div class="narrow">
    <Chip
      mono
      label="registry.example.com/platform/control-plane/kuma-cp:2.9.1-rc.3"
      onremove={() => {}}
    />
  </div>
  <div class="narrow">
    <Chip label="area: control plane, multizone, global and zone sync" color="c5def5" />
  </div>
</Example>

<style>
  .group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .group:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .empty {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }

  .narrow {
    display: flex;
    inline-size: min(100%, 16rem);
  }
</style>
