<script module lang="ts">
  export const section = { title: 'Data table', order: 102 };
</script>

<script lang="ts">
  import { Icon } from '#lib';
  import { DataTable, type DataTableColumn } from '#lib';
  import Example from '../kit/Example.svelte';

  type Repository = { name: string; open: number; merged: number; review: string };
  type Release = { version: string; status: string; size: string; published: string };
  type Check = { name: string; path: string; detail: string; runs: number };

  const repositoryColumns: DataTableColumn<Repository>[] = [
    { key: 'name', label: 'Repository' },
    { key: 'open', label: 'Open', numeric: true },
    { key: 'merged', label: 'Merged', numeric: true },
    { key: 'review', label: 'Median review', numeric: true }
  ];
  const repositories: Repository[] = [
    { name: 'smyklot', open: 12, merged: 1_284, review: '3 h 20 min' },
    { name: 'sui', open: 4, merged: 96, review: '45 min' },
    { name: 'ksai', open: 31, merged: 7_402, review: '1 d 2 h' }
  ];

  const releaseColumns: DataTableColumn<Release>[] = [
    { key: 'version', label: 'Version', nowrap: true },
    { key: 'status', label: 'Status', nowrap: true },
    { key: 'size', label: 'Bundle size', numeric: true },
    { key: 'published', label: 'Published', nowrap: true }
  ];
  const releases: Release[] = [
    { version: '0.3.0', status: 'Current', size: '84.7 kB', published: '17 October 2026' },
    { version: '0.2.1', status: 'Superseded', size: '79.2 kB', published: '2 September 2026' },
    { version: '0.2.0', status: 'Withdrawn', size: '79.0 kB', published: '28 August 2026' }
  ];

  const checkColumns: DataTableColumn<Check>[] = [
    { key: 'name', label: 'Check' },
    { key: 'path', label: 'Source' },
    { key: 'detail', label: 'What it holds' },
    { key: 'runs', label: 'Runs', numeric: true }
  ];
  const checks: Check[] = [
    {
      name: 'Palette laws',
      path: 'src/routes/audit/checks.ts',
      detail: 'Text contrast, hover and press steps, and the focus ring on every ground',
      runs: 1_920
    },
    {
      name: 'Source laws',
      path: 'tests/laws.test.mjs',
      detail: 'Tokens, spacing, radii, motion and runes, read straight from the component sources',
      runs: 48_211
    }
  ];
</script>

<Example
  title="Numbers and facts"
  note="Row headers name each row, and numbers sit at the end with tabular figures"
  layout="stack"
>
  <DataTable
    caption="Pull requests over the last 90 days"
    columns={repositoryColumns}
    rows={repositories}
    rowHeader
  />
</Example>

<Example
  title="Narrow frame"
  note="Columns that keep to one line outgrow the room, so the table scrolls inside its own frame"
  layout="stack"
>
  <div class="narrow">
    <DataTable caption="Releases" columns={releaseColumns} rows={releases} rowHeader>
      {#snippet cell(row, column)}
        {#if column.key === 'status'}
          <span class="status">
            {#if row.status === 'Current'}<Icon name="success" size="sm" />{/if}
            {#if row.status === 'Withdrawn'}<Icon name="ban" size="sm" />{/if}
            <span>{row.status}</span>
          </span>
        {:else}
          {row[column.key]}
        {/if}
      {/snippet}
    </DataTable>
  </div>
</Example>

<Example
  title="Long values"
  note="Long text wraps inside its own column, so no cell draws past the column it belongs to"
  layout="stack"
>
  <DataTable aria-label="Law checks" columns={checkColumns} rows={checks} />
</Example>

<style>
  .narrow {
    inline-size: min(100%, 20rem);
  }

  .status {
    align-items: center;
    display: inline-flex;
    gap: var(--sui-space-1);
  }
</style>
