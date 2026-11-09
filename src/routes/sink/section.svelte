<script module lang="ts">
  export const section = {
    title: 'Section',
    lead: 'The default container on a pane: a heading, an optional line of description and the content, with no frame. DetailLayout stands a thing’s properties beside its sections.',
    components: ['Section', 'DetailLayout']
  };
</script>

<script lang="ts">
  import {
    Button,
    DetailLayout,
    FactList,
    Link,
    ObjectList,
    ObjectRow,
    Pill,
    Section,
    type Fact,
    type PillTone
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories: { name: string; state: string; tone: PillTone }[] = [
    { name: 'acme/api', state: 'Differs', tone: 'warning' },
    { name: 'acme/web', state: 'Differs', tone: 'warning' },
    { name: 'acme/billing', state: 'Matches', tone: 'success' },
    { name: 'acme/legacy', state: 'Not checked', tone: 'neutral' }
  ];

  const details: Fact[] = [
    { label: 'Workspace', value: 'acme', href: '#section-detail-layout' },
    { label: 'Trigger', value: 'Manual, from the sync page' },
    { label: 'Attempt', value: '1 of 3', mono: true }
  ];
</script>

{#snippet rows(href: string)}
  <ObjectList>
    {#each repositories as repository (repository.name)}
      <ObjectRow {href}>
        {#snippet main()}<span class="name">{repository.name}</span>{/snippet}
        {#snippet side()}<Pill tone={repository.tone}>{repository.state}</Pill>{/snippet}
      </ObjectRow>
    {/each}
  </ObjectList>
{/snippet}

{#snippet pane()}
  <DetailLayout>
    {#snippet main()}
      <Section title="Outcome" level={4}>
        <p class="copy">
          3 repositories differ from the saved settings, 12 match and the check skipped 1
        </p>
      </Section>
      <Section title="Repositories" count={16} level={4}>
        {#snippet actions()}
          <Link href="#section-detail-layout" standalone>Open sync page</Link>
        {/snippet}
        {@render rows('#section-detail-layout')}
      </Section>
    {/snippet}
    {#snippet aside()}
      <Section title="Details" level={4}>
        <FactList layout="rows" facts={details} />
      </Section>
      <Section title="Related" level={4}>
        <p class="copy">
          <Link href="#section-detail-layout" standalone>Changes from this check</Link>
        </p>
      </Section>
    {/snippet}
  </DetailLayout>
{/snippet}

<Example
  title="Parts"
  note="A title with its description, a count and actions on its cap band, with no frame, ground or line"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Title & description">
    <Section title="Outcome" description="What the last check found" level={4}>
      <p class="copy">
        3 repositories differ from the saved settings, 12 match and the check skipped 1
      </p>
    </Section>
  </Specimen>
  <Specimen label="Count & link">
    <Section title="Repositories" count={16} level={4}>
      {#snippet actions()}
        <Link href="#section-parts" standalone>Open sync page</Link>
      {/snippet}
      <p class="copy">Every repository in the acme workspace</p>
    </Section>
  </Specimen>
  <Specimen label="Quiet button">
    <Section title="Webhooks" description="Deliveries in the last 24&nbsp;hours" level={4}>
      {#snippet actions()}<Button tone="ghost">Refresh</Button>{/snippet}
      <p class="copy">All 18 deliveries succeeded</p>
    </Section>
  </Specimen>
</Example>

<Example
  title="In Sequence"
  note="Sections that follow each other stand 40 px apart, 32 px on a phone, with no wrapper and no line between them"
  layout="stack"
  ground="canvas"
>
  <Specimen label="3 sections">
    <div>
      <Section title="Outcome" level={4}>
        <p class="copy">
          3 repositories differ from the saved settings, 12 match and the check skipped 1
        </p>
      </Section>
      <Section title="Timeline" level={4}>
        <p class="copy">Requested by Bart at 12:01 and finished 48&nbsp;seconds later</p>
      </Section>
      <Section title="Related" level={4}>
        <p class="copy">
          <Link href="#section-in-sequence" standalone>Previous check #4170</Link>
        </p>
      </Section>
    </div>
  </Specimen>
</Example>

<Example
  title="Sub-sections"
  note="A section inside another takes the 15 px title and stands 24 px under what comes before it, 20 px on a phone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Nested">
    <Section title="Access" description="Who can open this workspace" level={4}>
      <p class="copy">3 teams and 2 people have access</p>
      <Section title="Teams" count={3} level={5}>
        <p class="copy">Platform, Billing and Support can change settings</p>
      </Section>
      <Section title="People" count={2} level={5}>
        <p class="copy">Bart and Ola can only read</p>
      </Section>
    </Section>
  </Specimen>
</Example>

<Example
  title="With a List"
  note="A list hangs from the section: its words keep the title’s edge and a hovered row’s ground reaches past it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Object list">
    <Section title="Repositories" count={16} level={4}>
      {#snippet actions()}
        <Link href="#section-with-a-list" standalone>Open sync page</Link>
      {/snippet}
      {@render rows('#section-with-a-list')}
    </Section>
  </Specimen>
</Example>

<Example
  title="Detail Layout"
  note="From 56 rem of its own width the aside stands beside the main sections, and under that it follows them"
  layout="stack"
  ground="canvas"
>
  <Specimen label="The stage’s width">
    {@render pane()}
  </Specimen>
  <Specimen label="In 30 rem">
    <div class="narrow">{@render pane()}</div>
  </Specimen>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
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

  .narrow {
    inline-size: min(100%, 30rem);
  }
</style>
