<script module lang="ts">
  export const section = {
    title: 'Button',
    order: 10,
    lead: 'An action the reader takes, named by the result it gives. Its tone says what job it does, and a view has one signal.',
    components: ['Button']
  };
</script>

<script lang="ts">
  import { Button, Icon } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const tones = ['default', 'signal', 'ghost', 'stop', 'stop-quiet', 'decision'] as const;
  const states = ['Rest', 'Disabled', 'Loading'] as const;
</script>

<Example
  title="Tones and states"
  note="Every tone at rest, disabled and loading, and a view has one signal"
>
  <Variants rows={tones} columns={states} axis="tone" rowLabel={(tone) => `"${tone}"`}>
    {#snippet cell(tone, state)}
      <Button {tone} disabled={state === 'Disabled'} loading={state === 'Loading'}>
        {state === 'Loading' ? 'Saving' : 'Save changes'}
      </Button>
    {/snippet}
  </Variants>
</Example>

<Example
  title="Icons"
  note="A leading glyph starts where a word would start, and a trailing one hints at what opens"
>
  <Specimen label="Leading icon" code="icon">
    <Button>
      {#snippet icon()}<Icon name="refresh" size="sm" />{/snippet}
      Refresh
    </Button>
  </Specimen>
  <Specimen label="Trailing icon" code="trailing">
    <Button>
      Options
      {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
    </Button>
  </Specimen>
  <Specimen label="Optional addition" code={'tone="add"'}>
    <Button tone="add">
      {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
      Add a rule
    </Button>
  </Specimen>
</Example>

<Example title="As a link" note="A destination draws an anchor with the same paint">
  <Specimen label="Link" code="href">
    <Button href="#buttons">Read the guide</Button>
  </Specimen>
  <Specimen label="Signal link" code={'href tone="signal"'}>
    <Button href="#buttons" tone="signal">Open the project</Button>
  </Specimen>
</Example>
