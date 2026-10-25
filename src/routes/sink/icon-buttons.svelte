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
  let softPresses = $state(0);
</script>

<Example
  title="Tiers and states"
  note="The 28px quiet tier and the 34px toolbar tier, at rest, busy with a spinner and disabled"
>
  <Variants
    rows={tiers}
    columns={states}
    rowLabel={(tier) => (tier === 'toolbar' ? 'toolbar' : 'toolbar={false}')}
  >
    {#snippet cell(tier, state)}
      <IconButton
        icon="trash"
        label="Remove the rule"
        toolbar={tier === 'toolbar'}
        busy={state === 'Busy'}
        disabled={state === 'Disabled'}
      />
    {/snippet}
  </Variants>
  <Specimen label="Soft disabled" code={'aria-disabled="true"'}>
    <IconButton
      icon="trash"
      label="Soft disabled action"
      aria-disabled="true"
      onclick={() => softPresses++}
    />
    <output id="sink-soft-presses">{softPresses}</output>
  </Specimen>
</Example>

<Example
  title="Glyphs"
  note="Only glyphs every reader reads the same way stand alone, and any other action is a Button with its word"
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
  <Specimen label="Search" code={'icon="search"'}>
    <IconButton icon="search" label="Search the list" />
  </Specimen>
</Example>
