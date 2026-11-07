<script module lang="ts">
  export const section = {
    title: 'Plate',
    lead: 'A titled ground for one subject that says its state beside its name. A group with no state to say is a Card.',
    components: ['Plate']
  };
</script>

<script lang="ts">
  import { clock } from '../kit/format.js';
  import { Button, Callout, Icon, Plate } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let synced = $state(false);
</script>

<Example
  title="Head & Body"
  note="An empty plate still names its subject and state, and a body adds a title step and a rule"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Head only" code="status">
    <Plate title="Nightly Backup" level={4}>
      {#snippet status()}
        <span class="state"><Icon name="pending" size="sm" /><span>Not run yet</span></span>
      {/snippet}
    </Plate>
  </Specimen>
  <Specimen label="With a body">
    <Plate title="Sync Status" level={4}>
      {#snippet status()}
        <span class="state"><Icon name="success" size="sm" /><span>Up to date</span></span>
      {/snippet}
      <p class="copy">Every repository matches its template</p>
    </Plate>
  </Specimen>
</Example>

<Example
  title="Long Title"
  note="A long title wraps beside the state, which stays on its first line and never moves the title"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Wrapping title">
    <Plate title="Configuration Drift across Repositories in the Platform Organisation" level={4}>
      {#snippet status()}
        <span class="state"
          ><Icon name="warning" size="sm" /><span>2 repositories differ</span></span
        >
      {/snippet}
      <p class="copy">The 2 repositories changed their branch rules by hand</p>
    </Plate>
  </Specimen>
</Example>

<Example
  title="Changing State"
  note="The state sits in a polite status region, so a screen reader hears it change while focus stays on the button"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Announced" code="status">
    <div class="change">
      <Plate title="Template Sync" level={4}>
        {#snippet status()}
          {#if synced}
            <span class="state"><Icon name="success" size="sm" /><span>Up to date</span></span>
          {:else}
            <span class="state"
              ><Icon name="pending" size="sm" /><span>3 repositories behind</span></span
            >
          {/if}
        {/snippet}
      </Plate>
      <Button onclick={() => (synced = !synced)}>{synced ? 'Undo the Sync' : 'Sync Now'}</Button>
    </div>
  </Specimen>
</Example>

<Example
  title="In Context"
  note="A callout about a plate stands beside it, never inside it, so surfaces do not nest"
  layout="stack"
  ground="canvas"
>
  <Plate title="Configuration Drift" level={4}>
    {#snippet status()}
      <span class="state"><Icon name="warning" size="sm" /><span>2 differ</span></span>
    {/snippet}
  </Plate>
  <Callout tone="warning" title="Drift blocks the next sync">
    {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
    Resolve the 2 differences before the sync at {clock(2)}
  </Callout>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  .change {
    display: grid;
    gap: var(--sui-space-4);
  }

  /* The glyph centres on the words' first line, however many lines they wrap to (L-94), and
     the words' box rounds up to the pixel, so a state that ends the plate keeps the inset to
     its baseline. */
  .state {
    align-items: start;
    color: var(--sui-text-secondary);
    display: inline-flex;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    gap: var(--sui-space-2);
    min-inline-size: 0;
  }

  .state > :global(svg) {
    margin-block: calc((round(up, 1cap, 1px) - var(--sui-icon-sm)) / 2);
  }

  .state > span {
    align-content: center;
    block-size: var(--sui-block-snap);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
