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
  note="A problem shows once its entry is left, a removal offers Undo, and a pasted list adds one entry per line"
  layout="grid"
>
  <Specimen label="With problems" code="validate">
    <PatternEntries
      bind:value={branches}
      {validate}
      aria-label="Branches to skip"
      addLabel="Add a branch pattern"
    />
  </Specimen>
  <Specimen label="Empty" code="bind:value">
    <PatternEntries bind:value={paths} aria-label="Paths to skip" />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <PatternEntries
        value={['docs/**', 'CHANGELOG.md']}
        disabled
        aria-label="Paths a parent leaves alone"
        aria-describedby="sink-pattern-locked"
      />
      <p id="sink-pattern-locked" class="reason">A parent workspace sets these patterns</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="A field takes the room it has, and a pattern longer than that scrolls inside it with the cross beside it"
  layout="stack"
>
  <Specimen label="Long pattern">
    <div class="narrow">
      <PatternEntries bind:value={long} aria-label="Paths to skip" />
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
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
    max-inline-size: 100%;
  }
</style>
