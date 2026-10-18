<script module lang="ts">
  export const section = {
    title: 'Page header',
    order: 65,
    lead: 'The top of a page: where it is, what it is called, its state, what it is for and the controls that act on it. A part of the page takes a Section heading instead.',
    components: ['PageHeader', 'Breadcrumb', 'BackLink']
  };
</script>

<script lang="ts">
  import {
    BackLink,
    Breadcrumb,
    Button,
    FactList,
    PageHeader,
    Pill,
    RelativeTime,
    Tabs
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const started = new Date(Date.now() - 12.5 * 60_000).toISOString();
  let checked = $state(false);
</script>

{#snippet startedAt()}<RelativeTime value={started} />{/snippet}

<Example
  title="Parts"
  note="Every header is a band over the page, and its actions move under the copy on a phone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Eyebrow, description and actions" code="eyebrow description actions">
    <div class="page">
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
      <p class="view">Every new repository starts with these rules</p>
    </div>
  </Specimen>
  <Specimen label="Title only" code="title">
    <div class="page">
      <PageHeader level={4} title="Activity" />
      <p class="view">Nothing happened in the last 7 days</p>
    </div>
  </Specimen>
</Example>

<Example
  title="State and facts"
  note="The state stands beside the title and is said once when it changes, and headline facts close the copy"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Status, description and facts" code="kicker status description facts actions">
    <div class="page">
      <PageHeader
        level={4}
        title="Sync check #4182"
        description="Compared 16 repositories in acme with the saved settings"
      >
        {#snippet kicker()}<BackLink href="#page-header" label="Queue" />{/snippet}
        {#snippet status()}
          <Pill tone={checked ? 'success' : 'warning'} dot>
            {checked ? 'Up to date' : '3 differ'}
          </Pill>
        {/snippet}
        {#snippet facts()}
          <FactList
            facts={[
              { label: 'Workspace', value: 'acme' },
              { label: 'Started', value: startedAt },
              { label: 'Took', value: '48 seconds' },
              { label: 'Requested by', value: 'Alex Kim' }
            ]}
          />
        {/snippet}
        {#snippet actions()}
          <Button tone="signal" onclick={() => (checked = !checked)}>
            {checked ? 'Undo the check' : 'Check again'}
          </Button>
        {/snippet}
      </PageHeader>
      <p class="view">
        {checked
          ? 'Every repository matches the saved settings'
          : '3 repositories differ from the saved settings'}
      </p>
    </div>
  </Specimen>
</Example>

<Example
  title="With tabs"
  note="The band's foot is the tabs' line, so the view under it starts on a clean cut"
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
  layout="grid"
  ground="canvas"
>
  <Specimen label="Breadcrumb" code="kicker">
    <div class="page">
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
      <p class="view">Checked every day at 06:00</p>
    </div>
  </Specimen>
  <Specimen label="Back link" code="kicker">
    <div class="page">
      <PageHeader level={4} title="Run 1842">
        {#snippet kicker()}<BackLink href="#page-header" label="All runs" />{/snippet}
      </PageHeader>
      <p class="view">Finished in 4 minutes with no changes</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Long title"
  note="The title balances its lines and holds them closer together than the description under them"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Wrapping title and description">
    <div class="page">
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
      <p class="view">2 people and 1 app can bypass the rules</p>
    </div>
  </Specimen>
</Example>

<style>
  /* A page's content area: the header's band sits flush with its edges, and the view under it
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
