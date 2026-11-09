<script module lang="ts">
  export const section = {
    title: 'Pair Entry',
    lead: 'Keys and the values they map to as chips that edit in place, such as aliases and their commands. A list of single values is PatternEntries.',
    components: ['PairEntry']
  };
</script>

<script lang="ts">
  import { PairEntry, Section, SettingList, SettingRow, type Pair } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const commands = [
    { value: 'deploy', label: 'deploy', description: 'Ship the branch' },
    { value: 'merge', label: 'merge', description: 'Merge once checks pass' },
    { value: 'rebase', label: 'rebase', description: 'Rebase onto the base branch' },
    { value: 'retry', label: 'retry', description: 'Run failed checks again' },
    { value: 'label', label: 'label', description: 'Add or remove labels' },
    { value: 'approve', label: 'approve', description: 'Approve the pull request' },
    { value: 'close', label: 'close', description: 'Retired', disabled: true }
  ];

  const saved: Pair[] = [
    { key: 'ship', value: 'deploy' },
    { key: 'go', value: 'merge' }
  ];

  let few = $state<Pair[]>([
    { key: 'ship', value: 'deploy' },
    { key: 'go', value: 'merge' }
  ]);
  let none = $state<Pair[]>([]);
  let wrong = $state<Pair[]>([
    { key: 'ship', value: 'deploy' },
    { key: 'Ship it', value: 'merge' }
  ]);
  let pairs = $state<Pair[]>([
    ...saved.map((pair) => ({ ...pair })),
    { key: 'again', value: 'retry' }
  ]);

  const changed = $derived(JSON.stringify(pairs) !== JSON.stringify(saved));

  function problem(key: string, index: number, list: readonly Pair[]): string | null {
    if (key === '') return 'Name the alias';
    if (!/^[a-z0-9-]+$/.test(key)) return 'Use lowercase letters, digits and dashes';
    if (list.findIndex((pair) => pair.key.trim() === key) !== index)
      return 'This alias is already taken';
    return null;
  }

  // A reset hands back a way to put the pairs back, so the row offers Undo.
  function reset() {
    const was = pairs;
    pairs = saved.map((pair) => ({ ...pair }));
    return () => (pairs = was);
  }
</script>

<!-- The section of "In a Setting Row" again, for the narrow example, whose markup is the same. -->
{#snippet aliases()}
  <Section title="Commands" level={4}>
    <SettingList>
      <SettingRow
        name="Aliases"
        why="Extra words mapped to the commands they run"
        unsaved={changed}
        onclear={changed ? reset : undefined}
        resettable
        clearLabel="Reset aliases"
        stacked
      >
        {#snippet control({ labelledby })}
          <PairEntry
            bind:value={pairs}
            options={commands}
            keyLabel="Alias"
            valueLabel="Command"
            addLabel="Add an Alias"
            validate={problem}
            aria-labelledby={labelledby}
          />
        {/snippet}
      </SettingRow>
    </SettingList>
  </Section>
{/snippet}

<Example
  title="States"
  note="A chip opens its editor, a refused key marks its chip and says why, removals are announced, and a locked set says why"
  layout="grid"
>
  <Specimen label="Pairs">
    <PairEntry
      bind:value={few}
      options={commands}
      keyLabel="Alias"
      valueLabel="Command"
      addLabel="Add an Alias"
      validate={problem}
      aria-label="Aliases"
    />
  </Specimen>
  <Specimen label="Empty">
    <PairEntry
      bind:value={none}
      options={commands}
      keyLabel="Alias"
      valueLabel="Command"
      addLabel="Add an Alias"
      validate={problem}
      aria-label="Aliases"
    />
  </Specimen>
  <Specimen label="Invalid">
    <PairEntry
      bind:value={wrong}
      options={commands}
      keyLabel="Alias"
      valueLabel="Command"
      addLabel="Add an Alias"
      validate={problem}
      aria-label="Aliases"
    />
  </Specimen>
  <Specimen label="Disabled">
    <PairEntry
      value={[{ key: 'hold', value: 'merge' }]}
      options={commands}
      keyLabel="Alias"
      valueLabel="Command"
      addLabel="Add an Alias"
      disabled
      reason="Set by the organization, so only an owner can change it"
      aria-label="Locked aliases"
    />
  </Specimen>
</Example>

<Example
  title="In a Setting Row"
  note="The chips stand beside the copy and wrap, and a change marks the row until it is reset"
  layout="stack"
  ground="canvas"
>
  {@render aliases()}
</Example>

<Example
  title="Narrow Width"
  note="In a narrow section the chips take the line under the copy and pack to its start"
  layout="stack"
  ground="canvas"
  code={false}
>
  <div class="narrow">{@render aliases()}</div>
</Example>

<style>
  .narrow {
    inline-size: 22rem;
    max-inline-size: 100%;
  }
</style>
