<script module lang="ts">
  export const section = {
    title: 'Tabs',
    order: 110,
    lead: "Links between the pages of one place, such as a repository's overview, runs and settings. Views that swap inside one page are a SegmentedControl.",
    components: ['Tabs']
  };
</script>

<script lang="ts">
  import { Tabs } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
  <Specimen label="Current" code="current">
    <Tabs label="Repository" items={pages} current="#tabs-runs" />
  </Specimen>
</Example>

<Example
  title="Counts"
  note="A count rides its label in tabular figures, grouped the way the page's language writes numbers"
  layout="stack"
>
  <Specimen label="With counts" code="count">
    <Tabs label="Pull requests" items={counted} current="#tabs-open" />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Short of room, the row scrolls in its own track, fades an edge with more tabs past it and starts on the current tab"
  layout="stack"
>
  <Specimen label="Scrolled to the current tab">
    <div class="narrow">
      <Tabs label="Pull request" items={many} current="#tabs-access" />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
