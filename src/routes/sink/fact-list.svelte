<script module lang="ts">
  export const section = { title: 'Fact list', order: 113 };
</script>

<script lang="ts">
  import { FactList, Pill, RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';

  const synced = new Date(Date.now() - 42 * 60_000).toISOString();
</script>

{#snippet syncedAt()}<RelativeTime value={synced} />{/snippet}
{#snippet health()}<Pill tone="success">In step</Pill>{/snippet}

<Example
  title="Facts"
  note="Facts wrap one by one with space between them, and technical values are mono"
  layout="stack"
>
  <FactList
    facts={[
      { label: 'Branch', value: 'main', mono: true },
      { label: 'Version', value: 'v2.9.1', mono: true },
      { label: 'Synced', value: syncedAt },
      { label: 'State', value: health },
      { label: 'Owner', value: 'Platform team', href: '#fact-list' }
    ]}
  />
</Example>

<Example
  title="Long values"
  note="A long value breaks inside its own fact and never pushes the row wider"
  layout="stack"
>
  <div class="narrow">
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
  </div>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 22rem);
  }
</style>
