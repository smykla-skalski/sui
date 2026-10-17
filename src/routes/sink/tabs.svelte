<script module lang="ts">
  export const section = { title: 'Tabs', order: 110 };
</script>

<script lang="ts">
  import { Tabs } from '#lib';
  import Example from '../kit/Example.svelte';

  const pages = [
    { href: '#tabs-overview', label: 'Overview' },
    { href: '#tabs-runs', label: 'Runs' },
    { href: '#tabs-settings', label: 'Settings' }
  ];

  const counted = [
    { href: '#tabs-open', label: 'Open', count: 12 },
    { href: '#tabs-merged', label: 'Merged', count: 1_284 },
    { href: '#tabs-closed', label: 'Closed', count: 7 }
  ];

  const many = [
    { href: '#tabs-summary', label: 'Summary' },
    { href: '#tabs-checks', label: 'Checks', count: 24 },
    { href: '#tabs-files', label: 'Files changed', count: 86 },
    { href: '#tabs-commits', label: 'Commits', count: 3 },
    { href: '#tabs-history', label: 'History' },
    { href: '#tabs-access', label: 'Access' }
  ];
</script>

<Example
  title="Current tab"
  note="The page being shown wears the brand underline and is announced as the current page"
  layout="stack"
>
  <Tabs label="Repository" items={pages} current="#tabs-runs" />
</Example>

<Example title="Counts" note="A count rides its label in tabular figures" layout="stack">
  <Tabs label="Pull requests" items={counted} current="#tabs-open" />
</Example>

<Example
  title="Overflowing row"
  note="Short of room, the row scrolls inside its own track and starts with the current tab in view"
  layout="stack"
>
  <div class="narrow">
    <Tabs label="Pull request" items={many} current="#tabs-access" />
  </div>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
