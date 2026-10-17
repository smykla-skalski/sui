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
            <div class="grid">
              {#each pairs as pair, index (index)}
                <PairEntry
                  bind:key={pair.key}
                  bind:value={pair.value}
                  options={commands}
                  keyLabel="Alias"
                  valueLabel="Command"
                  row={index + 1}
                  heads={index === 0}
                  keyPlaceholder="alias"
                  valuePlaceholder="command"
                  error={problem(pair.key, index)}
                  onremove={() => pairs.splice(index, 1)}
                />
              {/each}
            </div>
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
  note="Headings name each half above the lane, and the arrows light a suggestion for Enter to pick"
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
    keyLabel="New alias"
    valueLabel="New command"
    error={problem(wrong.key)}
    onremove={() => {}}
  />
  <div class="locked">
    <PairEntry
      key="hold"
      value="merge"
      options={commands}
      keyLabel="Locked alias"
      valueLabel="Locked command"
      disabled
      onremove={() => {}}
    />
    <p class="reason">Set by the organization, so only an owner can change it</p>
  </div>
</Example>

<Example
  title="In a setting row"
  note="Pairs stack under one set of headings, and the reset stays centred beside all of them"
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
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
    min-inline-size: 0;
  }

  /* Four columns for each pair to subgrid, so the halves line up under the first pair's headings. */
  .grid {
    column-gap: 0;
    display: grid;
    grid-template-columns: minmax(0, auto) auto minmax(0, auto) auto;
    max-inline-size: 100%;
    min-inline-size: 0;
    row-gap: var(--sui-space-2);
  }

  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
  }

  .reason {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    max-inline-size: 18rem;
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: 22rem;
    max-inline-size: 100%;
  }
</style>
