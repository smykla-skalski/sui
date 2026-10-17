<script module lang="ts">
  export const section = {
    title: 'Pattern entries',
    order: 106,
    lead: 'An editable list of patterns, such as branches or paths to leave alone. A key that maps to a value is a PairEntry.',
    components: ['PatternEntries']
  };
</script>

<script lang="ts">
  import { PatternEntries } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
  title="States"
  note="Each pattern is edited where it stands, a problem stands 8px under its entry, and an empty list is only its add button"
  layout="grid"
>
  <Specimen label="With problems" code="validate">
    <PatternEntries bind:value={branches} {validate} addLabel="Add a branch pattern" />
  </Specimen>
  <Specimen label="Empty" code="bind:value">
    <PatternEntries bind:value={paths} />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <PatternEntries value={['docs/**', 'CHANGELOG.md']} disabled />
      <p class="reason">A parent workspace sets these patterns</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A long pattern scrolls inside its field and the cross stays beside it"
  layout="stack"
>
  <Specimen label="Long pattern">
    <div class="narrow">
      <PatternEntries bind:value={long} />
    </div>
  </Specimen>
</Example>

<style>
  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .reason {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
    max-inline-size: 100%;
  }
</style>
