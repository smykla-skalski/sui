<script module lang="ts">
  export const section = {
    title: 'Load more',
    order: 88,
    lead: 'The button after the last row of a long list, so the reader decides when the next page comes. A data table pages by number instead.',
    components: ['LoadMore']
  };
</script>

<script lang="ts">
  import { Card, LoadMore, ObjectList, ObjectRow } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const PAGE = 4;
  const PAGES = 3;

  let items = $state(Array.from({ length: PAGE }, (_, index) => index + 1));
  let loading = $state(false);
  let problem = $state<string | null>(null);
  let failedOnce = false;

  /* The second page fails once, so the recovery shows before the list completes. */
  function next() {
    loading = true;
    problem = null;
    setTimeout(() => {
      loading = false;
      if (items.length === PAGE && !failedOnce) {
        failedOnce = true;
        problem = 'The next page could not be loaded';
        return;
      }
      const start = items.length;
      items = [...items, ...Array.from({ length: PAGE }, (_, index) => start + index + 1)];
    }, 800);
  }
</script>

<Example
  title="States"
  note="The button reads what a press does, and a failure keeps its reason beside the retry"
  layout="grid"
>
  <Specimen label="More to load" code="more shown total">
    <LoadMore more shown={4} total={12} onmore={() => {}} />
  </Specimen>
  <Specimen label="Loading" code="loading">
    <LoadMore more shown={4} total={12} loading onmore={() => {}} />
  </Specimen>
  <Specimen label="Failed" code="problem">
    <LoadMore more shown={8} problem="The next page could not be loaded" onmore={() => {}} />
  </Specimen>
</Example>

<Example
  title="On demand"
  note="The next page loads on a press, a failure waits for a retry, and the last page ends in a note"
  layout="stack"
  ground="canvas"
>
  <Card>
    <ObjectList>
      {#each items as item (item)}
        <ObjectRow>
          {#snippet main()}
            <span class="name">Event {item}</span>
          {/snippet}
        </ObjectRow>
      {/each}
    </ObjectList>
    <LoadMore
      more={items.length < PAGE * PAGES}
      shown={items.length}
      total={PAGE * PAGES}
      {loading}
      {problem}
      onmore={next}
    />
  </Card>
</Example>

<style>
  .name {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }
</style>
