<script module lang="ts">
  export const section = { title: 'List toolbar', order: 112 };
</script>

<script lang="ts">
  import { Button, Chip, ListToolbar, ObjectList, ObjectRow } from '#lib';
  import Example from '../kit/Example.svelte';

  const repositories = [
    { name: 'smykla-skalski/sui', state: 'active', updated: 3 },
    { name: 'smykla-skalski/smyklot', state: 'active', updated: 1 },
    { name: 'smykla-skalski/dotfiles', state: 'archived', updated: 40 },
    { name: 'smykla-skalski/kuma-demo', state: 'active', updated: 12 }
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

  let query = $state('');
  let shown = $state('all');
  let order = $state('updated');

  let narrowQuery = $state('');
  let narrowShown = $state('active');
  let narrowOrder = $state('name');

  const filter = $derived({
    label: 'State',
    options: states,
    value: shown,
    onchange: (value: string) => (shown = value)
  });
  const tools = $derived([
    {
      label: 'Sort by',
      options: orders,
      value: order,
      onchange: (value: string) => (order = value)
    }
  ]);

  const rows = $derived(
    repositories
      .filter((repository) => shown === 'all' || repository.state === shown)
      .filter((repository) => repository.name.includes(query.trim().toLowerCase()))
      .sort((a, b) => (order === 'name' ? a.name.localeCompare(b.name) : a.updated - b.updated))
  );
</script>

<Example
  title="Search, filter, tools and action"
  note="The search leads, the filter and its tools button stand together, and the one action ends the bar"
  layout="stack"
>
  <div class="stack">
    <ListToolbar
      bind:query
      searchLabel="Search repositories"
      placeholder="Search repositories…"
      {filter}
      {tools}
    >
      {#snippet action()}<Button tone="signal">Add repository</Button>{/snippet}
    </ListToolbar>
    <div class="card">
      <ObjectList>
        {#each rows as repository (repository.name)}
          <ObjectRow>
            {#snippet main()}
              <span class="name">{repository.name}</span>
              <span class="sum">Updated {repository.updated} days ago</span>
            {/snippet}
            {#snippet side()}
              {#if repository.state === 'archived'}<Chip label="Archived" />{/if}
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
    </div>
  </div>
</Example>

<Example
  title="Narrow toolbar"
  note="Under 18rem the filter folds into the tools menu, and the bar names the choice beside the button"
  layout="stack"
>
  <div class="narrow">
    <ListToolbar
      bind:query={narrowQuery}
      searchLabel="Search repositories"
      filter={{
        label: 'State',
        options: states,
        value: narrowShown,
        onchange: (value) => (narrowShown = value)
      }}
      tools={[
        {
          label: 'Sort by',
          options: orders,
          value: narrowOrder,
          onchange: (value) => (narrowOrder = value)
        }
      ]}
    >
      {#snippet action()}<Button>Add repository</Button>{/snippet}
    </ListToolbar>
  </div>
</Example>

<Example
  title="Search alone"
  note="Without a filter or tools the search fills the bar up to its action"
  layout="stack"
>
  <ListToolbar searchLabel="Search members" placeholder="Search members…">
    {#snippet action()}<Button>Invite member</Button>{/snippet}
  </ListToolbar>
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
