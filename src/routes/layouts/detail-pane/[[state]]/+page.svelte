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
    EmptyState,
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
  // A property row sets its label beside its value, so its placeholders keep that pitch and
  // span what the properties will.
  // A repository row is one line of words beside a pill, a pixel of hairline included.
  const NAME_ROW = '2.8125rem';
  const started = Date.now() - 12.5 * 60_000;
  // The results are as old as the check's finish, so the stale notice reads its age from there.
  const finished = started + 48_000;
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
    { at: started, actor: { name: 'Bart Smykla' }, text: 'requested the check' },
    { at: started + 2_000, text: 'A worker picked it up, attempt 1 of 3' },
    { at: finished, text: 'Finished, 16 repositories compared' }
  ];

  const related: LinkListItem[] = [
    { href: '#changes', label: 'Changes from this check' },
    { href: '#previous', label: 'Previous check #4170' }
  ];

  const menu: ActionMenuItem[] = [
    { label: 'Copy the Check ID', onselect: nothing },
    { label: 'Download the Report', onselect: nothing },
    { label: 'Delete This Check', tone: 'stop', onselect: nothing }
  ];

  const nav: NavSection[] = [
    {
      items: [
        { href: '#overview', label: 'Overview', icon: 'gauge' },
        { href: '#repositories', label: 'Repositories', short: 'Repos', icon: 'repositories' },
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

  // The workspace is named by the sidebar's head and in Details, so the headline keeps to the run.
  const headline: Fact[] = [
    { label: 'Started', value: startedAt },
    { label: 'Took', value: '48\u00a0seconds' }
  ];

  const counts: Fact[] = [
    { label: 'Match', value: '12', mono: true, tone: 'success' },
    { label: 'Differ', value: '3', mono: true, tone: 'warning' },
    { label: 'Not checked', value: '1', mono: true, tone: 'neutral' }
  ];

  const details: Fact[] = [
    { label: 'Workspace', value: 'acme', href: '#overview' },
    { label: 'Trigger', value: 'Manual' },
    { label: 'Requested by', value: requester },
    { label: 'Attempt', value: '1 of 3' }
  ];

  const more: Fact[] = [
    { label: 'Check ID', value: 'sc_01JAZ4182', mono: true },
    { label: 'Worker', value: 'sync-worker-3', mono: true },
    { label: 'Settings version', value: 'v41', mono: true },
    { label: 'Waited in queue', value: '2\u00a0seconds' }
  ];

  // While the check loads its facts are known by name, so each label stands as it will and only
  // its value waits.
  const waiting = (facts: Fact[]): Fact[] =>
    facts.map((fact, index) => ({ ...fact, value: index % 2 ? shortBar : bar }));

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
{#snippet bar()}<span class="value-wait"></span>{/snippet}
{#snippet shortBar()}<span class="value-wait short"></span>{/snippet}
{#snippet requester()}<IdentityRow name="Bart Smykla" size={20} />{/snippet}
{#snippet wait(rows: number, rowHeight: string, widths?: string[])}
  <Skeleton
    {rows}
    bars={false}
    ruled={false}
    {rowHeight}
    {widths}
    patience={Infinity}
    label=""
    loadedLabel=""
  />
{/snippet}
{#snippet back()}<BackLink href="#queue" label="Queue" />{/snippet}

{#snippet header()}
  <PageHeader
    title="Sync Check #4182"
    description="Compared 16 repositories in acme with the saved settings"
    kicker={back}
    actions={headActions}
  >
    {#snippet status()}<Pill tone="warning" dot>3 differ</Pill>{/snippet}
    {#snippet facts()}<FactList facts={headline} />{/snippet}
  </PageHeader>
{/snippet}

{#snippet headActions(waiting = false)}
  <!-- A check cannot run again before it has loaded, so the button waits, still in reach. -->
  <Button tone="signal" aria-disabled={waiting || undefined}>Check Again</Button>
  <ActionMenu label="More actions" icon="more" toolbar items={menu} align="end" />
{/snippet}

{#snippet waitingActions()}{@render headActions(true)}{/snippet}

{#snippet body()}
  <DetailLayout>
    {#snippet main()}
      <!-- The warning is about the repositories, so it heads the column that lists them. -->
      <Callout tone="warning" title="The check skipped 1 repository">
        {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
        No read access to acme/legacy
        {#snippet actions()}<Button>Fix Access</Button>{/snippet}
      </Callout>
      <Section title="Outcome">
        <FactList layout="stats" facts={counts} />
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
      <!-- The rare properties close the aside, under the properties they add to. -->
      <Disclosure summary="More About This Check" hint="ID, worker and version">
        <FactList layout="rows" facts={more} />
      </Disclosure>
    {/snippet}
  </DetailLayout>
{/snippet}

<SkipLink href="#content" />

<AppShell title="Sync Check #4182" eyebrow={place} landmark="none" label="Workspace navigation">
  {#snippet rail()}
    <Rail items={places} {foot} current={place} onpick={(item) => (place = item.label)} />
  {/snippet}
  {#snippet sidebar()}
    <SideNav kicker="Workspace" title="Acme" sections={nav} current="#queue" />
  {/snippet}

  <main id="content" tabindex="-1">
    {#if view === 'loading'}
      <!-- The actions need no answer, so they stand where they will stay, and bars stand where
           the description's lines and the facts' lines will, as long as those lines: one of each
           where the description fits a line, and two lines of description over the facts' one
           line where it wraps. -->
      <PageHeader title="Sync Check #4182" kicker={back} actions={waitingActions}>
        <!-- The status region is there from the first render with the state it has, a loading
             word, so the check's own state is read once it arrives. -->
        {#snippet status()}<Pill tone="neutral">Loading</Pill>{/snippet}
        {#snippet facts()}
          <div class="from-ink one-line">
            {@render wait(2, '2.25rem', ['25.3125rem', '18.6875rem'])}
          </div>
          <div class="from-ink two-lines">
            {@render wait(2, '1.375rem', ['20rem', '6.875rem'])}
            <div class="fact-lines">{@render wait(1, '2.125rem', ['18.6875rem'])}</div>
          </div>
        {/snippet}
      </PageHeader>
      <div class="zones">
        <DetailLayout>
          {#snippet main()}
            <!-- The notice's room is held, so the sections do not drop when it arrives. One
                 region, the repositories', speaks for the pane, so the others wait without words. -->
            <div class="notice-room">
              <div class="notice">
                <span class="tile" aria-hidden="true"></span>
                <div class="words">
                  <div class="beside">
                    <Skeleton
                      rows={1}
                      ruled={false}
                      side={false}
                      rowHeight="var(--notice-row)"
                      patience={Infinity}
                      label=""
                      loadedLabel=""
                    />
                  </div>
                  <!-- In a narrow column the notice's action stands under its words, so a
                       button's placeholder stands under their bars. -->
                  <div class="under from-ink">
                    {@render wait(2, '1.375rem')}
                    <span class="press"></span>
                  </div>
                </div>
                <span class="press beside"></span>
              </div>
            </div>
            <Section title="Outcome">
              <!-- Each stat waits as one bar, as wide as its figure and label. -->
              <div class="counts-wait" aria-hidden="true">
                {#each ['5.5625rem', '4.4375rem', '7.5rem'] as width (width)}
                  <span style:inline-size={width}></span>
                {/each}
              </div>
            </Section>
            <!-- The Load More line waits under the five rows as its words and its button. The
                 sync page's link needs nothing the check brings, so it stands ready, as the
                 closing disclosure does. -->
            <Section title="Repositories" count={null}>
              {#snippet actions()}
                <Link href="#repositories" standalone>Open sync page</Link>
              {/snippet}
              <Skeleton
                rows={PAGE}
                bars={false}
                side
                rowHeight={NAME_ROW}
                patience={Infinity}
                label="Loading sync check #4182…"
              />
              <div class="more">
                <div class="shown">{@render wait(1, 'round(up, 1cap, 1px)')}</div>
                <span class="press more-press"></span>
              </div>
            </Section>
            <Section title="Timeline">
              <Timeline events={[]} loading actors loadingLabel="" />
            </Section>
          {/snippet}
          {#snippet aside()}
            <!-- The related links wait on their lines. -->
            <Section title="Details">
              <div aria-hidden="true">
                <FactList layout="rows" facts={waiting(details)} />
              </div>
            </Section>
            <Section title="Related">
              <div class="from-ink links">{@render wait(2, 'var(--link-row)')}</div>
            </Section>
            <!-- The closing disclosure's words need no answer, so it stands where it will stay,
                 and opened early, its four facts wait as rows. -->
            <Disclosure summary="More About This Check" hint="ID, worker and version">
              <div aria-hidden="true">
                <FactList layout="rows" facts={waiting(more)} />
              </div>
            </Disclosure>
          {/snippet}
        </DetailLayout>
      </div>
    {:else if view === 'missing'}
      <PageHeader title="Sync Check #4182" kicker={back} />
      <!-- Nothing failed that a retry could fix, so the page says so in a neutral voice, once,
           in the panel's title rather than in a status beside the header's too. The panel is
           final: this check's content never comes, so its edge is solid. -->
      <div class="zones missing">
        <EmptyState
          final
          title="This Check Does Not Exist"
          description="Someone deleted it, or the link points at a check that never ran"
        >
          {#snippet action()}<Button tone="signal" href="#queue">Open the Queue</Button>{/snippet}
        </EmptyState>
      </div>
    {:else}
      {@render header()}
      <div class={['zones', { stale: view === 'stale' }]}>
        {#if view === 'stale'}
          <!-- Stale words stand behind everything under the header, so the notice spans both
               columns, and its retry stands at its end as any notice's action does. It is one
               compact line, so the warning about the check itself still leads. Its action
               names the data, so it never reads as the header's Check Again. -->
          <Callout compact>
            <!-- A history glyph says the data is old; a refresh glyph would read as a second
                 Reload. The failure leads at a title's weight, so it reads before its reason. -->
            {#snippet icon()}<Icon name="history" size="sm" />{/snippet}
            <span class="lead">The refresh failed</span>, so this page shows data from
            <RelativeTime value={finished} />
            {#snippet actions()}
              <Button loading={refreshing} onclick={refresh}>
                {refreshing ? 'Reloading Data…' : 'Reload Data'}
              </Button>
            {/snippet}
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

  /* A row's status stays within a glance of its name, so on a pane wider than 72rem, as with
     the sidebar folded, the header's words and the zones keep a 72rem pane's column, centred
     as the kit's is, and the band's ground and line still run to the pane's edges. */
  main {
    --sui-local-head-inset: max(
      var(--sui-rhythm-pane-gutter),
      calc((100% - 72rem) / 2 + var(--sui-rhythm-pane-gutter))
    );
  }

  .zones {
    display: grid;
    gap: var(--sui-rhythm-section-gap);
    padding-block: 0 var(--sui-rhythm-pane-gutter);
    padding-inline: var(--sui-local-head-inset);
  }

  /* The stale notice speaks for the whole page, so it stands as near the warning under it as
     the header's band stands over it, and the two notices read as one stack. */
  .stale {
    row-gap: var(--sui-rhythm-head-surface);
  }

  /* A missing check's panel takes the main column's width, as a loaded check's warning does
     where the aside stands beside it (DetailLayout), so the page keeps one edge whether or not
     the check exists. */
  .missing {
    container-type: inline-size;
  }

  @container (min-width: 44rem) {
    .missing > :global(*) {
      max-inline-size: calc(100% - var(--sui-rhythm-section-gap) - clamp(18rem, 30%, 20rem));
    }
  }

  /* The words and the facts that will load here start at their ink, so the placeholders hand
     back the room a list row keeps above its first bar. */
  .from-ink {
    --sui-local-row-lead: calc(-1 * var(--sui-row-pad-default));
  }

  /* The time's 24px target gives back its room under the facts' 11px cap by a half pixel too
     few, so the loaded facts end a pixel under their words, and the bars do too. */
  .from-ink.one-line {
    padding-block-end: 1px;
  }

  /* A bar is as tall as a stat's figure box, so the stats keep their height when they
     arrive. */
  .counts-wait {
    column-gap: var(--sui-space-6);
    display: flex;
  }

  .counts-wait > span {
    background: var(--sui-placeholder);
    block-size: 1.125rem;
    border-radius: var(--sui-radius-pill);
  }

  /* The description takes a second line in a header under 432px on a phone, where its text is
     16px. */
  .two-lines {
    display: none;
  }

  @media (max-width: 47.9375rem) {
    @container sui-page-header (max-width: 27rem) {
      .one-line {
        display: none;
      }

      .two-lines {
        display: block;
      }
    }
  }

  /* The warning's action wraps under its words in a column under about 25rem, where its words
     no longer fit their 14rem measure beside it (Callout), so the notice's room follows. */
  .notice-room {
    container: notice / inline-size;
  }

  .notice {
    --notice-row: 3.75rem;

    block-size: var(--notice-row);
    border-radius: var(--sui-radius-control);
    box-shadow: inset 0 0 0 var(--sui-stroke) var(--sui-border-divider);
    box-sizing: border-box;
    display: flex;
    gap: var(--sui-space-3);
    padding: var(--sui-space-4);
  }

  /* The symbol's tile stands where the callout's will, past its edge and inset, and the bars
     start where its words will. */
  .tile {
    background: var(--sui-placeholder);
    block-size: var(--sui-symbol-tile);
    border-radius: var(--sui-radius-control);
    flex: none;
    inline-size: var(--sui-symbol-tile);
    margin-block-start: calc(var(--sui-space-3) + var(--sui-stroke) - var(--sui-space-4));
    margin-inline-start: calc(var(--sui-space-3) + var(--sui-stroke) - var(--sui-space-4));
  }

  .words {
    flex: 1;
    min-inline-size: 0;
  }

  .beside {
    margin-block: calc(-1 * var(--sui-space-4));
  }

  .under {
    display: none;
  }

  /* Beside the words, the action's placeholder is the button's own box, centred on the tile's
     band and its inset from the end, as the callout's button stands. */
  .press.beside {
    margin-block: calc(
        var(--sui-space-3) + var(--sui-stroke) - var(--sui-space-4) +
          (var(--sui-symbol-tile) - var(--sui-tier-quiet)) / 2
      )
      0;
    margin-inline-end: calc(var(--sui-space-3) + var(--sui-stroke) - var(--sui-space-4));
  }

  /* The action's placeholder ends where the callout's button will, its inset from the foot. */
  .press {
    background: var(--sui-placeholder);
    block-size: var(--sui-tier-quiet);
    border-radius: var(--sui-radius-control);
    display: block;
    inline-size: 6rem;
    margin-block: auto calc(var(--sui-space-3) + var(--sui-stroke) - var(--sui-space-4));
  }

  /* A waiting value is a bar as tall as its words' caps, rounded to the cell's even height, so
     it centres on whole pixels where the words will stand. */
  .value-wait {
    background: var(--sui-placeholder);
    block-size: round(up, 1cap, 2px);
    border-radius: var(--sui-radius-pill);
    display: block;
    inline-size: 4.5rem;
  }

  .value-wait.short {
    inline-size: 3.25rem;
  }

  /* A related link's line is its target and a 4px gap: 28px, or 45px on a touch screen. The
     last link ends at its words, and the last placeholder line keeps half its room under its
     bar, so the section ends where the loaded one will. */
  .links {
    --link-row: 1.75rem;

    margin-block-end: 1px;
  }

  .lead {
    font-weight: var(--sui-weight-semibold);
  }

  /* The facts' line holds the time's 44px target, so it stands 24px of ink under the
     description; the facts end at their words, so the target's room under them is not kept. */
  .fact-lines {
    margin-block: calc(var(--sui-space-6) + 1px) 1px;
  }

  /* The Load More line stands under the last row's hairline, its words at the start and its
     button at the end, 12px under the line, as the loaded line does. The rows above it end at
     their last row's foot, where a list that hands back its padding would end 12px sooner. */
  .more {
    align-items: center;
    border-block-start: var(--sui-row-hairline) solid var(--sui-border-divider);
    display: flex;
    justify-content: space-between;
    margin-block-start: var(--sui-space-3);
    padding-block-start: var(--sui-space-3);
  }

  .shown {
    inline-size: 15.25rem;
  }

  .more-press {
    block-size: var(--sui-control-height-compact);
    inline-size: 7.1875rem;
    margin-block: 0;
  }

  @container notice (max-width: 25.0625rem) {
    .notice {
      --notice-row: 6.25rem;
    }

    .beside {
      display: none;
    }

    .under {
      block-size: 100%;
      display: flex;
      flex-direction: column;
    }
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .links {
      --link-row: calc(var(--sui-touch-target) + 1px);

      margin-block-end: calc(-1 * var(--sui-space-1));
    }
  }

  .name {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
