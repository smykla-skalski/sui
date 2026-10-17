<script module lang="ts">
  export const section = { title: 'Plate', order: 62 };
</script>

<script lang="ts">
  import { Callout, Icon, Plate } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Head only"
  note="A subject with nothing to report yet still shows its name and its state"
  layout="stack"
>
  <Plate title="Nightly backup" level={4}>
    {#snippet status()}
      <span class="state"><Icon name="pending" size="sm" /><span>Not run yet</span></span>
    {/snippet}
  </Plate>
</Example>

<Example
  title="With a body"
  note="A body earns the title a size step and a rule under the head"
  layout="stack"
>
  <Plate title="Sync status" level={4}>
    {#snippet status()}
      <span class="state"><Icon name="success" size="sm" /><span>Up to date</span></span>
    {/snippet}
    <p class="copy">Every repository matches its template</p>
  </Plate>
  <Plate title="Configuration drift across repositories in the platform organisation" level={4}>
    {#snippet status()}
      <span class="state"><Icon name="warning" size="sm" /><span>2 repositories differ</span></span>
    {/snippet}
    <Callout tone="warning" title="Drift blocks the next sync">
      {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
      Resolve the two differences before the sync at 02:00
    </Callout>
  </Plate>
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
    text-box: trim-both cap alphabetic;
  }
</style>
