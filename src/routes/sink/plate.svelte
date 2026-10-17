<script module lang="ts">
  export const section = {
    title: 'Plate',
    order: 62,
    lead: 'A titled ground for one subject that says its state beside its name. A group with no state to say is a Card.',
    components: ['Plate']
  };
</script>

<script lang="ts">
  import { Callout, Icon, Plate } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Head and body"
  note="An empty plate still names its subject and state, and a body adds a title step and a rule"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Head only" code="status">
    <Plate title="Nightly backup" level={4}>
      {#snippet status()}
        <span class="state"><Icon name="pending" size="sm" /><span>Not run yet</span></span>
      {/snippet}
    </Plate>
  </Specimen>
  <Specimen label="With a body">
    <Plate title="Sync status" level={4}>
      {#snippet status()}
        <span class="state"><Icon name="success" size="sm" /><span>Up to date</span></span>
      {/snippet}
      <p class="copy">Every repository matches its template</p>
    </Plate>
  </Specimen>
</Example>

<Example
  title="Long title"
  note="A long title wraps, and the state moves under it when the line has no room"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Wrapping title">
    <Plate title="Configuration drift across repositories in the platform organisation" level={4}>
      {#snippet status()}
        <span class="state"
          ><Icon name="warning" size="sm" /><span>2 repositories differ</span></span
        >
      {/snippet}
      <p class="copy">The two repositories changed their branch rules by hand</p>
    </Plate>
  </Specimen>
</Example>

<Example
  title="In context"
  note="A callout about a plate stands beside it, never inside it, so surfaces do not nest"
  layout="stack"
  ground="canvas"
>
  <Plate title="Configuration drift" level={4}>
    {#snippet status()}
      <span class="state"><Icon name="warning" size="sm" /><span>2 repositories differ</span></span>
    {/snippet}
  </Plate>
  <Callout tone="warning" title="Drift blocks the next sync">
    {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
    Resolve the two differences before the sync at 02:00
  </Callout>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    margin: 0;
  }

  .state {
    align-items: center;
    color: var(--sui-text-secondary);
    display: inline-flex;
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    gap: var(--sui-space-2);
  }

  .state > span {
    block-size: var(--sui-block-snap);
    text-box: trim-both cap alphabetic;
  }
</style>
