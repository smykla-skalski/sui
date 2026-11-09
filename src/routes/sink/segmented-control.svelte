<script module lang="ts">
  export const section = {
    title: 'Segmented Control',
    lead: 'One choice from 2 to 5 options that all show at once. A Select holds 6 or more, and answers that need a sentence are ChoiceCards.',
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
  let drawn = $state<string | null>('week');
  let beside = $state<string | null>('week');
  let tab = $state<string | null>('users');
  let level = $state<string | null>('warnings');
  let inherited = $state<string | null>(null);
  let narrow = $state<string | null>('info');
  let narrowPeople = $state<string | null>('users');
  let disabledLevel = $state<string | null>('debug');
</script>

<Example
  title="Options"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="2 to 5 options, with a thumb as wide as the chosen one that a drag can move"
>
  <Specimen label="Words">
    <SegmentedControl label="Time range" options={range} bind:value={span} />
  </Specimen>
  <Specimen label="Icons & counts">
    <SegmentedControl label="People" options={people} bind:value={tab} />
  </Specimen>
</Example>

<Example
  title="Label"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="The label stands above the options, unless a visible name beside the control already says it"
>
  <Specimen label="Drawn">
    <SegmentedControl label="Time range" options={range} bind:value={drawn} />
  </Specimen>
  <Specimen label="Named beside it">
    <div class="beside">
      <span id="sink-segmented-name" class="name">Time range</span>
      <SegmentedControl
        label="Time range"
        aria-labelledby="sink-segmented-name"
        options={range}
        bind:value={beside}
      />
    </div>
  </Specimen>
</Example>

<Example
  title="States"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="A null value draws no thumb, the arrow keys skip a disabled option, and a locked control says why"
>
  <Specimen label="Nothing chosen">
    <SegmentedControl label="Time range" options={range} bind:value={inherited} />
  </Specimen>
  <Specimen label="Disabled option">
    <SegmentedControl
      label="Log level"
      options={levels}
      bind:value={level}
      hint="Debug needs a support plan"
    />
  </Specimen>
  <Specimen label="Selected disabled option">
    <SegmentedControl label="Locked log level" options={levels} bind:value={disabledLevel} />
  </Specimen>
  <Specimen label="Disabled">
    <SegmentedControl
      label="Log level"
      options={levels}
      value="errors"
      disabled
      hint="Locked until the save finishes"
    />
  </Specimen>
</Example>

<Example
  title="Tiers"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="34 px by default and 44 px on phones, and a surface may opt into 40 px through 1 custom property"
>
  <Specimen label="Default">
    <SegmentedControl label="Time range" options={range} value="month" />
  </Specimen>
  <div class="wide-only">
    <Specimen label="Tall">
      <div class="tall">
        <SegmentedControl label="Time range" options={range} value="month" />
      </div>
    </Specimen>
  </div>
</Example>

<Example
  title="Narrow Width"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="Short of room, the same choice becomes a native select, with icons dropped and counts in brackets"
>
  <Specimen label="Words as a select">
    <div class="narrow">
      <SegmentedControl label="Log level" options={levels} bind:value={narrow} />
    </div>
  </Specimen>
  <Specimen label="Counts in brackets">
    <div class="narrow">
      <SegmentedControl label="People" options={people} bind:value={narrowPeople} />
    </div>
  </Specimen>
</Example>

<style>
  .tall {
    --sui-local-control-height: var(--sui-control-height);
    display: grid;
  }

  /* A phone draws every tier at the 44px touch height, so a taller specimen there would show
     the same control twice. */
  .wide-only {
    display: contents;
  }

  @media (max-width: 47.9375rem) {
    .wide-only {
      display: none;
    }
  }

  .narrow {
    display: flex;
    inline-size: min(100%, 12rem);
  }

  /* The control named beside it stands on the line of the one whose label is drawn over it, a
     caption and a field gap down, so the two compare at a glance. */
  .beside {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    /* The caption's font, so 1cap is the cap height its snapped line rounds up from. */
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-note)
      var(--sui-sans);
    min-inline-size: 0;
    padding-block-start: calc(round(up, 1cap, 1px) + var(--sui-field-gap));
  }

  /* A phone stacks the specimens, so there is no drawn label beside it to line up with. */
  @media (max-width: 47.9375rem) {
    .beside {
      padding-block-start: 0;
    }
  }

  .name {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-control) / var(--sui-leading-flat)
      var(--sui-sans);
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }
</style>
