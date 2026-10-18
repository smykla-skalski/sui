<script module lang="ts">
  export const section = {
    title: 'Detail pane',
    order: 64,
    lead: 'One thing beside its list or on its own page: a header band, one alert at most, sections by importance, properties, then rare detail',
    components: ['DetailLayout', 'PageHeader', 'Section', 'FactList']
  };
</script>

<script lang="ts">
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
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
    { href: '#detail-pane', label: 'Changes from this check' },
    { href: '#detail-pane', label: 'Previous check #4170' }
  ];

  const menu: ActionMenuItem[] = [
    { label: 'Copy the check ID', onselect: nothing },
    { label: 'Download the report', onselect: nothing },
    { label: 'Delete this check', tone: 'stop', onselect: nothing }
  ];

  const nav: NavSection[] = [
    {
      items: [
        { href: '#detail-pane-overview', label: 'Overview', icon: 'gauge' },
        { href: '#detail-pane-repositories', label: 'Repositories', icon: 'repositories' },
        { href: '#detail-pane-queue', label: 'Queue', icon: 'pending', count: 3 }
      ]
    },
    {
      label: 'Sync',
      items: [
        { href: '#detail-pane-labels', label: 'Labels', icon: 'tag' },
        { href: '#detail-pane-rulesets', label: 'Rulesets', icon: 'shield' }
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
    { label: 'Workspace', value: 'acme', href: '#detail-pane' },
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

  let place = $state('Acme');
  let shown = $state<Record<string, number>>({});
  let refreshing = $state(false);

  function refresh() {
    refreshing = true;
    setTimeout(() => (refreshing = false), 1200);
  }
</script>

{#snippet startedAt()}<RelativeTime value={started} />{/snippet}
{#snippet requester()}<IdentityRow name="Bart Smykla" size={20} />{/snippet}

{#snippet header()}
  <PageHeader
    level={4}
    title="Sync check #4182"
    description="Compared 16 repositories in acme with the saved settings"
  >
    {#snippet kicker()}<BackLink href="#detail-pane" label="Queue" />{/snippet}
    {#snippet status()}<Pill tone="warning" dot>3 differ</Pill>{/snippet}
    {#snippet facts()}<FactList facts={headline} />{/snippet}
    {#snippet actions()}
      <Button tone="signal">Check again</Button>
      <ActionMenu items={menu} align="end">More</ActionMenu>
    {/snippet}
  </PageHeader>
{/snippet}

{#snippet body(key: string)}
  {@const count = shown[key] ?? PAGE}
  <DetailLayout>
    {#snippet main()}
      <Section title="Outcome" level={5}>
        <p class="lede">
          Three repositories differ from the saved settings. Twelve match and one was not checked.
        </p>
        <FactList facts={counts} />
      </Section>
      <Section title="Repositories" count={repositories.length} level={5} id="{key}-repositories">
        {#snippet actions()}
          <Link href="#detail-pane" standalone>Open sync page</Link>
        {/snippet}
        <ObjectList id="{key}-list" aria-labelledby="{key}-repositories">
          {#each repositories.slice(0, count) as repository (repository.name)}
            <ObjectRow href="#detail-pane">
              {#snippet main()}<span class="name">{repository.name}</span>{/snippet}
              {#snippet side()}<Pill tone={repository.tone}>{repository.state}</Pill>{/snippet}
            </ObjectRow>
          {/each}
        </ObjectList>
        <LoadMore
          list="{key}-list"
          more={count < repositories.length}
          shown={count}
          total={repositories.length}
          onmore={() => (shown[key] = Math.min(count + PAGE, repositories.length))}
        />
      </Section>
      <Section title="Timeline" level={5} id="{key}-timeline">
        <Timeline events={timeline} order="oldest" aria-labelledby="{key}-timeline" />
      </Section>
    {/snippet}
    {#snippet aside()}
      <Section title="Details" level={5}>
        <FactList layout="rows" facts={details} />
      </Section>
      <Section title="Related" level={5}>
        <LinkList links={related} />
      </Section>
    {/snippet}
  </DetailLayout>
  <Disclosure summary="More about this check" hint="ID, worker and version">
    <FactList layout="rows" facts={more} />
  </Disclosure>
{/snippet}

{#snippet pane(key: string)}
  <div class="pane">
    {@render header()}
    <div class="zones">
      <Callout tone="warning" title="1 repository was not checked">
        {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
        The app lost access to acme/legacy during the check
        {#snippet actions()}<Button>Fix access</Button>{/snippet}
      </Callout>
      {@render body(key)}
    </div>
  </div>
{/snippet}

{#snippet shell(key: string)}
  <AppShell title="Sync check #4182" contained landmark="none" label="Workspace navigation">
    {#snippet rail()}
      <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
    {/snippet}
    {#snippet sidebar()}
      <SideNav
        kicker="Workspace"
        title="Acme"
        level={4}
        sections={nav}
        current="#detail-pane-queue"
        onnavigate={(event) => event.preventDefault()}
      />
    {/snippet}
    {@render pane(key)}
  </AppShell>
{/snippet}

<Example
  title="Layout"
  note="From 56rem of pane the properties stand beside the main sections, and every zone keeps its order"
  layout="stack"
  ground="canvas"
>
  <Specimen label="On its own page" code="main aside">
    <div class="page">{@render pane('detail-pane-wide')}</div>
  </Specimen>
</Example>

<Example
  title="First load"
  note="The title comes from the row that opened the pane, and placeholders hold each section's place until the check arrives"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Loading" code="rowHeight loading status">
    <div class="page">
      <div class="pane">
        <PageHeader level={4} title="Sync check #4182">
          {#snippet kicker()}<BackLink href="#detail-pane" label="Queue" />{/snippet}
          <!-- The status region is there from the first render, so the state is read once it arrives. -->
          {#snippet status()}{/snippet}
        </PageHeader>
        <div class="zones">
          <DetailLayout>
            {#snippet main()}
              <Section title="Outcome" level={5}>
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
              <Section title="Repositories" count={16} level={5}>
                <Skeleton
                  rows={PAGE + 1}
                  bars={false}
                  rowHeight="3rem"
                  patience={Infinity}
                  label=""
                  loadedLabel=""
                />
              </Section>
              <Section title="Timeline" level={5}>
                <Timeline events={[]} loading loadingLabel="" />
              </Section>
            {/snippet}
            {#snippet aside()}
              <Section title="Details" level={5}>
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
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Not found"
  note="A check that no longer exists keeps its header and back link, and the failure stands in place of the body"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Missing">
    <div class="page">
      <div class="pane">
        <PageHeader level={4} title="Sync check #4182">
          {#snippet kicker()}<BackLink href="#detail-pane" label="Queue" />{/snippet}
        </PageHeader>
        <div class="zones">
          <ErrorState
            title="Sync check #4182 was not found"
            description="It was deleted or never existed, so go back to the queue to open another check"
          />
        </div>
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Refresh failed"
  note="A refresh that fails takes the alert slot as one line, and the check that loaded earlier stays under it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Stale content" code="overContent">
    <div class="page">
      <div class="pane">
        {@render header()}
        <div class="zones">
          <ErrorState
            overContent
            title="The check could not be refreshed"
            description="Showing what loaded a minute ago"
            onretry={refresh}
            busy={refreshing}
          />
          {@render body('detail-pane-stale')}
        </div>
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Empty section"
  note="A section with nothing to show says so in one quiet sentence and keeps its heading"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Nothing related">
    <Section title="Related" level={4}>
      <p class="quiet">This is the first check of acme, so nothing relates to it yet</p>
    </Section>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="In a shell the pane is under 56rem, so its properties follow the main sections, and a narrow shell trades its sidebar for a menu"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Rail and sidebar">
    <div class="frame split">{@render shell('detail-pane-split')}</div>
  </Specimen>
  <Specimen label="Phone">
    <div class="frame phone">{@render shell('detail-pane-phone')}</div>
  </Specimen>
</Example>

<style>
  /* The shell grows to the whole pane, so every zone shows without a scroll inside the frame. */
  .frame {
    --sui-shell-height: auto;
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    box-sizing: border-box;
    overflow: hidden;
  }

  /* A 40rem pane beside the rail and the sidebar where the stage has the room; narrower, the
     shell answers to its own width as it does on a page. */
  .split {
    inline-size: min(
      100%,
      calc(var(--sui-rail-width) + var(--sui-sidebar-width) + 40rem + 2 * var(--sui-stroke))
    );
  }

  .phone {
    inline-size: min(100%, 23.4375rem);
  }

  .page {
    background: var(--sui-canvas);
    border: var(--sui-stroke) solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    overflow: hidden;
  }

  /* The header's band stands flush with the pane's top and sides, and the zones under it keep
     the band's gutter, so their words line up with the header's. */
  .zones {
    display: grid;
    gap: var(--sui-rhythm-section-gap);
    padding: 0 var(--sui-rhythm-pane-gutter) var(--sui-rhythm-pane-gutter);
  }

  .lede,
  .quiet {
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  .quiet {
    color: var(--sui-text-muted);
  }

  /* Proximity: the counts stand one copy gap further below the sentence than its own lines
     stand apart, so a wrapped sentence still reads as one block (L-24). */
  .lede {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
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
