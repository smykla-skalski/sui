<script module lang="ts">
  export const section = { title: 'Search field', order: 23 };
</script>

<script lang="ts">
  import { SearchField } from '#lib';
  import Example from '../kit/Example.svelte';

  const repositories = ['kuma', 'kuma-gui', 'kuma-website', 'smyklot', 'sui', 'mesh-perf'];

  let query = $state('');
  let filled = $state('kuma');
  const matches = $derived(
    repositories.filter((name) => name.includes(filled.trim().toLowerCase()))
  );
</script>

<Example
  title="States"
  note="Empty, then filled with its clear button, and Escape clears the query before it closes anything"
  layout="stack"
>
  <div class="column">
    <SearchField label="Search the projects" placeholder="Search projects" bind:value={query} />
    <SearchField
      label="Filter the repositories"
      placeholder="Filter repositories"
      bind:value={filled}
    />
    <p class="result">{matches.length} of {repositories.length} repositories match</p>
  </div>
</Example>

<Example title="Taller tier" note="A surface opts into 40px and the clear button stays centred">
  <div class="column tall">
    <SearchField label="Search the people" placeholder="Search people" value="Bart" />
  </div>
</Example>

<Example
  title="Narrow width"
  note="The field fills the room it has, and a long query scrolls inside it"
  layout="stack"
>
  <div class="column narrow">
    <SearchField label="Search the audit log" value="registry.example.com/platform/control-plane" />
  </div>
</Example>

<style>
  .column {
    display: grid;
    gap: var(--sui-space-3);
    inline-size: min(100%, 24rem);
  }

  .tall {
    --sui-local-control-height: var(--sui-control-height);
  }

  .narrow {
    inline-size: min(100%, 12rem);
  }

  .result {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    font-variant-numeric: tabular-nums;
    margin: 0;
  }
</style>
