<script module lang="ts">
  export const section = {
    title: 'Skeleton',
    order: 87,
    lead: 'The rows a list draws while it waits for its first answer. A refresh keeps the loaded rows and reports itself in place instead.',
    components: ['Skeleton']
  };
</script>

<script lang="ts">
  import { Button, Card, ObjectList, ObjectRow, Skeleton } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const names = ['smykla-skalski/sui', 'smykla-skalski/smyklot', 'smykla-skalski/ledger'];

  let loading = $state(true);

  function reload() {
    loading = true;
    setTimeout(() => (loading = false), 1500);
  }
</script>

<Example
  title="Rows"
  note="Two bars hint at a row's main content and side, and plain rows suit a list of one-line rows"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Two-line rows">
    <Card>
      <Skeleton rows={2} label="Loading repositories…" />
    </Card>
  </Specimen>
  <Specimen label="Plain rows" code={'bars={false} rowHeight="2.75rem"'}>
    <Card>
      <Skeleton rows={2} rowHeight="2.75rem" bars={false} label="Loading members…" />
    </Card>
  </Specimen>
</Example>

<Example
  title="Slow"
  note="A wait that outlasts its patience stops pulsing and says so in words, here from the start"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Past its patience" code={'patience={0}'}>
    <Card>
      <Skeleton rows={2} patience={0} label="Loading repositories…" />
    </Card>
  </Specimen>
</Example>

<Example
  title="First load"
  note="The region is busy while placeholder rows reserve the loaded height, and the rows take their place"
  layout="stack"
  ground="canvas"
>
  <Button onclick={() => (loading ? (loading = false) : reload())}>
    {loading ? 'Show the rows' : 'Load again'}
  </Button>
  <Specimen label={loading ? 'Loading' : 'Loaded'} code="loading">
    <Card>
      <Skeleton {loading} rows={3} label="Loading repositories…">
        <ObjectList>
          {#each names as name (name)}
            <ObjectRow>
              {#snippet main()}
                <span class="name">{name}</span>
                <span class="sum">Default branch main · in step</span>
              {/snippet}
            </ObjectRow>
          {/each}
        </ObjectList>
      </Skeleton>
    </Card>
  </Specimen>
</Example>

<style>
  .name {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sum {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
