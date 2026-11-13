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
  import Variants from '../kit/Variants.svelte';

  const directional = [
    'chevron-left',
    'chevron-right',
    'arrow-up-right',
    'undo',
    'settings'
  ] as const;

  const directions = ['ltr', 'rtl'] as const;

  const glyphs = ['settings', 'refresh', 'check'] as const;
  const sizes = ['micro', 'xs', 'sm', 'base', 'md'] as const;

  /* Each tier beside the words it stands with in the kit: a link's arrow, a pill's or chip's
     glyph, a plate's, a control's and a dialog title's. */
  const beside = {
    micro: 'micro',
    xs: 'compact',
    sm: 'caption',
    base: 'control',
    md: 'title'
  } as const;
  const words = { settings: 'Settings', refresh: 'Refresh', check: 'Check' } as const;
</script>

<Example
  title="Set"
  note="One outline family on a 24-unit grid with a 2 stroke, each glyph by its name"
>
  <ul class="grid" role="list">
    {#each iconNames as name (name)}
      <li>
        <Icon {name} size="md" />
        <span class="name" translate="no">{name}</span>
      </li>
    {/each}
  </ul>
</Example>

<Example
  title="Sizes"
  note="5 tiers from 10 to 18 px at the default text size, each beside the words it stands with, growing with the reader’s own text size"
>
  <Variants rows={glyphs} columns={sizes} axis="name" rowLabel={(name) => `"${name}"`}>
    {#snippet cell(name, size)}
      <span class="pair" style:font-size="var(--sui-font-size-{beside[size]})"
        ><Icon {name} {size} /><span>{words[name]}</span></span
      >
    {/snippet}
  </Variants>
</Example>

<Example
  title="Direction"
  note="Directional glyphs face the reading direction, so a right-to-left page mirrors them and keeps the rest"
>
  <Variants
    rows={directional}
    columns={directions}
    axis="name"
    rowLabel={(name) => `"${name}"`}
    columnLabel={(direction) => (direction === 'ltr' ? 'Left to right' : 'Right to left')}
  >
    {#snippet cell(name, direction)}
      <span class="facing" dir={direction}><Icon {name} size="md" /></span>
    {/snippet}
  </Variants>
</Example>

<style>
  .facing {
    color: var(--sui-text-primary);
    display: inline-flex;
  }

  .pair {
    align-items: center;
    color: var(--sui-text-primary);
    display: inline-flex;
    font-weight: var(--sui-weight-medium);
    gap: var(--sui-space-2);
    line-height: var(--sui-leading-compact);
    white-space: nowrap;
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
    font: var(--sui-weight-regular) var(--sui-font-size-caption) / var(--sui-leading-note)
      var(--sui-mono);
    overflow-wrap: anywhere;
  }
</style>
