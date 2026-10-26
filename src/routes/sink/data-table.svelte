<script module lang="ts">
  export const section = {
    title: 'Data table',
    lead: 'A table of numbers and facts that a reader compares across rows. Things a reader opens or acts on belong in an ObjectList.',
    components: ['DataTable']
  };
</script>

<script lang="ts">
  import { DataTable, Icon, type DataTableColumn } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  type Repository = { name: string; open: number; merged: number; review: string };
  type Release = { version: string; status: string; size: string; published: string };
  type Check = { name: string; path: string; detail: string; runs: number };
  type Build = {
    branch: string;
    runner: string;
    queued: string;
    duration: string;
    tests: number;
    failed: number;
    cache: string;
    size: string;
  };

  const repositoryColumns: DataTableColumn<Repository>[] = [
    { key: 'name', label: 'Repository', sortable: true },
    { key: 'open', label: 'Open', numeric: true, sortable: true },
    { key: 'merged', label: 'Merged', numeric: true, sortable: true },
    { key: 'review', label: 'Median review', numeric: true }
  ];
  const repositories: Repository[] = [
    { name: 'smyklot', open: 12, merged: 1_284, review: '3 h 20 min' },
    { name: 'sui', open: 4, merged: 96, review: '45 min' },
    { name: 'ledger', open: 31, merged: 7_402, review: '1 d 2 h' }
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

  const buildColumns: DataTableColumn<Build>[] = [
    { key: 'branch', label: 'Branch', nowrap: true },
    { key: 'runner', label: 'Runner', nowrap: true },
    { key: 'queued', label: 'Queued', numeric: true },
    { key: 'duration', label: 'Duration', numeric: true },
    { key: 'tests', label: 'Tests', numeric: true },
    { key: 'failed', label: 'Failed', numeric: true },
    { key: 'cache', label: 'Cache hits', numeric: true },
    { key: 'size', label: 'Artifact', numeric: true }
  ];
  const builds: Build[] = [
    {
      branch: 'main',
      runner: 'linux-x64',
      queued: '4 s',
      duration: '6 min 12 s',
      tests: 1_284,
      failed: 0,
      cache: '92%',
      size: '84.7 MB'
    },
    {
      branch: 'release/0.3',
      runner: 'linux-x64',
      queued: '11 s',
      duration: '7 min 40 s',
      tests: 1_284,
      failed: 2,
      cache: '88%',
      size: '84.9 MB'
    },
    {
      branch: 'feat/charts',
      runner: 'macos-arm64',
      queued: '1 min 3 s',
      duration: '9 min 5 s',
      tests: 1_302,
      failed: 0,
      cache: '71%',
      size: '85.3 MB'
    },
    {
      branch: 'fix/focus',
      runner: 'linux-arm64',
      queued: '9 s',
      duration: '5 min 58 s',
      tests: 1_286,
      failed: 1,
      cache: '94%',
      size: '84.7 MB'
    },
    {
      branch: 'chore/deps',
      runner: 'linux-x64',
      queued: '6 s',
      duration: '8 min 21 s',
      tests: 1_284,
      failed: 0,
      cache: '43%',
      size: '86.1 MB'
    },
    {
      branch: 'feat/pager',
      runner: 'windows-x64',
      queued: '2 min 40 s',
      duration: '12 min 9 s',
      tests: 1_290,
      failed: 5,
      cache: '65%',
      size: '85.0 MB'
    }
  ];

  let sort = $state<{ key: string; direction: 'ascending' | 'descending' } | null>({
    key: 'merged',
    direction: 'descending'
  });
  let retried = $state(0);
</script>

<Example
  title="Variants"
  note="Row headers name each row, numbers sit at the end, and a wide table may stripe its rows"
  layout="stack"
>
  <Specimen label="Row headers, sortable" code="caption rowHeader sortable bind:sort">
    <DataTable
      caption="Pull requests over the last 90 days"
      columns={repositoryColumns}
      rows={repositories}
      rowHeader
      bind:sort
    />
  </Specimen>
  <Specimen label="Striped" code="striped">
    <DataTable
      caption="Builds in the last hour"
      columns={buildColumns}
      rows={builds}
      rowHeader
      striped
    />
  </Specimen>
</Example>

<Example
  title="Long values"
  note="Long text wraps inside its own column, so no cell draws past the column it belongs to"
  layout="stack"
>
  <Specimen label="Wrapping text, named without a caption" code="aria-label">
    <DataTable aria-label="Law checks" columns={checkColumns} rows={checks} />
  </Specimen>
</Example>

<Example
  title="States"
  note="Empty, loading, refreshing and failed tables say so in words under their headings"
  layout="grid"
>
  <Specimen label="Empty" code={'rows={[]}'}>
    <DataTable caption="Releases" columns={releaseColumns} rows={[]} />
  </Specimen>
  <Specimen label="Loading" code="loading">
    <DataTable caption="Releases" columns={releaseColumns} rows={[]} loading />
  </Specimen>
  <Specimen label="Refreshing" code="refreshing">
    <DataTable caption="Releases" columns={releaseColumns} rows={releases} refreshing />
  </Specimen>
  <Specimen label="Failed" code="error onretry">
    <DataTable
      caption="Releases"
      columns={releaseColumns}
      rows={[]}
      error="Releases could not load"
      onretry={() => retried++}
    />
  </Specimen>
  <Specimen label="Failed over old rows" code="error onretry">
    <DataTable
      caption="Releases"
      columns={releaseColumns}
      rows={releases.slice(0, 2)}
      error="These rows may be out of date"
      onretry={() => retried++}
    />
  </Specimen>
</Example>

<Example
  title="First load"
  note="Placeholder rows take the table's own cells, each bar where its column's words start, and one light crosses them"
  layout="stack"
>
  <Specimen label="Loading, wide" code="rowHeader loading">
    <DataTable
      caption="Builds in the last hour"
      columns={buildColumns}
      rows={[]}
      rowHeader
      loading
    />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Columns that outgrow the room scroll inside the frame, which says so and keeps the row headings in view"
  layout="grid"
>
  <Specimen label="Scrolls, with drawn cells" code="cell">
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
  </Specimen>
</Example>

<style>
  /* An icon has no baseline, so a baseline-aligned box would ride half a pixel above the line
     and grow the row off the grid (L-95). */
  /* The words run cap to baseline in an even box, so the icon centres on them by whole
     pixels (L-94). */
  /* A row of its own, one cap tall like the other cells' words, with the mark hung on that cap
     (L-94): an inline box would sit at the top of the cell's trimmed line instead. */
  .status {
    align-items: center;
    display: flex;
    gap: var(--sui-space-1);
  }

  .status > :global(svg) {
    margin-block: calc((round(up, 1cap, 2px) - var(--sui-icon-sm)) / 2);
  }

  .status > span {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    text-box: trim-both cap alphabetic;
  }
</style>
