<script module lang="ts">
  export const section = { title: 'Button', order: 10 };
</script>

<script lang="ts">
  import { Button, Icon } from '#lib';
  import Example from '../kit/Example.svelte';

  const tones = [
    'default',
    'signal',
    'ghost',
    'stop',
    'stop-quiet',
    'brand',
    'quiet',
    'decision'
  ] as const;
</script>

<Example title="Tones" note="A tone names the job a button does, and a view has one signal">
  {#each tones as tone (tone)}
    <Button {tone}>Save changes</Button>
  {/each}
</Example>

<Example title="Disabled" note="Every tone can be disabled, and a disabled action stays visible">
  {#each tones as tone (tone)}
    <Button {tone} disabled>Save changes</Button>
  {/each}
</Example>

<Example title="With an icon" note="The glyph starts where a word would start">
  <Button>
    {#snippet icon()}<Icon name="refresh" size="sm" />{/snippet}
    Refresh
  </Button>
  <Button tone="signal">
    {#snippet icon()}<Icon name="check" size="sm" />{/snippet}
    Approve
  </Button>
  <Button>
    Options
    {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
  </Button>
  <Button tone="add">
    {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
    Add a rule
  </Button>
</Example>

<Example title="Loading" note="A running action is disabled and announced as busy">
  <Button loading>Saving</Button>
  <Button tone="signal" loading>Publishing</Button>
</Example>

<Example title="As a link" note="A destination draws an anchor with the same paint">
  <Button href="#buttons">Read the guide</Button>
  <Button href="#buttons" tone="signal">Open the project</Button>
</Example>
