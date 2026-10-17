<script module lang="ts">
  export const section = { title: 'Load more', order: 88 };
</script>

<script lang="ts">
  import { LoadMore, ObjectList, ObjectRow } from '#lib';
  import Example from '../kit/Example.svelte';

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
  title="On demand"
  note="The next page loads as the end comes near, and a failure waits for a press"
  layout="stack"
>
  <div class="card">
    <ObjectList>
      {#each items as item (item)}
        <ObjectRow>
          {#snippet main()}
            <span class="name">Event {item}</span>
          {/snippet}
        </ObjectRow>
      {/each}
    </ObjectList>
    <LoadMore more={items.length < PAGE * PAGES} {loading} {problem} onmore={next} />
  </div>
</Example>

<Example title="After a failure" note="The retry stands at the list boundary until it is pressed">
  <LoadMore more problem="The next page could not be loaded" onmore={() => {}} />
</Example>

<style>
  .card {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
  }

  @media (max-width: 36rem) {
    .card {
      padding: var(--sui-rhythm-surface-pad-compact);
    }
  }

  .name {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }
</style>
