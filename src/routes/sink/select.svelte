<script module lang="ts">
  export const section = { title: 'Select', order: 40 };
</script>

<script lang="ts">
  import { Select } from '#lib';
  import Example from '../kit/Example.svelte';

  const regions = [
    { value: 'eu-west', label: 'Europe west' },
    { value: 'eu-central', label: 'Europe central' },
    { value: 'us-east', label: 'United States east' },
    { value: 'ap-south', label: 'Asia Pacific south', disabled: true }
  ];

  const plans = [
    { value: 'none', label: 'No plan' },
    {
      label: 'Monthly',
      options: [
        { value: 'team-month', label: 'Team', description: '10 seats' },
        { value: 'org-month', label: 'Organization', description: 'Unlimited seats' }
      ]
    },
    {
      label: 'Yearly',
      options: [
        { value: 'team-year', label: 'Team', description: '10 seats, two months free' },
        { value: 'org-year', label: 'Organization', description: 'Retired', disabled: true }
      ]
    }
  ];

  const branches = [
    { value: 'main', label: 'main' },
    {
      value: 'long',
      label: 'release/2026-10-platform-migration-with-a-name-that-keeps-going-past-the-edge'
    },
    { value: 'fix', label: 'fix/retry-webhook-delivery-when-the-receiver-times-out' }
  ];

  const retries = [1, 2, 3, 5, 8].map((count) => ({
    value: count,
    label: count === 1 ? '1 attempt' : `${count} attempts`
  }));

  let region = $state<string | null>('eu-central');
  let empty = $state<string | null>(null);
  let plan = $state<string | null>('team-year');
  let branch = $state<string | null>('long');
  let attempts = $state<number | null>(3);
</script>

<Example
  title="States"
  note="A chosen value, a placeholder before anything is chosen, and disabled"
>
  <div class="field">
    <label for="sink-select-region">Region</label>
    <Select id="sink-select-region" options={regions} bind:value={region} />
  </div>
  <div class="field">
    <label for="sink-select-empty">Region</label>
    <Select
      id="sink-select-empty"
      options={regions}
      bind:value={empty}
      placeholder="Choose a region"
    />
  </div>
  <div class="field">
    <label for="sink-select-disabled">Region</label>
    <Select id="sink-select-disabled" options={regions} value="eu-west" disabled />
  </div>
</Example>

<Example
  title="Open states"
  note="The open list drawn in place, with the chosen value checked and the next option active"
  layout="stack"
>
  <div class="field">
    <label for="sink-select-open-region">Region</label>
    <Select id="sink-select-open-region" options={regions} value="eu-central" preview />
  </div>
  <div class="field">
    <label for="sink-select-open-plan">Plan</label>
    <Select id="sink-select-open-plan" options={plans} value="team-month" preview />
  </div>
</Example>

<Example
  title="Groups and notes"
  note="Headed groups, a note after each label and an option that cannot be chosen"
>
  <div class="field">
    <label for="sink-select-plan">Plan</label>
    <Select id="sink-select-plan" options={plans} bind:value={plan} />
  </div>
  <span class="state">{plan ?? 'Nothing chosen'}</span>
</Example>

<Example title="Long labels" note="The trigger and the menu both cut a long label with an ellipsis">
  <div class="field narrow">
    <label for="sink-select-branch">Branch</label>
    <Select id="sink-select-branch" options={branches} bind:value={branch} />
  </div>
</Example>

<Example title="In a form" note="A name submits the value through a hidden input, numbers included">
  <form class="field" onsubmit={(event) => event.preventDefault()}>
    <label for="sink-select-attempts">Retries</label>
    <Select id="sink-select-attempts" name="attempts" options={retries} bind:value={attempts} />
  </form>
  <span class="state">attempts={attempts}</span>
</Example>

<style>
  .field {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
    min-inline-size: 0;
  }

  .narrow {
    inline-size: 14rem;
    max-inline-size: 100%;
  }

  label {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
