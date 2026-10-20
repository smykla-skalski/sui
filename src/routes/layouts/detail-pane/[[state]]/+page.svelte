<script lang="ts">
  import { page } from '$app/state';
  import {
    ActionMenu,
    AppShell,
    BackLink,
    Button,
    Callout,
    DetailLayout,
    Disclosure,
    ErrorState,
    FactList,
    Icon,
    IdentityRow,
    Link,
    LinkList,
    LoadMore,
    ObjectList,
    ObjectRow,
    PageHeader,
    Pill,
    Rail,
    RelativeTime,
    Section,
    SideNav,
    SkipLink,
    Skeleton,
    Timeline,
    type ActionMenuItem,
    type Fact,
    type LinkListItem,
    type NavSection,
    type PillTone,
    type RailItem,
    type TimelineEvent
  } from '#lib';

  const PAGE = 5;
  const started = Date.now() - 12.5 * 60_000;
  const nothing = () => {};

  const differs = { state: 'Differs', tone: 'warning' as PillTone };
  const matches = { state: 'Matches', tone: 'success' as PillTone };
  const repositories = [
    { name: 'acme/api', ...differs },
    { name: 'acme/web', ...differs },
    { name: 'acme/search', ...differs },
    { name: 'acme/legacy', state: 'Not checked', tone: 'neutral' as PillTone },
    ...[
      'billing',
      'docs',
      'auth',
      'mobile',
      'infra',
      'ledger',
      'mail',
      'metrics',
      'notify',
      'payments',
      'reports',
      'status'
    ].map((name) => ({ name: `acme/${name}`, ...matches }))
  ];

  const timeline: TimelineEvent[] = [
    { at: started, actor: { name: 'Bart' }, text: 'requested the check from the sync page' },
    { at: started + 2_000, text: 'A worker picked it up, attempt 1 of 3' },
    { at: started + 48_000, text: 'Finished, 16 repositories compared' }
  ];

  const related: LinkListItem[] = [
    { href: '#changes', label: 'Changes from this check' },
    { href: '#previous', label: 'Previous check #4170' }
  ];

  const menu: ActionMenuItem[] = [
    { label: 'Copy the check ID', onselect: nothing },
    { label: 'Download the report', onselect: nothing },
    { label: 'Delete this check', tone: 'stop', onselect: nothing }
  ];

  const nav: NavSection[] = [
    {
      items: [
        { href: '#overview', label: 'Overview', icon: 'gauge' },
        { href: '#repositories', label: 'Repositories', icon: 'repositories' },
        { href: '#queue', label: 'Queue', icon: 'pending', count: 3 }
      ]
    },
    {
      label: 'Sync',
      items: [
        { href: '#labels', label: 'Labels', icon: 'tag' },
        { href: '#rulesets', label: 'Rulesets', icon: 'shield' }
      ]
    }
  ];

  const places: RailItem[] = [
    { label: 'Acme', icon: 'organization' },
    { label: 'Personal', icon: 'user' }
  ];

  const foot: RailItem[] = [{ label: 'Settings', icon: 'settings' }];

  const headline: Fact[] = [
    { label: 'Workspace', value: 'acme' },
    { label: 'Started', value: startedAt },
    { label: 'Took', value: '48 seconds' },
    { label: 'Requested by', value: 'Bart' }
  ];

  const counts: Fact[] = [
    { label: 'Match', value: '12', mono: true },
    { label: 'Differ', value: '3', mono: true },
    { label: 'Not checked', value: '1', mono: true }
  ];

  const details: Fact[] = [
    { label: 'Workspace', value: 'acme', href: '#overview' },
    { label: 'Trigger', value: 'Manual, from the sync page' },
    { label: 'Requested by', value: requester },
    { label: 'Started', value: startedAt },
    { label: 'Attempt', value: '1 of 3', mono: true }
  ];

  const more: Fact[] = [
    { label: 'Check ID', value: 'sc_01JAZ4182', mono: true },
    { label: 'Worker', value: 'sync-worker-3', mono: true },
    { label: 'Settings version', value: 'v41', mono: true },
    { label: 'Waited in queue', value: '2 seconds' }
  ];

  // Each state of the pane has an address of its own: loading, missing, stale, or loaded.
  const view = $derived(page.params.state);
  let place = $state('Acme');
  let shown = $state(PAGE);
  let refreshing = $state(false);

  function refresh() {
    refreshing = true;
    setTimeout(() => (refreshing = false), 1200);
  }
</script>

<svelte:head>
  <title>Sync check #4182 · Detail pane</title>
</svelte:head>

{#snippet startedAt()}<RelativeTime value={started} />{/snippet}
{#snippet requester()}<IdentityRow name="Bart Smykla" size={20} />{/snippet}
{#snippet back()}<BackLink href="#queue" label="Queue" />{/snippet}

{#snippet header()}
  <PageHeader
    title="Sync check #4182"
    description="Compared 16 repositories in acme with the saved settings"
    kicker={back}
  >
    {#snippet status()}<Pill tone="warning" dot>3 differ</Pill>{/snippet}
    {#snippet facts()}<FactList facts={headline} />{/snippet}
    {#snippet actions()}
      <Button tone="signal">Check again</Button>
      <ActionMenu label="More actions" icon="more" toolbar items={menu} align="end" />
    {/snippet}
  </PageHeader>
{/snippet}

{#snippet body()}
  <DetailLayout>
    {#snippet main()}
      <Section title="Outcome">
        <p class="lede">
          Three repositories differ from the saved settings. Twelve match and one was not checked.
        </p>
        <FactList facts={counts} />
      </Section>
      <Section title="Repositories" count={repositories.length} id="repositories-title">
        {#snippet actions()}
          <Link href="#repositories" standalone>Open sync page</Link>
        {/snippet}
        <ObjectList id="repositories-list" aria-labelledby="repositories-title">
          {#each repositories.slice(0, shown) as repository (repository.name)}
            <ObjectRow href="#repositories">
              {#snippet main()}<span class="name">{repository.name}</span>{/snippet}
              {#snippet side()}<Pill tone={repository.tone}>{repository.state}</Pill>{/snippet}
            </ObjectRow>
          {/each}
        </ObjectList>
        <LoadMore
          list="repositories-list"
          more={shown < repositories.length}
          {shown}
          total={repositories.length}
          onmore={() => (shown = Math.min(shown + PAGE, repositories.length))}
        />
      </Section>
      <Section title="Timeline" id="timeline-title">
        <Timeline events={timeline} order="oldest" aria-labelledby="timeline-title" />
      </Section>
    {/snippet}
    {#snippet aside()}
      <Section title="Details">
        <FactList layout="rows" facts={details} />
      </Section>
      <Section title="Related">
        <LinkList links={related} />
      </Section>
    {/snippet}
  </DetailLayout>
  <Disclosure summary="More about this check" hint="ID, worker and version">
    <FactList layout="rows" facts={more} />
  </Disclosure>
{/snippet}

<SkipLink href="#content" />

<AppShell title="Sync check #4182" landmark="none" label="Workspace navigation">
  {#snippet rail()}
    <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
  {/snippet}
  {#snippet sidebar()}
    <SideNav kicker="Workspace" title="Acme" sections={nav} current="#queue" />
  {/snippet}

  <main id="content" tabindex="-1">
    {#if view === 'loading'}
      <PageHeader title="Sync check #4182" kicker={back}>
        <!-- The status region is there from the first render, so the state is read once it arrives. -->
        {#snippet status()}{/snippet}
      </PageHeader>
      <div class="zones">
        <DetailLayout>
          {#snippet main()}
            <Section title="Outcome">
              <div class="from-ink">
                <Skeleton
                  rows={2}
                  bars={false}
                  rowHeight="2rem"
                  patience={Infinity}
                  label="Loading sync check #4182…"
                />
              </div>
            </Section>
            <!-- One region speaks for the pane, so the others wait without words. -->
            <Section title="Repositories" count={16}>
              <Skeleton
                rows={PAGE + 1}
                bars={false}
                rowHeight="3rem"
                patience={Infinity}
                label=""
                loadedLabel=""
              />
            </Section>
            <Section title="Timeline">
              <Timeline events={[]} loading loadingLabel="" />
            </Section>
          {/snippet}
          {#snippet aside()}
            <Section title="Details">
              <div class="from-ink">
                <Skeleton
                  rows={5}
                  bars={false}
                  rowHeight="3.875rem"
                  patience={Infinity}
                  label=""
                  loadedLabel=""
                />
              </div>
            </Section>
          {/snippet}
        </DetailLayout>
      </div>
    {:else if view === 'missing'}
      <PageHeader title="Sync check #4182" kicker={back} />
      <div class="zones">
        <ErrorState
          title="Sync check #4182 was not found"
          description="It was deleted or never existed, so go back to the queue to open another check"
        />
      </div>
    {:else}
      {@render header()}
      <div class="zones">
        {#if view === 'stale'}
          <ErrorState
            overContent
            title="The check could not be refreshed"
            description="Showing what loaded a minute ago"
            onretry={refresh}
            busy={refreshing}
          />
        {:else}
          <Callout tone="warning" title="1 repository was not checked">
            {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
            The app lost access to acme/legacy during the check
            {#snippet actions()}<Button>Fix access</Button>{/snippet}
          </Callout>
        {/if}
        {@render body()}
      </div>
    {/if}
  </main>
</AppShell>

<style>
  main:focus {
    outline: none;
  }

  /* The header's band stands flush with the pane's top and sides, and the zones under it keep
     the band's gutter, so their words line up with the header's. */
  .zones {
    display: grid;
    gap: var(--sui-rhythm-section-gap);
    padding: 0 var(--sui-rhythm-pane-gutter) var(--sui-rhythm-pane-gutter);
  }

  /* Proximity: the counts stand one copy gap further below the sentence than its own lines
     stand apart, so a wrapped sentence still reads as one block (L-24). */
  .lede {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
    margin-block-end: calc(round(calc(1lh - 1cap), 1px) + var(--sui-row-copy-gap));
    text-box: trim-both cap alphabetic;
  }

  /* The sentence and the facts that will load here start at their ink, so the placeholders
     hand back the room a list row keeps above its first bar. */
  .from-ink {
    --sui-local-row-lead: calc(-1 * var(--sui-row-pad-default));
  }

  .name {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
