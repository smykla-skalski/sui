<script lang="ts">
  import type { Snippet } from 'svelte';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import {
    AppShell,
    Button,
    DetailLayout,
    ErrorState,
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
    SkipLink,
    type Fact,
    type NavSection,
    type PillTone,
    type RailItem
  } from '#lib';

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

  const runsHref = resolve('/layouts/list-detail/[[run]]', {}) + '/';
  const href = (run: Run) => resolve('/layouts/list-detail/[[run]]', { run: run.id }) + '/';
  const name = (run: Run) => `${run.workflow} #${run.id}`;

  const nav: NavSection[] = [
    {
      items: [
        { href: '#overview', label: 'Overview', icon: 'gauge' },
        { href: runsHref, label: 'Runs', icon: 'pending' },
        { href: '#repositories', label: 'Repositories', icon: 'repositories' }
      ]
    }
  ];

  const places: RailItem[] = [
    { label: 'Acme', icon: 'organization' },
    { label: 'Personal', icon: 'user' }
  ];

  const foot: RailItem[] = [{ label: 'Settings', icon: 'settings' }];

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

  const id = $derived(page.params.run);
  const run = $derived(runs.find((candidate) => candidate.id === id));
  let place = $state('Acme');
</script>

<svelte:head>
  <title>{run ? name(run) : 'Runs'} · List detail</title>
</svelte:head>

{#snippet opened(back: Snippet)}
  {#if run}
    <PageHeader title={name(run)} description={run.outcome} kicker={back}>
      {#snippet status()}<Pill tone={run.tone}>{run.state}</Pill>{/snippet}
      {#snippet facts()}<FactList facts={headline(run)} />{/snippet}
      {#snippet actions()}<Button tone="signal">Run again</Button>{/snippet}
    </PageHeader>
    <div class="zones">
      <DetailLayout>
        {#snippet main()}
          <Section title="Steps" count={steps.length}>
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
          <Section title="Details">
            <FactList layout="rows" facts={details(run)} />
          </Section>
        {/snippet}
      </DetailLayout>
    </div>
  {:else}
    <PageHeader title="Run #{id}" kicker={back} />
    <div class="zones">
      <ErrorState
        title="Run #{id} was not found"
        description="It was deleted or never existed, so go back to the runs to open another one"
      />
    </div>
  {/if}
{/snippet}

<SkipLink href="#content" />

<AppShell title={run ? name(run) : 'Runs'} landmark="none" label="Workspace navigation">
  {#snippet rail()}
    <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
  {/snippet}
  {#snippet sidebar()}
    <SideNav kicker="Workspace" title="Acme" sections={nav} current={runsHref} />
  {/snippet}

  <!-- ListDetail moves focus to the run it opens and back to its row, and keeps each pane's
       scroll, so the router leaves focus and scroll where they are. -->
  <main id="content" tabindex="-1" data-sveltekit-reset="false">
    <ListDetail
      label="Runs"
      backHref={runsHref}
      current={id ? resolve('/layouts/list-detail/[[run]]', { run: id }) + '/' : undefined}
      detail={id ? opened : undefined}
      emptyTitle="No run open"
      emptyDescription="The run you open in the list shows here with its steps and details"
      emptyStep="Choose a run in the list"
    >
      {#snippet list()}
        <div class="list">
          <Section title="Runs" count={runs.length} id="runs-title">
            <ObjectList aria-labelledby="runs-title">
              {#each runs as candidate (candidate.id)}
                <ObjectRow href={href(candidate)} current={candidate.id === id}>
                  {#snippet main()}
                    <span class="name">{name(candidate)}</span>
                    <span class="sum"
                      ><FactLine
                        ><span>{candidate.branch}</span><span>{candidate.when}</span></FactLine
                      ></span
                    >
                  {/snippet}
                  {#snippet side()}<Pill tone={candidate.tone}>{candidate.state}</Pill>{/snippet}
                </ObjectRow>
              {/each}
            </ObjectList>
          </Section>
        </div>
      {/snippet}
    </ListDetail>
  </main>
</AppShell>

<style>
  main:focus {
    outline: none;
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
