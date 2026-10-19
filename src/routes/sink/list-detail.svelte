<script module lang="ts">
  export const section = {
    title: 'List detail',
    order: 65,
    lead: 'A list beside the item open from it, each at its own address. Under 56rem one pane shows at a time, with a way back to the list.',
    components: ['ListDetail']
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    AppShell,
    Button,
    DetailLayout,
    FactLine,
    FactList,
    ListDetail,
    ObjectList,
    ObjectRow,
    PageHeader,
    Pill,
    Rail,
    Section,
    SideNav,
    type Fact,
    type NavSection,
    type PillTone,
    type RailItem
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  type Run = {
    id: string;
    workflow: string;
    branch: string;
    when: string;
    took: string;
    state: string;
    tone: PillTone;
    outcome: string;
  };

  const passed = { state: 'Passed', tone: 'success' as PillTone };
  const failed = { state: 'Failed', tone: 'danger' as PillTone };

  const runs: Run[] = [
    {
      id: '4182',
      workflow: 'Nightly sync',
      branch: 'main',
      when: '12 min ago',
      took: '48 seconds',
      ...failed,
      outcome:
        'Three repositories differ from the saved settings, so the sync stopped before writing'
    },
    {
      id: '4181',
      workflow: 'Deploy web',
      branch: 'main',
      when: '40 min ago',
      took: '2 minutes',
      ...passed,
      outcome: 'The web app went out to every region and answered its health checks'
    },
    {
      id: '4180',
      workflow: 'Lint and test',
      branch: 'fix/labels',
      when: '1 hour ago',
      took: '3 minutes',
      ...passed,
      outcome: 'Every check passed on the branch, so it is ready for review'
    },
    {
      id: '4179',
      workflow: 'Release notes',
      branch: 'main',
      when: '2 hours ago',
      took: '21 seconds',
      ...passed,
      outcome: 'The notes for version 2.4 were drafted from 18 merged changes'
    },
    {
      id: '4178',
      workflow: 'Lint and test',
      branch: 'feat/list-detail',
      when: '3 hours ago',
      took: '4 minutes',
      ...failed,
      outcome: 'Two browser tests failed on the narrow layout, so the branch cannot merge yet'
    },
    ...['4177', '4176', '4175', '4174', '4173', '4172', '4171'].map((id, index) => ({
      id,
      workflow: index % 2 ? 'Deploy web' : 'Nightly sync',
      branch: 'main',
      when: `${index + 4} hours ago`,
      took: '1 minute',
      ...passed,
      outcome:
        index % 2
          ? 'The web app went out to every region and answered its health checks'
          : 'Every repository matched the saved settings'
    }))
  ];

  const steps = [
    { name: 'Read the saved settings', took: '2 s' },
    { name: 'Compare 16 repositories', took: '41 s' },
    { name: 'Report the differences', took: '5 s' }
  ];

  const nav: NavSection[] = [
    {
      items: [
        { href: '#list-detail-overview', label: 'Overview', icon: 'gauge' },
        { href: '#list-detail-runs', label: 'Runs', icon: 'pending' },
        { href: '#list-detail-repositories', label: 'Repositories', icon: 'repositories' }
      ]
    }
  ];

  const places: RailItem[] = [
    { label: 'Acme', icon: 'organization' },
    { label: 'Personal', icon: 'user' }
  ];

  const foot: RailItem[] = [{ label: 'Settings', icon: 'settings' }];

  const href = (run: Run) => `#list-detail-run-${run.id}`;
  const name = (run: Run) => `${run.workflow} #${run.id}`;

  const headline = (run: Run): Fact[] => [
    { label: 'Branch', value: run.branch, mono: true },
    { label: 'Started', value: run.when },
    { label: 'Took', value: run.took }
  ];

  const details = (run: Run): Fact[] => [
    { label: 'Run ID', value: `run_${run.id}`, mono: true },
    { label: 'Workflow', value: run.workflow },
    { label: 'Trigger', value: 'Schedule' },
    { label: 'Runner', value: 'sync-worker-3', mono: true }
  ];

  let place = $state('Acme');
  const open = $state<Record<string, string | undefined>>({ wide: '4182' });

  /** A plain press opens in place, as a router would; a modified one keeps its new tab. */
  const follow = (key: string, id?: string) => (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    open[key] = id;
  };
</script>

{#snippet runList(key: string)}
  <div class="list">
    <Section title="Runs" count={runs.length} level={4} id="{key}-runs">
      <ObjectList aria-labelledby="{key}-runs">
        {#each runs as run (run.id)}
          <ObjectRow href={href(run)} current={run.id === open[key]} onclick={follow(key, run.id)}>
            {#snippet main()}
              <span class="name">{name(run)}</span>
              <span class="sum"
                ><FactLine><span>{run.branch}</span><span>{run.when}</span></FactLine></span
              >
            {/snippet}
            {#snippet side()}<Pill tone={run.tone}>{run.state}</Pill>{/snippet}
          </ObjectRow>
        {/each}
      </ObjectList>
    </Section>
  </div>
{/snippet}

{#snippet runDetail(run: Run, back: Snippet)}
  <PageHeader level={4} title={name(run)} description={run.outcome} kicker={back}>
    {#snippet status()}<Pill tone={run.tone}>{run.state}</Pill>{/snippet}
    {#snippet facts()}<FactList facts={headline(run)} />{/snippet}
    {#snippet actions()}<Button tone="signal">Run again</Button>{/snippet}
  </PageHeader>
  <div class="zones">
    <DetailLayout>
      {#snippet main()}
        <Section title="Steps" count={steps.length} level={5}>
          <ObjectList>
            {#each steps as step (step.name)}
              <ObjectRow>
                {#snippet main()}<span class="step">{step.name}</span>{/snippet}
                {#snippet side()}<span class="took">{step.took}</span>{/snippet}
              </ObjectRow>
            {/each}
          </ObjectList>
        </Section>
      {/snippet}
      {#snippet aside()}
        <Section title="Details" level={5}>
          <FactList layout="rows" facts={details(run)} />
        </Section>
      {/snippet}
    </DetailLayout>
  </div>
{/snippet}

{#snippet pair(key: string)}
  {@const run = runs.find((candidate) => candidate.id === open[key])}
  {#snippet opened(back: Snippet)}{#if run}{@render runDetail(run, back)}{/if}{/snippet}
  <ListDetail
    contained
    label="Runs"
    backHref="#list-detail-runs"
    current={run ? href(run) : undefined}
    detail={run ? opened : undefined}
    onback={follow(key)}
    emptyTitle="No run open"
    emptyDescription="The run you open in the list shows here with its steps and details"
    emptyStep="Choose a run in the list"
  >
    {#snippet list()}{@render runList(key)}{/snippet}
  </ListDetail>
{/snippet}

{#snippet shell(key: string)}
  {@const run = runs.find((candidate) => candidate.id === open[key])}
  <AppShell title={run ? name(run) : 'Runs'} contained landmark="none" label="Workspace navigation">
    {#snippet rail()}
      <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
    {/snippet}
    {#snippet sidebar()}
      <SideNav
        kicker="Workspace"
        title="Acme"
        level={4}
        sections={nav}
        current="#list-detail-runs"
        onnavigate={(event) => event.preventDefault()}
      />
    {/snippet}
    {@render pair(key)}
  </AppShell>
{/snippet}

<Example
  title="Layout"
  note="From 56rem of its own width the list stands beside the open run, and each pane scrolls on its own"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Two panes" code="current detail">
    <div class="frame alone">{@render pair('wide')}</div>
  </Specimen>
</Example>

<Example
  title="Nothing open"
  note="With no run open the detail says so beside the list, and a press on a run opens it there"
  layout="stack"
  ground="canvas"
>
  <Specimen label="No run open" code="emptyTitle emptyDescription emptyStep">
    <div class="frame alone">{@render pair('empty')}</div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Beside a rail and a sidebar the pair is under 56rem, so a run opens over the list with a way back"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Rail and sidebar" code="backHref onback">
    <div class="frame split">{@render shell('shell')}</div>
  </Specimen>
  <Specimen label="Phone">
    <div class="frame phone">{@render shell('phone')}</div>
  </Specimen>
</Example>

<style>
  .frame {
    --sui-shell-height: 36rem;
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    overflow: hidden;
  }

  /* The pair on its own, as a page's content area holds it: a bounded box it fills, so its
     panes scroll inside the frame. */
  .alone {
    background: var(--sui-canvas);
    block-size: var(--sui-shell-height);
  }

  /* A 40rem pair beside the rail and the sidebar where the stage has the room, as the detail
     pane section frames its shell; narrower, the shell answers to its own width as on a page. */
  .split {
    inline-size: min(
      100%,
      calc(var(--sui-rail-width) + var(--sui-sidebar-width) + 40rem + 2 * var(--sui-stroke))
    );
  }

  .phone {
    inline-size: min(100%, 23.4375rem);
  }

  .list {
    padding: var(--sui-rhythm-pane-gutter);
  }

  /* The header's band stands flush with the pane's top and sides, and the zones under it keep
     the band's gutter, so their words line up with the header's. */
  .zones {
    padding: 0 var(--sui-rhythm-pane-gutter) var(--sui-rhythm-pane-gutter);
  }

  .name,
  .step {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .step {
    font-weight: var(--sui-weight-regular);
  }

  .sum,
  .took {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .took {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
