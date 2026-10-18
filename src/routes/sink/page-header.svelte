<script module lang="ts">
  export const section = {
    title: 'Page header',
    order: 65,
    lead: 'The top of a page: where it is, what it is called, what it is for and the controls that act on it. A group inside the page takes a Card title instead.',
    components: ['PageHeader', 'Breadcrumb', 'BackLink']
  };
</script>

<script lang="ts">
  import { BackLink, Breadcrumb, Button, PageHeader, Tabs } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Parts"
  note="The actions centre on the whole copy stack, and move under it on a phone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Eyebrow, description and actions" code="eyebrow description actions">
    <PageHeader
      level={4}
      eyebrow={['Acme', 'Sync']}
      title="Repository settings"
      description="Rules every repository in this workspace is held to"
    >
      {#snippet actions()}
        <Button>Export</Button>
        <Button tone="signal">Save changes</Button>
      {/snippet}
    </PageHeader>
  </Specimen>
  <Specimen label="Title only" code="title">
    <PageHeader level={4} title="Activity" />
  </Specimen>
</Example>

<Example
  title="With tabs"
  note="The header becomes a band down to the tabs' line, so the view under it starts on a clean cut"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Views of one page" code="tabs">
    <div class="page">
      <PageHeader
        level={4}
        eyebrow={['Acme', 'Repositories']}
        title="smykla-skalski/sui"
        description="The component library and its kitchen sink"
      >
        {#snippet actions()}
          <Button>Sync now</Button>
        {/snippet}
        {#snippet tabs()}
          <Tabs
            label="Repository"
            current="#page-header-runs"
            items={[
              { href: '#page-header-overview', label: 'Overview' },
              { href: '#page-header-runs', label: 'Runs', count: 12 },
              { href: '#page-header-settings', label: 'Settings' }
            ]}
          />
        {/snippet}
      </PageHeader>
      <p class="view">The last run checked 84 files and found nothing to change</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Breadcrumb and back link"
  note="A breadcrumb or a back link takes the eyebrow's place"
  ground="canvas"
>
  <Specimen label="Breadcrumb" code="kicker">
    <PageHeader
      level={4}
      title="Sync schedule"
      description="When this repository is checked against its template"
    >
      {#snippet kicker()}
        <Breadcrumb
          items={[
            { label: 'Acme', href: '#page-header' },
            { label: 'Repositories', href: '#page-header' }
          ]}
        />
      {/snippet}
    </PageHeader>
  </Specimen>
  <Specimen label="Back link" code="kicker">
    <PageHeader level={4} title="Run 1842">
      {#snippet kicker()}<BackLink href="#page-header" label="All runs" />{/snippet}
    </PageHeader>
  </Specimen>
</Example>

<Example
  title="Long title"
  note="The title balances its lines, and the copy keeps its 8px rhythm when it wraps"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Wrapping title and description">
    <PageHeader
      level={4}
      eyebrow={['Acme', 'Access']}
      title="Bypass rules for the platform team's deployment and release repositories in every region"
      description="People and apps listed here can push past the branch rules, and every push they make is written to the audit log"
    >
      {#snippet actions()}
        <Button tone="signal">Add a rule</Button>
      {/snippet}
    </PageHeader>
  </Specimen>
</Example>

<style>
  /* A page's content area: the banded header sits flush with its edges, and the view under it
     takes the same gutter. */
  .page {
    background: var(--sui-canvas);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    overflow: hidden;
  }

  .view {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding: 0 var(--sui-rhythm-pane-gutter) var(--sui-space-6);
    text-box: trim-both cap alphabetic;
  }
</style>
