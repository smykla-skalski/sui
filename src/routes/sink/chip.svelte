<script module lang="ts">
  export const section = {
    title: 'Chip',
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

  let labels = $state(['topology/zone', 'team:platform', 'env=production']);
  let unkeyed = $state(['first', 'second', 'third']);
  let painted = $state([
    ['priority: high', 'd73a4a'],
    ['needs design', '5319e7']
  ]);
  let files = $state(true);
</script>

<Example
  title="Kinds & Sizes"
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
  title="In a Line"
  note="A small chip keeps to the line of text it stands in, its foot on the words’ foot, so the line keeps its height"
>
  <Specimen label="In a sentence">
    <p class="line">The last push changed <Chip small label="3 files" /> in the kit</p>
  </Specimen>
</Example>

<Example
  title="Label Colors"
  note="The light theme shows the color with black or white ink, and the dark one a tint with ink in its hue"
>
  {#each github as [label, color, name] (label)}
    <Specimen label={name}>
      <Chip {label} {color} />
    </Specimen>
  {/each}
</Example>

<Example
  title="Pale & Dark"
  note="Only a near-white chip draws an edge, so it still shows on a white card"
>
  {#each extremes as [label, color, name] (label)}
    <Specimen label={name}>
      <Chip {label} {color} />
    </Specimen>
  {/each}
</Example>

<Example
  title="Unreadable Color"
  note="Anything but hex digits draws the plain chip, so a stored value never writes a style"
>
  <Specimen label="CSS variable">
    <Chip label="imported" color="var(--brand)" />
  </Specimen>
  <Specimen label="Empty">
    <Chip label="empty" color="" />
  </Specimen>
</Example>

<Example
  title="Removable"
  note="Each remove control names its value, a removal is announced, and focus moves to the next control"
  layout="grid"
  --specimen-min="24rem"
>
  <Specimen label="Remove & refocus">
    <div class="group" role="group" aria-label="Labels">
      {#each labels as label (label)}
        <Chip mono {label} onremove={() => (labels = labels.filter((other) => other !== label))} />
      {:else}
        <span class="empty">No labels</span>
      {/each}
    </div>
  </Specimen>
  <Specimen label="Unkeyed remove & refocus">
    <div class="group" role="group" aria-label="Unkeyed labels">
      <!-- Unkeyed on purpose: a browser test proves a chip hands focus on when a caller forgets the key. -->
      {#each unkeyed as label}
        <Chip
          mono
          {label}
          onremove={() => (unkeyed = unkeyed.filter((other) => other !== label))}
        />
      {/each}
    </div>
  </Specimen>
  <Specimen label="Painted & small">
    <div class="group" role="group" aria-label="Painted labels">
      {#each painted as [label, color] (label)}
        <Chip
          {label}
          {color}
          onremove={() => (painted = painted.filter(([other]) => other !== label))}
        />
      {/each}
      {#if files}<Chip small label="3 files" onremove={() => (files = false)} />{/if}
      {#if painted.length === 0 && !files}<span class="empty">No labels</span>{/if}
    </div>
  </Specimen>
  <Specimen label="Disabled">
    <div class="held">
      <div class="group" role="group" aria-label="Locked labels" aria-describedby="sink-chip-held">
        <Chip mono label="team:platform" onremove={() => {}} disabled />
        <Chip mono label="v2.9.1" onremove={() => {}} disabled />
        <Chip label="frozen" color="cfd3d7" onremove={() => {}} disabled />
      </div>
      <p id="sink-chip-held" class="empty">Labels are locked while the release runs</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Long Value"
  note="A long value wraps inside the chip rather than being cut"
  layout="grid"
>
  <Specimen label="Mono, removable">
    <Chip
      mono
      label="registry.example.com/platform/control-plane/server:2.9.1-rc.3"
      onremove={() => {}}
    />
  </Specimen>
  <Specimen label="Painted">
    <Chip
      label="area: control plane, multizone, global and zone sync, and the inspect API"
      color="c5def5"
    />
  </Specimen>
</Example>

<style>
  /* Centred, so a small chip beside default ones keeps its own height rather than stretching. */
  .group {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .group:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .line {
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
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
