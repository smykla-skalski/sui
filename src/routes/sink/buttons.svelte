<script module lang="ts">
  export const section = {
    title: 'Button',
    lead: 'An action the reader takes, named by the result it gives. Its tone says what job it does, and a view has one signal.',
    components: ['Button']
  };
</script>

<script lang="ts">
  import { Button, Icon } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const tones = ['default', 'signal', 'ghost', 'stop', 'stop-quiet', 'decision', 'add'] as const;
  const states = ['Rest', 'Disabled', 'Loading'] as const;
</script>

<Example
  title="Tones & States"
  note="Every tone at rest, disabled and loading, and a view has one signal"
>
  <!-- One width for every state, so a state reads by its look and never by its width (L-43). -->
  <Variants
    rows={tones}
    columns={states}
    axis="tone"
    rowLabel={(tone) => `"${tone}"`}
    --sui-local-button-span="9rem"
  >
    {#snippet cell(tone, state)}
      {#if tone === 'add'}
        <Button {tone} disabled={state === 'Disabled'} loading={state === 'Loading'}>
          {#snippet icon()}<Icon name="plus" size="base" />{/snippet}
          {state === 'Loading' ? 'Adding a Rule' : 'Add a Rule'}
        </Button>
      {:else}
        <Button {tone} disabled={state === 'Disabled'} loading={state === 'Loading'}>
          {state === 'Loading' ? 'Saving' : 'Save Changes'}
        </Button>
      {/if}
    {/snippet}
  </Variants>
</Example>

<Example
  title="Icons"
  note="A leading glyph starts where a word would start, and a trailing one hints at what opens"
>
  <Specimen label="Leading icon" code="icon">
    <Button>
      {#snippet icon()}<Icon name="refresh" size="base" />{/snippet}
      Refresh
    </Button>
  </Specimen>
  <Specimen label="Trailing icon" code="trailing">
    <Button>
      Options
      {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
    </Button>
  </Specimen>
  <Specimen label="Optional addition" code={'tone="add"'}>
    <Button tone="add">
      {#snippet icon()}<Icon name="plus" size="base" />{/snippet}
      Add a Rule
    </Button>
  </Specimen>
</Example>

<Example
  title="Long Label"
  note="A long or translated label wraps inside its container, at most 20 rem wide, and every line keeps the one-line inset"
>
  <Specimen label="Wrapped label">
    <div class="narrow">
      <Button>Move Repositories to the New Organization</Button>
    </div>
  </Specimen>
  <Specimen label="Wrapped with an icon" code="icon">
    <div class="narrow">
      <Button>
        {#snippet icon()}<Icon name="repositories" size="base" />{/snippet}
        Move Repositories to the New Organization
      </Button>
    </div>
  </Specimen>
</Example>

<Example
  title="As a Link"
  note="A destination draws an anchor with the same paint, and a disabled one cannot be followed"
>
  <Specimen label="Link" code="href">
    <Button href="#buttons">Read the Guide</Button>
  </Specimen>
  <Specimen label="Signal link" code={'href tone="signal"'}>
    <Button href="#buttons" tone="signal">Open the Project</Button>
  </Specimen>
  <Specimen label="Disabled link" code="href disabled">
    <div class="locked">
      <Button href="#buttons" disabled aria-describedby="sink-button-billing-reason"
        >Open Billing</Button
      >
      <p id="sink-button-billing-reason" class="reason">Only an owner can see billing</p>
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    display: grid;
    inline-size: min(100%, 14rem);
  }

  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
