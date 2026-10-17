<script module lang="ts">
  export const section = { title: 'Pattern entries', order: 106 };
</script>

<script lang="ts">
  import { PatternEntries } from '#lib';
  import Example from '../kit/Example.svelte';

  let branches = $state(['release/*', 'main', 'hotfix/ urgent', 'main']);
  let paths = $state<string[]>([]);
  let long = $state([
    'services/payments/internal/adapters/providers/a-provider-with-a-very-long-name/**'
  ]);

  function validate(pattern: string, index: number, all: readonly string[]): string | null {
    if (/\s/.test(pattern)) return 'A pattern cannot hold spaces';
    if (all.findIndex((other) => other.trim() === pattern) !== index)
      return 'This pattern is already listed';
    return null;
  }
</script>

<Example
  title="Entries"
  note="Each pattern is edited where it stands, and a problem stands 8px under the entry it belongs to"
  layout="stack"
>
  <PatternEntries bind:value={branches} {validate} addLabel="Add a branch pattern" />
  <span class="state">{JSON.stringify(branches)}</span>
</Example>

<Example
  title="Empty and disabled"
  note="An empty list is only its add button, and a disabled list keeps every entry in view"
>
  <PatternEntries bind:value={paths} />
  <PatternEntries value={['docs/**', 'CHANGELOG.md']} disabled />
</Example>

<Example
  title="Narrow width"
  note="A long pattern scrolls inside its field and the cross stays beside it"
  layout="stack"
>
  <div class="narrow">
    <PatternEntries bind:value={long} />
  </div>
</Example>

<style>
  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .narrow {
    inline-size: 14rem;
    max-inline-size: 100%;
  }
</style>
