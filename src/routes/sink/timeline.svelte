<script module lang="ts">
  export const section = {
    title: 'Timeline',
    order: 115,
    lead: 'What happened to one thing, event by event, each with its time. Things a reader opens or acts on are an ObjectList.',
    components: ['Timeline']
  };
</script>

<script lang="ts">
  import {
    ErrorState,
    Link,
    LoadMore,
    Section,
    Timeline,
    VisuallyHidden,
    type TimelineEvent
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const check = (minute: number, second: number) => new Date(2026, 9, 18, 12, minute, second);

  const log: TimelineEvent[] = [
    { at: check(1, 4), text: 'Requested by Bart from the sync page' },
    { at: check(1, 6), text: 'Worker picked it up, attempt 1 of 3' },
    { at: check(1, 52), text: 'Finished, 16 repositories compared' }
  ];

  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * 60_000);

  const recent: TimelineEvent[] = [
    { at: ago(4), text: 'Sync finished with 3 repositories that differ' },
    { at: ago(130), text: 'Saved settings changed for acme/api' },
    { at: ago(3 * 24 * 60), text: 'Workspace connected to the sync service' }
  ];

  const people: TimelineEvent[] = [
    {
      at: check(1, 4),
      text: 'requested a check from the sync page',
      actor: { name: 'Bart Smykla' }
    },
    {
      at: check(1, 52),
      text: 'compared 16 repositories with the saved settings and found 3 that differ from them',
      actor: { name: 'Sync worker', shape: 'workspace' },
      status: { label: 'Differs', tone: 'warning' },
      action: openRun
    },
    {
      at: check(4, 30),
      text: 'fixed access to acme/legacy',
      actor: { name: 'Ola Nowak' },
      status: { label: 'Fixed', tone: 'success' }
    }
  ];

  const day = (daysAgo: number, hour: number, minute: number) => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, hour, minute);
  };

  /* Out of order on purpose: the timeline sorts its events by their time. */
  const history: TimelineEvent[] = [
    { at: day(1, 17, 5), text: 'Member invited' },
    { at: day(0, 8, 40), text: 'Rule added to main' },
    { at: day(4, 11, 30), text: 'Token rotated' },
    { at: day(0, 9, 12), text: 'Synced 84 files' }
  ];

  const pages: TimelineEvent[] = Array.from({ length: 12 }, (_, index) => ({
    at: new Date(2026, 9, 18, 11, 58 - index * 4),
    text: [
      'Repository synced',
      'Rule added to main',
      'Webhook delivered',
      'Token rotated',
      'Release published',
      'Member invited'
    ][index % 6]
  }));
  const PAGE = 4;
  let shown = $state(PAGE);
  let paging = $state(false);

  function more() {
    paging = true;
    setTimeout(() => {
      paging = false;
      shown = Math.min(shown + PAGE, pages.length);
    }, 800);
  }

  let refreshing = $state(false);

  function refresh() {
    refreshing = true;
    setTimeout(() => (refreshing = false), 1200);
  }
</script>

{#snippet openRun()}
  <Link href="#timeline" standalone>Open run<VisuallyHidden>4182</VisuallyHidden></Link>
{/snippet}

<Example
  title="Times"
  note="Clock times in mono line up in one column, and relative times show the whole instant in a tip"
  layout="stack"
>
  <Specimen label="Clock, oldest first" code={'time="clock" order="oldest"'}>
    <Timeline events={log} order="oldest" aria-label="Check 4182" />
  </Specimen>
  <Specimen label="Relative, newest first" code={'time="relative"'}>
    <Timeline events={recent} time="relative" aria-label="Workspace activity" />
  </Specimen>
</Example>

<Example
  title="States"
  note="An empty timeline says so in one quiet sentence, a loading one holds its final shape, and a failure stands in its place"
  layout="stack"
>
  <Specimen label="Empty" code={'events={[]}'}>
    <Timeline events={[]} />
  </Specimen>
  <Specimen label="Loading" code="loading">
    <Timeline events={[]} loading aria-label="Check 4182" />
  </Specimen>
  <Specimen label="Refreshing" code="loading">
    <Timeline events={log} order="oldest" loading aria-label="Check 4182" />
  </Specimen>
  <Specimen label="Failed">
    <ErrorState
      title="The timeline could not be loaded"
      description="The sync service did not answer. Try again in a moment."
      onretry={refresh}
      busy={refreshing}
    />
  </Specimen>
  <Specimen label="Refresh failed" code="overContent">
    <div class="kept">
      <ErrorState
        overContent
        title="The timeline could not be refreshed"
        description="Showing what loaded at 12:02"
        onretry={refresh}
        busy={refreshing}
      />
      <Timeline events={log} order="oldest" aria-label="Check 4182" />
    </div>
  </Specimen>
</Example>

<Example
  title="Content"
  note="An actor leads the words, a pill and an action sit on the first line, and long words hang on their own edge"
  layout="stack"
>
  <Specimen label="Actor, status and action" code="actor status action">
    <Timeline events={people} order="oldest" aria-label="Check 4182" />
  </Specimen>
  <Specimen label="Long words in 32rem">
    <div class="measure">
      <Timeline events={people} order="oldest" aria-label="Check 4182" />
    </div>
  </Specimen>
</Example>

<Example
  title="Days"
  note="Grouped, each local day takes a heading; ungrouped events from several days carry their date"
  layout="stack"
>
  <Specimen label="Grouped by day" code="days">
    <Timeline events={history} days level={4} aria-label="Workspace history" />
  </Specimen>
  <Specimen label="Across days, ungrouped">
    <Timeline events={history} aria-label="Workspace history" />
  </Specimen>
</Example>

<Example
  title="Long history"
  note="A LoadMore after the list closes it under a hairline and counts the events shown"
  layout="stack"
>
  <Specimen label="Paged" code="id LoadMore">
    <div>
      <Timeline
        id="timeline-paged"
        events={pages.slice(0, shown)}
        aria-label="Workspace activity"
        aria-busy={paging || undefined}
      />
      <LoadMore
        list="timeline-paged"
        more={shown < pages.length}
        {shown}
        total={pages.length}
        loading={paging}
        onmore={more}
      />
    </div>
  </Specimen>
</Example>

<Example
  title="In a section"
  note="The timeline hangs from its section heading, which names the list"
  layout="stack"
  ground="canvas"
>
  <Specimen>
    <Section title="Timeline" id="timeline-in-section" level={4}>
      <Timeline events={log} order="oldest" aria-labelledby="timeline-in-section" />
    </Section>
  </Specimen>
</Example>

<Example
  title="Right to left"
  note="The time column, the actor and the end of the row mirror"
  layout="stack"
>
  <Specimen label="Actor, status and action" code={'dir="rtl"'}>
    <div dir="rtl">
      <Timeline events={people} order="oldest" aria-label="Check 4182" />
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Under 25rem of its own width, each time stands over its words and the pill and action drop under them"
  layout="stack"
>
  <Specimen label="Phone column, 343px">
    <div class="phone">
      <Timeline events={people} order="oldest" aria-label="Check 4182" />
    </div>
  </Specimen>
</Example>

<style>
  .kept {
    display: grid;
    gap: var(--sui-space-4);
  }

  .measure {
    inline-size: min(100%, 32rem);
  }

  .phone {
    inline-size: min(100%, 21.4375rem);
  }
</style>
