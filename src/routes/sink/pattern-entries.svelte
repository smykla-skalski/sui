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

  let few = $state(['main', 'release/*', 'hotfix/*']);
  let paths = $state<string[]>([]);
  let added = $state<string[]>([]);
  let branches = $state(['release/*', 'main', 'hotfix/ urgent', 'main']);
  let many = $state([
    'docs/**',
    'CHANGELOG.md',
    'vendor/**',
    'node_modules/**',
    '*.lock',
    'dist/**',
    'coverage/**',
    '.github/workflows/*.yml',
    'scripts/release.sh',
    'src/generated/**',
    '*.snap',
    'LICENSE'
  ]);
  let long = $state([
    'services/payments/internal/adapters/providers/a-provider-with-a-very-long-name/**',
    'main'
  ]);
  let globs = $state([
    '!docs/README.md',
    'src/**/*.{ts,svelte}',
    'logs/[!a-z]?.log',
    'v{1..3}/*',
    'build/\\*.tmp'
  ]);
  let mirrored = $state(['main', 'release/*', 'docs/**', '!keep/*.{md,txt}']);
  let narrow = $state([
    'docs/**',
    'CHANGELOG.md',
    'services/payments/internal/adapters/**',
    'vendor/**',
    '*.lock',
    'LICENSE'
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
  <Specimen label="Invalid" code="validate">
    <PatternEntries
      bind:value={branches}
      {validate}
      aria-label="Branches to skip"
      addLabel="Add a branch pattern"
    />
  </Specimen>
  <Specimen label="Empty" code="bind:value">
    <PatternEntries
      bind:value={paths}
      aria-label="Paths to skip"
      onadd={(pattern) => (added = [...added, pattern])}
    />
    <output id="sink-pattern-added">{added.join(',')}</output>
  </Specimen>
  <Specimen label="A few entries" code="bind:value">
    <PatternEntries
      bind:value={few}
      aria-label="Branches to skip"
      addLabel="Add a branch pattern"
    />
  </Specimen>
  <Specimen label="Saving" code="pending">
    <div class="with-reason">
      <PatternEntries
        value={['docs/**', 'CHANGELOG.md']}
        pending
        aria-label="Paths to skip"
        aria-describedby="sink-pattern-saving"
      />
      <p id="sink-pattern-saving" class="reason">Saving…</p>
    </div>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="with-reason">
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
  title="Content"
  note="Each field is as wide as its pattern and colors its glob syntax, the entries wrap, and a long pattern scrolls inside its field"
  layout="stack"
>
  <Specimen label="Glob syntax">
    <PatternEntries bind:value={globs} aria-label="Paths to skip" />
  </Specimen>
  <Specimen label="Many entries">
    <PatternEntries bind:value={many} aria-label="Paths to skip" />
  </Specimen>
  <Specimen label="Long pattern">
    <PatternEntries bind:value={long} aria-label="Paths to skip" />
  </Specimen>
</Example>

<Example
  title="Right to left"
  note="The entries flow from the right and each cross sits at its field's left end"
  layout="grid"
>
  <Specimen label="Right to left" code={'dir="rtl"'}>
    <PatternEntries bind:value={mirrored} dir="rtl" aria-label="Branches to skip" />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="In a phone's width the entries wrap from the start edge, and a long one takes a line of its own"
  layout="stack"
>
  <Specimen label="Phone width">
    <div class="narrow">
      <PatternEntries bind:value={narrow} aria-label="Paths to skip" />
    </div>
  </Specimen>
</Example>

<style>
  .with-reason {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  /* A 375px phone's width less its two 16px gutters. */
  .narrow {
    inline-size: min(100%, 21.4375rem);
    max-inline-size: 100%;
  }
</style>
