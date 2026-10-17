<script module lang="ts">
  export const section = {
    title: 'Search field',
    order: 23,
    lead: 'A search that narrows what is already on screen. A value picked from suggestions as the reader types is a Combobox.',
    components: ['SearchField']
  };
</script>

<script lang="ts">
  import { SearchField } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories = ['kuma', 'kuma-gui', 'kuma-website', 'smyklot', 'sui', 'mesh-perf'];

  let query = $state('');
  let people = $state('Grace');
  let filter = $state('kuma');
  const matches = $derived(
    repositories.filter((name) => name.includes(filter.trim().toLowerCase()))
  );
</script>

<Example
  title="States"
  note="Empty, then filled with its clear button, and Escape clears the query before it closes anything"
  layout="grid"
>
  <Specimen label="Empty" code="placeholder">
    <SearchField label="Search the projects" placeholder="Search projects" bind:value={query} />
  </Specimen>
  <Specimen label="Filled" code="bind:value">
    <SearchField label="Search the people" placeholder="Search people" bind:value={people} />
  </Specimen>
</Example>

<Example
  title="Tiers"
  note="34px by default and 44px on phones, and a surface may opt into 40px with the clear button centred"
  layout="grid"
>
  <Specimen label="Default" code="--sui-control-height-compact">
    <SearchField label="Search the teams" placeholder="Search teams" value="Platform" />
  </Specimen>
  <Specimen label="Tall" code="--sui-local-control-height">
    <div class="tall">
      <SearchField label="Search the members" placeholder="Search members" value="Bart" />
    </div>
  </Specimen>
</Example>

<Example
  title="In context"
  note="A line under the field says how many match, so the field never disables itself"
  layout="grid"
>
  <div class="filter">
    <SearchField
      label="Filter the repositories"
      placeholder="Filter repositories"
      bind:value={filter}
    />
    <p class="result">{matches.length} of {repositories.length} repositories match</p>
  </div>
</Example>

<Example
  title="Narrow width"
  note="The field fills the room it has, and a long query scrolls inside it"
  layout="stack"
>
  <Specimen label="Long query">
    <div class="narrow">
      <SearchField
        label="Search the audit log"
        value="registry.example.com/platform/control-plane"
      />
    </div>
  </Specimen>
</Example>

<style>
  .tall {
    --sui-local-control-height: var(--sui-control-height);
    display: grid;
  }

  .filter {
    display: grid;
    gap: var(--sui-space-3);
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
