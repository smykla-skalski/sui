<script module lang="ts">
  export const section = {
    title: 'Fact list',
    order: 113,
    lead: 'Facts about a thing, each a label and its value: a few headline facts inline, or its properties in rows. A setting the reader changes is a form row instead.',
    components: ['FactList']
  };
</script>

<script lang="ts">
  import { FactList, Link, Pill, RelativeTime, VisuallyHidden, type Fact } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const synced = new Date(Date.now() - 42 * 60_000).toISOString();

  const properties: Fact[] = [
    { label: 'Workspace', value: 'acme', href: '#fact-list' },
    { label: 'Trigger', value: 'Manual, from the sync page', action: changeTrigger },
    { label: 'Started', value: syncedAt },
    { label: 'State', value: health },
    { label: 'Attempt', value: '1 of 3', mono: true },
    { label: 'Reviewer', value: null }
  ];
</script>

{#snippet syncedAt()}<RelativeTime value={synced} />{/snippet}
{#snippet health()}<Pill tone="success">Up to date</Pill>{/snippet}
{#snippet changeTrigger()}
  <Link href="#fact-list" standalone>Change<VisuallyHidden>the trigger</VisuallyHidden></Link>
{/snippet}

<Example
  title="Values"
  note="Facts wrap one by one with space between them, and technical values are mono"
  layout="stack"
>
  <Specimen label="Text, mono, time, status and link" code="mono href">
    <FactList
      facts={[
        { label: 'Branch', value: 'main', mono: true },
        { label: 'Version', value: 'v2.9.1', mono: true },
        { label: 'Synced', value: syncedAt },
        { label: 'State', value: health },
        { label: 'Owner', value: 'Platform team', href: '#fact-list' }
      ]}
    />
  </Specimen>
</Example>

<Example
  title="Rows"
  note="A thing's properties, a label and its value on each row, with hairlines between rows and an action at a row's end"
  layout="stack"
>
  <Specimen label="Properties with an action" code={'layout="rows" action'}>
    <FactList layout="rows" facts={properties} />
  </Specimen>
</Example>

<Example
  title="Long values"
  note="A long value breaks inside its own fact and never pushes the row wider"
  layout="grid"
>
  <Specimen label="Path, hash and sentence">
    <FactList
      facts={[
        {
          label: 'Path',
          value: '.github/workflows/release-candidate-with-signed-provenance.yml',
          mono: true
        },
        { label: 'Commit', value: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b', mono: true },
        {
          label: 'Message',
          value: 'Move the release workflow onto the shared runner pool and sign every artefact'
        }
      ]}
    />
  </Specimen>
</Example>

<Example
  title="Missing value"
  note="An absent value says so in words instead of leaving its fact empty"
>
  <Specimen label="Null value" code="value: null">
    <FactList
      facts={[
        { label: 'Branch', value: 'main', mono: true },
        { label: 'Owner', value: null }
      ]}
    />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Under 25rem of its own width, each label stands over its value and the action under it"
  layout="stack"
>
  <Specimen label="Rows in 20rem" code={'layout="rows"'}>
    <div class="narrow">
      <FactList layout="rows" facts={properties} />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 20rem);
  }
</style>
