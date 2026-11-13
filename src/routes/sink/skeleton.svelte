<script module lang="ts">
  export const section = {
    title: 'Skeleton',
    lead: 'The rows a list draws while it waits for its first answer. A refresh keeps the loaded rows and reports itself in place instead.',
    components: ['Skeleton']
  };
</script>

<script lang="ts">
  import { Button, FactLine, ObjectList, ObjectRow, Pill, Section, Skeleton } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  // Each row has a side, as the placeholders promise, so the loaded rows take their shape.
  const repositories = [
    { name: 'smykla-skalski/sui', visibility: 'Public' },
    { name: 'smykla-skalski/smyklot', visibility: 'Public' },
    { name: 'smykla-skalski/ledger', visibility: 'Private' }
  ];

  let loading = $state(true);

  function reload() {
    loading = true;
    setTimeout(() => (loading = false), 1500);
  }
</script>

<Example
  title="Rows"
  note="Bars stand where a row’s name, its line under it and its side will be, plain rows draw one line, and one light crosses them"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Two-line rows">
    <Section title="Repositories" level={4}>
      <Skeleton rows={2} patience={Infinity} label="Loading repositories…" />
    </Section>
  </Specimen>
  <Specimen label="Plain rows">
    <Section title="Members" level={4}>
      <Skeleton
        rows={2}
        rowHeight="2.75rem"
        bars={false}
        patience={Infinity}
        label="Loading members…"
      />
    </Section>
  </Specimen>
</Example>

<Example
  title="Slow"
  note="A wait that outlasts its patience stops its light and says so in the first row’s shape, here from the start"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Two-line rows">
    <Section title="Repositories" level={4}>
      <Skeleton rows={2} patience={0} label="Loading repositories…" />
    </Section>
  </Specimen>
  <Specimen label="Plain rows">
    <Section title="Members" level={4}>
      <Skeleton rows={2} rowHeight="2.75rem" bars={false} patience={0} label="Loading members…" />
    </Section>
  </Specimen>
</Example>

<Example
  title="First Load"
  note="The region is busy while placeholder rows reserve the loaded height, and the rows take their place"
  layout="stack"
  ground="canvas"
>
  <Button onclick={() => (loading ? (loading = false) : reload())}>
    {loading ? 'Show the Rows' : 'Load Again'}
  </Button>
  <Specimen label={loading ? 'Loading' : 'Loaded'}>
    <Section title="Repositories" level={4}>
      <Skeleton {loading} rows={3} label="Loading repositories…">
        <ObjectList>
          {#each repositories as { name, visibility } (name)}
            <ObjectRow>
              {#snippet main()}
                <span class="name">{name}</span>
                <span class="sum"
                  ><FactLine><span>Default branch main</span><span>up to date</span></FactLine
                  ></span
                >
              {/snippet}
              {#snippet side()}<Pill>{visibility}</Pill>{/snippet}
            </ObjectRow>
          {/each}
        </ObjectList>
      </Skeleton>
    </Section>
  </Specimen>
</Example>

<style>
  .name {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .sum {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }
</style>
