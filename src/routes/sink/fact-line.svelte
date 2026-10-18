<script module lang="ts">
  export const section = {
    title: 'Fact line',
    order: 114,
    lead: 'Facts on one line parted by a drawn middle dot. Facts that each need a label are a FactList.',
    components: ['FactLine']
  };
</script>

<script lang="ts">
  import { FactLine, RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const synced = new Date(Date.now() - 42 * 60_000).toISOString();
</script>

<Example title="Facts" note="The dot stands 9px from each fact and is read as a comma">
  <Specimen label="Words" code="children">
    <FactLine><span>Default branch main</span><span>84 files in step</span></FactLine>
  </Specimen>
  <Specimen label="With a time" code="children">
    <FactLine
      ><span>Synced <RelativeTime value={synced} /></span><span>3 rules would change</span
      ></FactLine
    >
  </Specimen>
</Example>

<Example title="Narrow width" note="A long line wraps after a dot, never before one" layout="stack">
  <Specimen label="Wrapping" code="children">
    <div class="narrow">
      <FactLine
        ><span>Default branch release/2026-10</span><span>1,284 files in step</span><span
          >archived last year</span
        ></FactLine
      >
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    max-inline-size: 16rem;
  }
</style>
