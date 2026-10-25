<script module lang="ts">
  export const section = {
    title: 'Chip',
    order: 81,
    lead: 'A value drawn as a mark, such as a label name, a pattern or a count. A state, a role or a standing is a Pill.',
    components: ['Chip']
  };
</script>

<script lang="ts">
  import { Chip } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const kinds = ['plain', 'mono', 'color'] as const;
  const sizes = ['Default', 'Small'] as const;
  const values = { plain: '3 files', mono: 'sha256:9f86d081', color: 'enhancement' };

  const github = [
    ['bug', 'd73a4a', 'Red'],
    ['documentation', '0075ca', 'Blue'],
    ['duplicate', 'cfd3d7', 'Light grey'],
    ['enhancement', 'a2eeef', 'Pale cyan'],
    ['good first issue', '7057ff', 'Violet'],
    ['help wanted', '008672', 'Teal'],
    ['invalid', 'e4e669', 'Yellow'],
    ['question', 'd876e3', 'Pink'],
    ['wontfix', 'ffffff', 'White']
  ] as const;

  const extremes = [
    ['release', '#ffffff', 'White'],
    ['triage', '#fef2c0', 'Cream'],
    ['stale', '#808080', 'Mid grey'],
    ['frontend', '#1d76db', 'Blue'],
    ['design', '#5319e7', 'Violet'],
    ['blocked', '#000000', 'Black']
  ] as const;

  let labels = $state(['topology/zone', 'team:platform', 'env=production', 'v2.9.1']);
  let unkeyed = $state(['first', 'second', 'third']);
</script>

<Example
  title="Kinds and sizes"
  note="Technical values are mono, a painted chip wears a chosen color, and a small one sits in a line of text"
>
  <Variants
    rows={kinds}
    columns={sizes}
    rowLabel={(kind) => (kind === 'color' ? 'color="1d76db"' : kind)}
  >
    {#snippet cell(kind, size)}
      <Chip
        label={values[kind]}
        mono={kind === 'mono'}
        color={kind === 'color' ? '1d76db' : undefined}
        small={size === 'Small'}
      />
    {/snippet}
  </Variants>
</Example>

<Example
  title="Label colors"
  note="The light theme shows the color with black or white ink, and the dark one a tint with ink in its hue"
>
  {#each github as [label, color, name] (label)}
    <Specimen label={name} code={`color="${color}"`}>
      <Chip {label} {color} />
    </Specimen>
  {/each}
</Example>

<Example
  title="Pale and dark"
  note="Only a near-white chip draws an edge, so it still shows on a white card"
>
  {#each extremes as [label, color, name] (label)}
    <Specimen label={name} code={`color="${color}"`}>
      <Chip {label} {color} />
    </Specimen>
  {/each}
</Example>

<Example
  title="Unreadable color"
  note="Anything but hex digits draws the plain chip, so a stored value never writes a style"
>
  <Specimen label="CSS variable" code={'color="var(--brand)"'}>
    <Chip label="imported" color="var(--brand)" />
  </Specimen>
  <Specimen label="Empty" code={'color=""'}>
    <Chip label="empty" color="" />
  </Specimen>
</Example>

<Example
  title="Removable"
  note="Each remove control names its value, a removal is announced, and focus moves to the next control"
>
  <Specimen label="Remove and refocus" code="onremove">
    <div class="group" role="group" aria-label="Labels">
      {#each labels as label (label)}
        <Chip mono {label} onremove={() => (labels = labels.filter((other) => other !== label))} />
      {:else}
        <span class="empty">No labels</span>
      {/each}
    </div>
  </Specimen>
  <Specimen label="Unkeyed remove and refocus" code="onremove">
    <div class="group" role="group" aria-label="Unkeyed labels">
      {#each unkeyed as label}
        <Chip
          mono
          {label}
          onremove={() => (unkeyed = unkeyed.filter((other) => other !== label))}
        />
      {/each}
    </div>
  </Specimen>
  <Specimen label="Disabled" code="onremove disabled">
    <div class="held">
      <div class="group" role="group" aria-label="Locked labels" aria-describedby="sink-chip-held">
        <Chip mono label="team:platform" onremove={() => {}} disabled />
        <Chip mono label="v2.9.1" onremove={() => {}} disabled />
      </div>
      <p id="sink-chip-held" class="empty">Labels are locked while the release runs</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Long value"
  note="A long value wraps inside the chip rather than being cut"
  layout="grid"
>
  <Specimen label="Mono, removable" code="mono onremove">
    <Chip
      mono
      label="registry.example.com/platform/control-plane/server:2.9.1-rc.3"
      onremove={() => {}}
    />
  </Specimen>
  <Specimen label="Painted" code={'color="c5def5"'}>
    <Chip
      label="area: control plane, multizone, global and zone sync, and the inspect API"
      color="c5def5"
    />
  </Specimen>
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

  .held {
    display: grid;
    gap: var(--sui-row-copy-gap);
    min-inline-size: 0;
  }

  .empty {
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
  }
</style>
