<script module lang="ts">
  export const section = { title: 'Addition picker', order: 109 };
</script>

<script lang="ts">
  import { AdditionPicker, Card, SettingList, SettingRow, Switch } from '#lib';
  import Example from '../kit/Example.svelte';

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
  title="Overrides"
  note="Pick a behaviour to set it here, and reset its row to hand it back to the workspace"
  layout="stack"
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
            <Switch {id} aria-describedby={describedby} bare bind:checked={overrides[value]} />
          {/snippet}
        </SettingRow>
      {/each}
      <SettingRow
        name={rest === 0 ? 'Every behaviour is set here' : `${rest} more follow the workspace`}
        why="Override one to set it for this repository alone"
      >
        {#snippet control()}
          <AdditionPicker
            label="Override another behaviour"
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

<Example
  title="Everything added and disabled"
  note="When every choice is in use the list says so instead of offering duplicates"
>
  <AdditionPicker
    label="Add a check"
    choices={behaviours}
    added={behaviours.map((behaviour) => behaviour.value)}
    onadd={() => {}}
  />
  <AdditionPicker label="Override a behaviour" choices={behaviours} disabled onadd={() => {}} />
</Example>
