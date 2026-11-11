<script module lang="ts">
  export const section = {
    title: 'Addition Picker',
    lead: 'An add button that opens what is left to add, such as settings a level can override. A single new entry is an add Button.',
    components: ['AdditionPicker']
  };
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import { AdditionPicker, Checkbox, Section, SettingList, SettingRow } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  // A menu item is Title Case and a setting row's name is sentence case (L-30), so each
  // behaviour carries both.
  const behaviours = [
    {
      value: 'auto-merge',
      label: 'Auto Merge',
      name: 'Auto merge',
      description: 'Merge once every check passes'
    },
    {
      value: 'delete-branch',
      label: 'Delete Merged Branches',
      name: 'Delete merged branches',
      description: 'Tidy up after a merge'
    },
    {
      value: 'linear',
      label: 'Require Linear History',
      name: 'Require linear history',
      description: 'Refuse merge commits'
    },
    {
      value: 'stale',
      label: 'Dismiss Stale Reviews',
      name: 'Dismiss stale reviews',
      description: 'Ask again after new commits'
    },
    { value: 'drafts', label: 'Skip Draft Pull Requests', name: 'Skip draft pull requests' }
  ];

  let overrides = $state<Record<string, boolean>>({ linear: true });
  const added = $derived(Object.keys(overrides));
  const rest = $derived(behaviours.length - added.length);
  const named = (value: string) => behaviours.find((behaviour) => behaviour.value === value);

  // A reset row leaves the list, so focus goes on to the picker that can bring it back.
  async function handBack(value: string) {
    delete overrides[value];
    await tick();
    document.getElementById('sink-addition-more')?.focus();
  }
</script>

<Example
  title="Open"
  note="The list drawn open with its first choice lit and each note under its label, hung from the trigger’s start or end"
  layout="grid"
  --specimen-min="26rem"
>
  <Specimen label="First choice lit">
    <AdditionPicker label="Add a Check" choices={behaviours} preview onadd={() => {}} />
  </Specimen>
  <Specimen label="Hung from its end">
    <AdditionPicker
      label="Override Another"
      choices={behaviours}
      added={['auto-merge', 'linear']}
      align="end"
      preview
      onadd={() => {}}
    />
  </Specimen>
</Example>

<Example
  title="States"
  note="Loading, failed, empty and used-up lists say so in the menu, and a locked picker says why"
  layout="grid"
  --specimen-min="17rem"
>
  <Specimen label="Loading">
    <AdditionPicker label="Add a Check" choices={[]} loading preview onadd={() => {}} />
  </Specimen>
  <Specimen label="Failed">
    <AdditionPicker
      label="Add a Check"
      choices={[]}
      error="The checks could not load"
      onretry={() => {}}
      preview
      onadd={() => {}}
    />
  </Specimen>
  <Specimen label="Nothing to add">
    <AdditionPicker label="Add a Check" choices={[]} preview onadd={() => {}} />
  </Specimen>
  <Specimen label="Everything added">
    <AdditionPicker
      label="Add a Check"
      choices={behaviours}
      added={behaviours.map((behaviour) => behaviour.value)}
      preview
      onadd={() => {}}
    />
  </Specimen>
  <Specimen label="Disabled">
    <div class="locked">
      <AdditionPicker label="Override a Behaviour" choices={behaviours} disabled onadd={() => {}} />
      <p class="reason">The workspace locks these behaviours for every repository</p>
    </div>
  </Specimen>
</Example>

<Example
  title="In a Setting List"
  note="Choose a behaviour to set it here, and reset its row to hand it back to the workspace"
  layout="stack"
  ground="canvas"
>
  <Section title="Behaviour" level={4}>
    <SettingList>
      {#each added as value (value)}
        <SettingRow
          name={named(value)?.name ?? value}
          why={named(value)?.description}
          onclear={() => void handBack(value)}
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
            id="sink-addition-more"
            label="Override Another"
            align="end"
            choices={behaviours}
            {added}
            done="Every behaviour is already set here"
            onadd={(value) => (overrides[value] = false)}
          />
        {/snippet}
      </SettingRow>
    </SettingList>
  </Section>
</Example>

<style>
  .locked {
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
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
