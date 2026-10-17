<script module lang="ts">
  export const section = {
    title: 'Icon',
    order: 90,
    lead: 'A glyph from one closed set, hidden from assistive technology because the words beside it carry the meaning. An icon-only control is an IconButton.',
    components: ['Icon']
  };
</script>

<script lang="ts">
  import { Icon, iconNames } from '#lib';
  import Example from '../kit/Example.svelte';
  import Variants from '../kit/Variants.svelte';

  const glyphs = ['settings', 'refresh', 'check'] as const;
  const sizes = ['nano', 'micro', 'xs', 'sm', 'base', 'md'] as const;
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
  note="Six px tiers from 8 to 18px, because an icon does not grow with the text"
>
  <Variants rows={glyphs} columns={sizes} axis="name" rowLabel={(name) => `"${name}"`}>
    {#snippet cell(name, size)}
      <Icon {name} {size} />
    {/snippet}
  </Variants>
</Example>

<style>
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
    font: 400 var(--sui-font-size-micro) / var(--sui-leading-micro) var(--sui-mono);
    overflow-wrap: anywhere;
  }
</style>
