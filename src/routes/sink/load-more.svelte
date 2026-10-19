<script module lang="ts">
  export const section = {
    title: 'Load more',
    order: 88,
    lead: 'The last row of a long list: how far the reader is, and the button that brings the next page. A data table pages by number instead.',
    components: ['LoadMore']
  };
</script>

<script lang="ts">
  import { LoadMore, ObjectList, ObjectRow, Section } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const EVENTS = [
    'Repository synced',
    'Rule added to main',
    'Member invited',
    'Token rotated',
    'Webhook delivered',
    'Branch protected',
    'Release published',
    'Rule removed from main',
    'Member promoted to owner',
    'Repository archived',
    'Token revoked',
    'Audit log exported'
  ];
  const PAGE = 4;

  let shown = $state(PAGE);
  let loading = $state(false);
  let problem = $state<string | null>(null);
  let failedOnce = false;

  /* The second page fails once, so the recovery shows before the list is whole. */
  function next() {
    loading = true;
    problem = null;
    setTimeout(() => {
      loading = false;
      if (shown === PAGE && !failedOnce) {
        failedOnce = true;
        problem = 'The next page could not be loaded';
        return;
      }
      shown = Math.min(shown + PAGE, EVENTS.length);
    }, 800);
  }
</script>

{#snippet events(id: string, count: number, busy = false)}
  <ObjectList {id} aria-labelledby="{id}-title" aria-busy={busy || undefined}>
    {#each EVENTS.slice(0, count) as event, index (event)}
      <ObjectRow href="#load-more">
        {#snippet main()}
          <span class="name">{event}</span>
          <span class="sum">Event {index + 1}</span>
        {/snippet}
      </ObjectRow>
    {/each}
  </ObjectList>
{/snippet}

<Example
  title="States"
  note="The count and the end note hold the start, the button holds the end, and a failure takes the count's place"
  layout="grid"
  ground="canvas"
>
  <Specimen label="More to load" code="more shown total">
    <Section title="Activity" level={4} id="load-more-ready-title">
      {@render events('load-more-ready', 2)}
      <LoadMore list="load-more-ready" more shown={2} total={12} onmore={() => {}} />
    </Section>
  </Specimen>
  <Specimen label="Loading" code="loading">
    <Section title="Activity" level={4} id="load-more-loading-title">
      {@render events('load-more-loading', 2, true)}
      <LoadMore list="load-more-loading" more shown={2} total={12} loading onmore={() => {}} />
    </Section>
  </Specimen>
  <Specimen label="Failed" code="problem">
    <Section title="Activity" level={4} id="load-more-failed-title">
      {@render events('load-more-failed', 2)}
      <LoadMore
        list="load-more-failed"
        more
        shown={2}
        total={12}
        problem="The next page could not be loaded"
        onmore={() => {}}
      />
    </Section>
  </Specimen>
  <Specimen label="Whole" code={'more={false}'}>
    <Section title="Activity" level={4} id="load-more-whole-title">
      {@render events('load-more-whole', 2)}
      <LoadMore list="load-more-whole" more={false} shown={2} onmore={() => {}} />
    </Section>
  </Specimen>
</Example>

<Example
  title="Content"
  note="Without a total the count says only how many rows show"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Total unknown" code="more shown">
    <Section title="Activity" level={4} id="load-more-open-title">
      {@render events('load-more-open', 2)}
      <LoadMore list="load-more-open" more shown={2} onmore={() => {}} />
    </Section>
  </Specimen>
</Example>

<Example
  title="On demand"
  note="A press brings the next page and moves focus to its first row, a failure waits for a retry, and a whole list says so"
  layout="stack"
  ground="canvas"
>
  <Section title="Activity" level={4} id="load-more-activity-title">
    <ObjectList
      id="load-more-activity"
      aria-labelledby="load-more-activity-title"
      aria-busy={loading}
    >
      {#each EVENTS.slice(0, shown) as event, index (event)}
        <ObjectRow href="#load-more">
          {#snippet main()}
            <span class="name">{event}</span>
            <span class="sum">Event {index + 1}</span>
          {/snippet}
        </ObjectRow>
      {/each}
    </ObjectList>
    <LoadMore
      list="load-more-activity"
      more={shown < EVENTS.length}
      {shown}
      total={EVENTS.length}
      {loading}
      {problem}
      onmore={next}
    />
  </Section>
</Example>

<style>
  .name,
  .sum {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .name {
    color: var(--sui-text-primary);
    font-weight: var(--sui-weight-semibold);
  }

  .sum {
    color: var(--sui-text-muted);
  }
</style>
