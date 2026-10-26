<script module lang="ts">
  export const section = {
    title: 'Skeleton',
    lead: 'The rows a list draws while it waits for its first answer. A refresh keeps the loaded rows and reports itself in place instead.',
    components: ['Skeleton']
  };
</script>

<script lang="ts">
  import { Button, FactLine, ObjectList, ObjectRow, Section, Skeleton } from '#lib';
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
  note="Bars stand where a row's name, its line under it and its side will be, plain rows draw one line, and one light crosses them"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Two-line rows">
    <Section title="Repositories" level={4}>
      <Skeleton rows={2} patience={Infinity} label="Loading repositories…" />
    </Section>
  </Specimen>
  <Specimen label="Plain rows" code={'bars={false} rowHeight="2.75rem"'}>
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
  note="A wait that outlasts its patience stops its light and says so in the first row's shape, here from the start"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Two-line rows" code={'patience={0}'}>
    <Section title="Repositories" level={4}>
      <Skeleton rows={2} patience={0} label="Loading repositories…" />
    </Section>
  </Specimen>
  <Specimen label="Plain rows" code={'bars={false} rowHeight="2.75rem" patience={0}'}>
    <Section title="Members" level={4}>
      <Skeleton rows={2} rowHeight="2.75rem" bars={false} patience={0} label="Loading members…" />
    </Section>
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
    <Section title="Repositories" level={4}>
      <Skeleton {loading} rows={3} label="Loading repositories…">
        <ObjectList>
          {#each names as name (name)}
            <ObjectRow>
              {#snippet main()}
                <span class="name">{name}</span>
                <span class="sum"
                  ><FactLine><span>Default branch main</span><span>up to date</span></FactLine
                  ></span
                >
              {/snippet}
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sum {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
