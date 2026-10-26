<script module lang="ts">
  export const section = {
    title: 'Icon',
    lead: 'A glyph from one closed set, hidden from assistive technology because the words beside it carry the meaning. An icon-only control is an IconButton.',
    components: ['Icon']
  };
</script>

<script lang="ts">
  import { Icon, iconNames } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const directional = [
    'chevron-left',
    'chevron-right',
    'arrow-up-right',
    'undo',
    'settings'
  ] as const;

  const glyphs = ['settings', 'refresh', 'check'] as const;
  const sizes = ['micro', 'xs', 'sm', 'base', 'md'] as const;
</script>

<Example
  title="Set"
  note="One outline family on a 24-unit grid with a 1.75 stroke, each glyph by its name"
>
  <ul class="grid" role="list">
    {#each iconNames as name (name)}
      <li>
        <Icon {name} size="md" />
        <span class="name">{name}</span>
      </li>
    {/each}
  </ul>
</Example>

<Example
  title="Sizes"
  note="Five tiers from 10 to 18px at the default text size, growing with the reader's own text size"
>
  <Variants rows={glyphs} columns={sizes} axis="name" rowLabel={(name) => `"${name}"`}>
    {#snippet cell(name, size)}
      <Icon {name} {size} />
    {/snippet}
  </Variants>
</Example>

<Example
  title="Direction"
  note="Directional glyphs face the reading direction, so a right-to-left page mirrors them and keeps the rest"
>
  <Specimen label="Left to right">
    <span class="row">
      {#each directional as name (name)}<Icon {name} size="md" />{/each}
    </span>
  </Specimen>
  <Specimen label="Right to left" code={'dir="rtl"'}>
    <span class="row" dir="rtl">
      {#each directional as name (name)}<Icon {name} size="md" />{/each}
    </span>
  </Specimen>
</Example>

<style>
  .row {
    color: var(--sui-text-primary);
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
  }

  .grid {
    display: grid;
    gap: var(--sui-space-2);
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    inline-size: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    align-items: center;
    color: var(--sui-text-primary);
    display: flex;
    gap: var(--sui-space-2);
    min-block-size: var(--sui-control-height-chip);
    min-inline-size: 0;
  }

  .name {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-micro) / var(--sui-leading-micro)
      var(--sui-mono);
    overflow-wrap: anywhere;
  }
</style>
