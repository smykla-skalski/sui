<script module lang="ts">
  export const section = {
    title: 'Fact Line',
    lead: 'Facts on one line parted by a drawn middle dot. Facts that each need a label are a FactList.',
    components: ['FactLine']
  };
</script>

<script lang="ts">
  import { FactLine, RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const synced = new Date(Date.now() - 42.5 * 60_000).toISOString();
</script>

<Example
  title="Facts"
  note="The dot stands 9 px from each fact and is read as a comma"
  --specimen-column-gap="calc(2 * var(--sui-space-6))"
>
  <Specimen label="Words">
    <FactLine><span>Default branch main</span><span>84 files up to date</span></FactLine>
  </Specimen>
  <Specimen label="With a time">
    <FactLine
      ><span>Synced <RelativeTime value={synced} /></span><span>3 rules would change</span
      ></FactLine
    >
  </Specimen>
</Example>

<Example title="Narrow Width" note="A long line wraps after a dot, never before one" layout="stack">
  <Specimen label="Wrapping">
    <div class="narrow">
      <FactLine
        ><span>Default branch release/2026-10</span><span>1,284 files up to date</span><span
          >archived last year</span
        ></FactLine
      >
    </div>
  </Specimen>
</Example>

<style>
  /* The bound the facts wrap in, drawn as the avatar page draws its own: a dashed line at the
     end of the measure, so the wrap reads as the point of the example and the words start
     under the specimen's name at every width. Its words keep the 18rem measure. */
  .narrow {
    border-inline-end: var(--sui-stroke) dashed var(--sui-border-subtle);
    box-sizing: border-box;
    inline-size: min(100%, calc(18rem + var(--sui-space-2) + var(--sui-stroke)));
    padding-inline-end: var(--sui-space-2);
  }
</style>
