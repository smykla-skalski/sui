<script module lang="ts">
  export const section = {
    title: 'Fact list',
    order: 113,
    lead: 'Short facts about a thing, each a label and its value. A setting the reader changes is a form row instead.',
    components: ['FactList']
  };
</script>

<script lang="ts">
  import { FactList, Pill, RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const synced = new Date(Date.now() - 42 * 60_000).toISOString();
</script>

{#snippet syncedAt()}<RelativeTime value={synced} />{/snippet}
{#snippet health()}<Pill tone="success">In step</Pill>{/snippet}

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
