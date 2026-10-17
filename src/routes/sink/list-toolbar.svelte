<script module lang="ts">
  export const section = {
    title: 'List toolbar',
    order: 112,
    lead: 'The bar over a list, with a search, an optional filter and tools, and one action. A search outside a list is a SearchField.',
    components: ['ListToolbar']
  };
</script>

<script lang="ts">
  import { Button, Card, ListToolbar, ObjectList, ObjectRow, Pill, type ListToolGroup } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories = [
    { name: 'smykla-skalski/sui', state: 'active', updated: 3 },
    { name: 'smykla-skalski/smyklot', state: 'active', updated: 2 },
    { name: 'smykla-skalski/dotfiles', state: 'archived', updated: 40 },
    { name: 'smykla-skalski/demo-app', state: 'active', updated: 12 }
  ];

  const states = [
    { value: 'all', label: 'All', count: repositories.length },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' }
  ];

  const orders = [
    { value: 'updated', label: 'Updated' },
    { value: 'name', label: 'Name' }
  ];

  /* Each bar keeps its own choices, so one example never changes another. */
  function choices(shown: string, order: string) {
    const picked = $state({ shown, order });
    return {
      picked,
      get filter(): ListToolGroup {
        return {
          label: 'State',
          options: states,
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
  const list = choices('all', 'updated');

  let query = $state('');

  const rows = $derived(
    repositories
      .filter((repository) => list.picked.shown === 'all' || repository.state === list.picked.shown)
      .filter((repository) => repository.name.includes(query.trim().toLowerCase()))
      .sort((a, b) =>
        list.picked.order === 'name' ? a.name.localeCompare(b.name) : a.updated - b.updated
      )
  );
</script>

<Example
  title="Parts"
  note="The search leads, a filter stands with its tools button, and one action may end the bar"
  layout="stack"
>
  <Specimen label="Search and action" code="action">
    <ListToolbar searchLabel="Search members" placeholder="Search members…">
      {#snippet action()}<Button>Invite member</Button>{/snippet}
    </ListToolbar>
  </Specimen>
  <Specimen label="Filter and tools" code="filter tools">
    <ListToolbar
      searchLabel="Search repositories"
      placeholder="Search repositories…"
      filter={parts.filter}
      tools={parts.tools}
    />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Under 18rem the filter folds into the tools menu, and the bar names the choice beside the button"
  layout="stack"
>
  <Specimen label="In 17rem">
    <div class="narrow">
      <ListToolbar searchLabel="Search repositories" filter={narrow.filter} tools={narrow.tools}>
        {#snippet action()}<Button>Add repository</Button>{/snippet}
      </ListToolbar>
    </div>
  </Specimen>
</Example>

<Example
  title="In context"
  note="The bar stands outside the list's card and owns no list state, so the page filters the rows"
  layout="stack"
  ground="canvas"
>
  <div class="stack">
    <ListToolbar
      bind:query
      searchLabel="Search repositories"
      placeholder="Search repositories…"
      filter={list.filter}
      tools={list.tools}
    >
      {#snippet action()}<Button tone="signal">Add repository</Button>{/snippet}
    </ListToolbar>
    <Card>
      <ObjectList>
        {#each rows as repository (repository.name)}
          <ObjectRow>
            {#snippet main()}
              <span class="name">{repository.name}</span>
              <span class="sum">Updated {repository.updated} days ago</span>
            {/snippet}
            {#snippet side()}
              {#if repository.state === 'archived'}<Pill>Archived</Pill>{/if}
            {/snippet}
          </ObjectRow>
        {:else}
          <ObjectRow>
            {#snippet main()}
              <span class="name">No repositories match</span>
              <span class="sum">Clear the search or show every state</span>
            {/snippet}
          </ObjectRow>
        {/each}
      </ObjectList>
    </Card>
  </div>
</Example>

<style>
  .stack {
    display: grid;
    gap: var(--sui-rhythm-toolbar-surface);
    min-inline-size: 0;
  }

  .narrow {
    inline-size: min(100%, 17rem);
  }

  .name {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sum {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
