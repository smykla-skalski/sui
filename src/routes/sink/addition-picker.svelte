<script module lang="ts">
  export const section = {
    title: 'Addition picker',
    order: 109,
    lead: 'An add button that opens what is left to add, such as settings a level can override. A single new entry is an add Button.',
    components: ['AdditionPicker']
  };
</script>

<script lang="ts">
  import { AdditionPicker, Card, Checkbox, SettingList, SettingRow } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const behaviours = [
    { value: 'auto-merge', label: 'Auto merge', description: 'Merge once every check passes' },
    {
      value: 'delete-branch',
      label: 'Delete merged branches',
      description: 'Tidy up after a merge'
    },
    { value: 'linear', label: 'Require linear history', description: 'Refuse merge commits' },
    { value: 'stale', label: 'Dismiss stale reviews', description: 'Ask again after new commits' },
    { value: 'drafts', label: 'Skip draft pull requests' }
  ];

  let overrides = $state<Record<string, boolean>>({ linear: true });
  const added = $derived(Object.keys(overrides));
  const rest = $derived(behaviours.length - added.length);
  const named = (value: string) => behaviours.find((behaviour) => behaviour.value === value);
</script>

<Example
  title="States"
  note="When every choice is in use the list says so, and a locked picker says why it is locked"
>
  <Specimen label="Everything added" code="added">
    <AdditionPicker
      label="Add a check"
      choices={behaviours}
      added={behaviours.map((behaviour) => behaviour.value)}
      onadd={() => {}}
    />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <AdditionPicker label="Override a behaviour" choices={behaviours} disabled onadd={() => {}} />
      <p class="reason">The workspace locks these behaviours for every repository</p>
    </div>
  </Specimen>
</Example>

<Example
  title="In a setting list"
  note="Pick a behaviour to set it here, and reset its row to hand it back to the workspace"
  layout="stack"
  ground="canvas"
>
  <Card title="Behaviour" level={4}>
    <SettingList>
      {#each added as value (value)}
        <SettingRow
          name={named(value)?.label ?? value}
          why={named(value)?.description}
          onclear={() => delete overrides[value]}
        >
          {#snippet control({ id, describedby })}
            <Checkbox {id} aria-describedby={describedby} bare bind:checked={overrides[value]} />
          {/snippet}
        </SettingRow>
      {/each}
      <SettingRow
        name={rest === 0 ? 'Every behaviour is set here' : `${rest} more follow the workspace`}
        why="Override one to set it for this repository alone"
      >
        {#snippet control()}
          <AdditionPicker
            label="Override another"
            choices={behaviours}
            {added}
            done="Every behaviour is already set here"
            onadd={(value) => (overrides[value] = false)}
          />
        {/snippet}
      </SettingRow>
    </SettingList>
  </Card>
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
</style>
