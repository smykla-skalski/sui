<script module lang="ts">
  export const section = { title: 'Pair entry', order: 105 };
</script>

<script lang="ts">
  import { Button, Card, Icon, PairEntry, SettingList, SettingRow } from '#lib';
  import Example from '../kit/Example.svelte';

  const commands = [
    { value: 'deploy', label: 'deploy', description: 'Ship the branch' },
    { value: 'merge', label: 'merge', description: 'Merge once checks pass' },
    { value: 'rebase', label: 'rebase', description: 'Rebase onto the base branch' },
    { value: 'retry', label: 'retry', description: 'Run failed checks again' },
    { value: 'label', label: 'label', description: 'Add or remove labels' },
    { value: 'approve', label: 'approve', description: 'Approve the pull request' },
    { value: 'close', label: 'close', description: 'Retired', disabled: true }
  ];

  const saved = [
    { key: 'ship', value: 'deploy' },
    { key: 'go', value: 'merge' }
  ];

  let single = $state({ key: 'ship', value: 'deploy' });
  let wrong = $state({ key: 'Ship it', value: 'deploy' });
  let pairs = $state([...saved.map((pair) => ({ ...pair })), { key: 'again', value: 'retry' }]);

  const changed = $derived(JSON.stringify(pairs) !== JSON.stringify(saved));

  function problem(key: string, index = -1): string | undefined {
    const name = key.trim();
    if (name === '') return 'Name the alias';
    if (!/^[a-z0-9-]+$/.test(name)) return 'Use lowercase letters, digits and dashes';
    if (index >= 0 && pairs.findIndex((pair) => pair.key.trim() === name) !== index)
      return 'This alias is already taken';
    return undefined;
  }

  function reset() {
    pairs = saved.map((pair) => ({ ...pair }));
  }
</script>

{#snippet aliases()}
  <Card title="Commands" level={4}>
    <SettingList>
      <SettingRow
        name="Aliases"
        why="Extra words mapped to the commands they run"
        unsaved={changed}
        onclear={changed ? reset : undefined}
        clearLabel="Reset aliases"
      >
        {#snippet control({ labelledby })}
          <div class="pairs" role="group" aria-labelledby={labelledby}>
            {#each pairs as pair, index (index)}
              <PairEntry
                bind:key={pair.key}
                bind:value={pair.value}
                options={commands}
                keyLabel="Alias {index + 1}"
                valueLabel="Command for alias {index + 1}"
                keyPlaceholder="alias"
                valuePlaceholder="command"
                error={problem(pair.key, index)}
                onremove={() => pairs.splice(index, 1)}
              />
            {/each}
            <Button tone="add" onclick={() => pairs.push({ key: '', value: 'deploy' })}>
              {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
              Add an alias
            </Button>
          </div>
        {/snippet}
      </SettingRow>
    </SettingList>
  </Card>
{/snippet}

<Example
  title="Pairs"
  note="Press or type in a command to see suggestions, then use the arrows, Enter to pick and Escape to put it back"
>
  <PairEntry
    bind:key={single.key}
    bind:value={single.value}
    options={commands}
    keyLabel="Alias"
    valueLabel="Command"
    error={problem(single.key)}
    onremove={() => {}}
  />
  <PairEntry
    bind:key={wrong.key}
    bind:value={wrong.value}
    options={commands}
    keyLabel="Alias with a problem"
    valueLabel="Command for the alias with a problem"
    error={problem(wrong.key)}
    onremove={() => {}}
  />
  <PairEntry
    key="hold"
    value="merge"
    options={commands}
    keyLabel="Locked alias"
    valueLabel="Command for the locked alias"
    disabled
    onremove={() => {}}
  />
</Example>

<Example
  title="In a setting row"
  note="Pairs wrap inside their half of the row, and the reset stays centred beside all of them"
  layout="stack"
>
  {@render aliases()}
</Example>

<Example
  title="Narrow width"
  note="On a narrow card the pairs take the line under the copy and pack to its start"
  layout="stack"
>
  <div class="narrow">{@render aliases()}</div>
</Example>

<style>
  .pairs {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2);
    justify-content: inherit;
    min-inline-size: 0;
  }

  .narrow {
    inline-size: 22rem;
    max-inline-size: 100%;
  }
</style>
