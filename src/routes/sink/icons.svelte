<script module lang="ts">
  export const section = { title: 'Icon', order: 90 };
</script>

<script lang="ts">
  import { Icon, iconNames } from '#lib';
  import Example from '../kit/Example.svelte';

  const sizes = ['nano', 'micro', 'xs', 'sm', 'base', 'md'] as const;
</script>

<Example title="Set" note="One outline family on a 24-unit grid with a 1.75 stroke">
  <ul class="grid">
    {#each iconNames as name (name)}
      <li>
        <Icon {name} size="md" />
        <span class="name">{name}</span>
      </li>
    {/each}
  </ul>
</Example>

<Example title="Size tiers" note="Six px tiers, because an icon does not grow with the text">
  {#each sizes as size (size)}
    <span class="tier"><Icon name="settings" {size} /><span class="name">{size}</span></span>
  {/each}
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

  li,
  .tier {
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
