<script module lang="ts">
  export const section = {
    title: 'Icon button',
    order: 11,
    lead: 'A button whose glyph is the whole of it, such as close, more, delete or settings. An action that no glyph names is a Button with its word.',
    components: ['IconButton']
  };
</script>

<script lang="ts">
  import { IconButton } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const tiers = ['quiet', 'toolbar'] as const;
  const states = ['Rest', 'Busy', 'Disabled'] as const;
</script>

<Example
  title="Tiers and states"
  note="The 28px quiet tier and the 34px toolbar tier, at rest, busy and disabled"
>
  <Variants
    rows={tiers}
    columns={states}
    rowLabel={(tier) => (tier === 'toolbar' ? 'toolbar' : 'toolbar={false}')}
  >
    {#snippet cell(tier, state)}
      <IconButton
        icon="refresh"
        label="Refresh the list"
        toolbar={tier === 'toolbar'}
        busy={state === 'Busy'}
        disabled={state === 'Disabled'}
      />
    {/snippet}
  </Variants>
</Example>

<Example
  title="Glyphs"
  note="Each glyph reads the same to every reader, and its label is the tooltip"
>
  <Specimen label="Settings" code={'icon="settings"'}>
    <IconButton icon="settings" label="Open settings" />
  </Specimen>
  <Specimen label="Delete" code={'icon="trash"'}>
    <IconButton icon="trash" label="Remove the rule" />
  </Specimen>
  <Specimen label="More" code={'icon="more"'}>
    <IconButton icon="more" label="More actions" />
  </Specimen>
  <Specimen label="Close" code={'icon="close"'}>
    <IconButton icon="close" label="Close the panel" />
  </Specimen>
  <Specimen label="Filter" code={'icon="filter"'}>
    <IconButton icon="filter" label="Filter the list" />
  </Specimen>
  <Specimen label="Sort" code={'icon="sort"'}>
    <IconButton icon="sort" label="Sort the list" />
  </Specimen>
</Example>
