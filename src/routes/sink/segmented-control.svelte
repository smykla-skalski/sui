<script module lang="ts">
  export const section = {
    title: 'Segmented control',
    order: 27,
    lead: 'One choice from two to five options that all show at once. Six or more belong in a Select, and answers that need a sentence are ChoiceCards.',
    components: ['SegmentedControl']
  };
</script>

<script lang="ts">
  import { SegmentedControl } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const range = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' }
  ];

  const people = [
    { value: 'users', label: 'Users', icon: 'users' as const, count: 24 },
    { value: 'invitations', label: 'Invitations', icon: 'mail' as const, count: 3 }
  ];

  const levels = [
    { value: 'off', label: 'Off' },
    { value: 'errors', label: 'Errors' },
    { value: 'warnings', label: 'Warnings' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug', disabled: true }
  ];

  let span = $state<string | null>('week');
  let tab = $state<string | null>('users');
  let level = $state<string | null>('warnings');
  let inherited = $state<string | null>(null);
  let narrow = $state<string | null>('info');
  let narrowPeople = $state<string | null>('users');
</script>

<Example
  title="Options"
  note="Two to five options, with a thumb as wide as the chosen one that a drag can move"
>
  <Specimen label="Words" code="options">
    <SegmentedControl label="Time range" options={range} bind:value={span} />
  </Specimen>
  <Specimen label="Icons and counts" code="icon count">
    <SegmentedControl label="People" options={people} bind:value={tab} />
  </Specimen>
</Example>

<Example
  title="States"
  note="A null value draws no thumb, the arrow keys skip a disabled option, and a locked control says why"
>
  <Specimen label="Nothing chosen" code={'value={null}'}>
    <SegmentedControl label="Time range override" options={range} bind:value={inherited} />
  </Specimen>
  <Specimen label="Disabled option" code="disabled: true">
    <div class="locked">
      <SegmentedControl
        label="Log level"
        options={levels}
        bind:value={level}
        aria-describedby="sink-segmented-debug"
      />
      <p id="sink-segmented-debug" class="reason">Debug needs a support plan</p>
    </div>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <SegmentedControl
        label="Log level while saving"
        options={levels}
        value="errors"
        disabled
        aria-describedby="sink-segmented-saving"
      />
      <p id="sink-segmented-saving" class="reason">Locked until the save finishes</p>
    </div>
  </Specimen>
</Example>

<Example
  title="Tiers"
  note="34px by default and 44px on phones, and a surface may opt into 40px through one custom property"
>
  <Specimen label="Default" code="--sui-control-height-compact">
    <SegmentedControl label="Time range on the default tier" options={range} value="month" />
  </Specimen>
  <Specimen label="Tall" code="--sui-local-control-height">
    <div class="tall">
      <SegmentedControl label="Time range on the tall tier" options={range} value="month" />
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Short of room, the same choice becomes a native select, with icons dropped and counts in brackets"
  layout="stack"
>
  <Specimen label="Words as a select">
    <div class="narrow">
      <SegmentedControl label="Log level in a narrow pane" options={levels} bind:value={narrow} />
    </div>
  </Specimen>
  <Specimen label="Counts in brackets">
    <div class="narrow">
      <SegmentedControl
        label="People in a narrow pane"
        options={people}
        bind:value={narrowPeople}
      />
    </div>
  </Specimen>
</Example>

<style>
  .tall {
    --sui-local-control-height: var(--sui-control-height);
    display: grid;
  }

  .narrow {
    display: flex;
    inline-size: min(100%, 12rem);
  }

  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
    justify-items: start;
    min-inline-size: 0;
  }

  .reason {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }
</style>
