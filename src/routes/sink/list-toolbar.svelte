<script module lang="ts">
  export const section = {
    title: 'List Toolbar',
    lead: 'The bar over a list, with a search, an optional filter and tools, and one action. A search outside a list is a SearchField.',
    components: ['ListToolbar']
  };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import {
    Button,
    EmptyState,
    ListToolbar,
    ObjectList,
    ObjectRow,
    Pill,
    type ListToolGroup
  } from '#lib';
  import { addressed } from '../kit/address.svelte.js';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories = [
    { name: 'smykla-skalski/sui', state: 'active', updated: 3 },
    { name: 'smykla-skalski/smyklot', state: 'active', updated: 2 },
    { name: 'smykla-skalski/dotfiles', state: 'archived', updated: 40 },
    { name: 'smykla-skalski/demo-app', state: 'active', updated: 12 }
  ];

  const states = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' }
  ];

  const orders = [
    { value: 'updated', label: 'Updated' },
    { value: 'name', label: 'Name' }
  ];

  /* Each bar keeps its own choices, so one example never changes another, and All counts
     what the bar's search leaves. */
  function choices(shown: string, order: string, all = () => repositories.length) {
    const picked = $state({ shown, order });
    return {
      picked,
      get filter(): ListToolGroup {
        return {
          label: 'State',
          options: states.map((state) =>
            state.value === 'all' ? { ...state, count: all() } : state
          ),
          value: picked.shown,
          onchange: (value) => (picked.shown = value)
        };
      },
      get tools(): ListToolGroup[] {
        return [
          {
            label: 'Sort by',
            options: orders,
            value: picked.order,
            onchange: (value) => (picked.order = value)
          }
        ];
      }
    };
  }

  const parts = choices('all', 'updated');
  const narrow = choices('active', 'name');
  const list = choices('all', 'updated', () => found.length);

  // The search is kept in the address, so a shared link opens the list as filtered.
  const search = addressed('q', '');

  let context = $state<HTMLElement>();

  // The button leaves with the empty state, so focus goes back to the search it cleared.
  async function clear() {
    search.value = '';
    list.picked.shown = 'all';
    await tick();
    context?.querySelector<HTMLInputElement>('[role="searchbox"]')?.focus();
  }

  const found = $derived(
    repositories.filter((repository) => repository.name.includes(search.value.trim().toLowerCase()))
  );

  const rows = $derived(
    found
      .filter((repository) => list.picked.shown === 'all' || repository.state === list.picked.shown)
      .sort((a, b) =>
        list.picked.order === 'name' ? a.name.localeCompare(b.name) : a.updated - b.updated
      )
  );
</script>

<Example
  title="Parts"
  note="The search leads, a filter stands beside its heading with its tools button and their choices, and one action may end the bar"
  layout="stack"
>
  <Specimen label="Search & action">
    <ListToolbar searchLabel="Search repositories" placeholder="sui…">
      {#snippet action()}<Button tone="signal">Add Repository</Button>{/snippet}
    </ListToolbar>
  </Specimen>
  <Specimen label="Filter & tools">
    <ListToolbar
      searchLabel="Search repositories"
      placeholder="sui…"
      filter={parts.filter}
      tools={parts.tools}
    />
  </Specimen>
  <Specimen label="Searching">
    <ListToolbar searchLabel="Search repositories" placeholder="sui…" query="sm" pending />
  </Specimen>
</Example>

<Example
  title="Narrow Width"
  note="Under 24 rem the filter folds into the tools menu, and the bar names the choice beside the button"
  layout="stack"
>
  <Specimen label="In 17 rem">
    <div class="narrow">
      <ListToolbar
        searchLabel="Search repositories"
        placeholder="sui…"
        filter={narrow.filter}
        tools={narrow.tools}
      >
        {#snippet action()}<Button tone="signal">Add Repository</Button>{/snippet}
      </ListToolbar>
    </div>
  </Specimen>
</Example>

<Example
  title="In Context"
  note="The bar stands over the list it filters, owns no list state and says how many rows are left after a pause"
  layout="stack"
  ground="canvas"
>
  <div class="stack" bind:this={context}>
    <ListToolbar
      bind:query={() => search.value, (next) => (search.value = next)}
      searchLabel="Search repositories"
      placeholder="sui…"
      filter={list.filter}
      tools={list.tools}
      count={rows.length}
    >
      {#snippet action()}<Button tone="signal">Add Repository</Button>{/snippet}
    </ListToolbar>
    {#if rows.length > 0}
      <ObjectList>
        {#each rows as repository (repository.name)}
          <ObjectRow href="#{repository.name}">
            {#snippet main()}
              <span class="name">{repository.name}</span>
              <span class="sum">Updated {repository.updated}&nbsp;days ago</span>
            {/snippet}
            {#snippet side()}
              {#if repository.state === 'archived'}<Pill>Archived</Pill>{/if}
            {/snippet}
          </ObjectRow>
        {/each}
      </ObjectList>
    {:else}
      <EmptyState
        title="No Repositories Match"
        description="Clear the search and show every state to see the rest"
      >
        {#snippet action()}<Button onclick={clear}>Show Every Repository</Button>{/snippet}
      </EmptyState>
    {/if}
  </div>
</Example>

<style>
  .stack {
    display: grid;
    gap: var(--sui-rhythm-toolbar-surface);
    min-inline-size: 0;
  }

  /* The 17rem column is drawn, a hairline with no fill, so the bar reads as filling a narrow
     holder rather than stopping short in a wide one. */
  .narrow {
    border-radius: var(--sui-radius-surface);
    box-shadow: 0 0 0 var(--sui-stroke) var(--sui-border-subtle);
    inline-size: min(100% - 2 * var(--sui-space-3), 17rem);
    padding: var(--sui-space-3);
  }

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
