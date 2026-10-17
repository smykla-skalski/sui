<script module lang="ts">
  export const section = { title: 'Segmented control', order: 27 };
</script>

<script lang="ts">
  import { SegmentedControl } from '#lib';
  import Example from '../kit/Example.svelte';

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

<Example title="Options" note="Two to five options, with a thumb exactly as wide as the chosen one">
  <SegmentedControl label="Time range" options={range} bind:value={span} />
  <SegmentedControl label="People" options={people} bind:value={tab} />
  <div class="with-reason">
    <SegmentedControl
      label="Log level"
      options={levels}
      bind:value={level}
      aria-describedby="sink-segmented-debug"
    />
    <p id="sink-segmented-debug" class="reason">Debug needs a support plan</p>
  </div>
</Example>

<Example
  title="Nothing chosen"
  note="A null value draws no thumb, which says the value is inherited and not chosen here"
>
  <SegmentedControl label="Time range override" options={range} bind:value={inherited} />
</Example>

<Example
  title="Disabled"
  note="A disabled option stays visible and the arrow keys skip it, and the whole control can be disabled"
>
  <div class="with-reason">
    <SegmentedControl
      label="Log level while saving"
      options={levels}
      value="errors"
      disabled
      aria-describedby="sink-segmented-saving"
    />
    <p id="sink-segmented-saving" class="reason">Locked until the save finishes</p>
  </div>
</Example>

<Example title="Taller tier" note="A surface opts into 40px through one custom property">
  <div class="tall">
    <SegmentedControl label="Time range on the tall tier" options={range} value="month" />
  </div>
</Example>

<Example
  title="Narrow width"
  note="Short of room, the same choice becomes a native select, with icons dropped and counts in brackets"
  layout="stack"
>
  <div class="narrow">
    <SegmentedControl label="Log level in a narrow pane" options={levels} bind:value={narrow} />
  </div>
  <div class="narrow">
    <SegmentedControl label="People in a narrow pane" options={people} bind:value={narrowPeople} />
  </div>
</Example>

<style>
  .tall {
    --sui-local-control-height: var(--sui-control-height);
  }

  .narrow {
    display: flex;
    inline-size: min(100%, 12rem);
  }

  .with-reason {
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
