<script module lang="ts">
  export const section = { title: 'Select', order: 40 };
</script>

<script lang="ts">
  import { Button, Field, Select } from '#lib';
  import Example from '../kit/Example.svelte';

  const regions = [
    { value: 'eu-west', label: 'Europe west', description: 'Dublin' },
    { value: 'eu-central', label: 'Europe central', description: 'Frankfurt' },
    { value: 'eu-north', label: 'Europe north', description: 'Stockholm' },
    { value: 'us-east', label: 'United States east', description: 'Virginia' },
    { value: 'us-west', label: 'United States west', description: 'Oregon' },
    { value: 'ca-central', label: 'Canada central', description: 'Montréal' },
    { value: 'sa-east', label: 'South America east', description: 'São Paulo' },
    { value: 'ap-south', label: 'Asia Pacific south', description: 'At capacity', disabled: true },
    { value: 'ap-northeast', label: 'Asia Pacific northeast', description: 'Tokyo' },
    { value: 'ap-southeast', label: 'Asia Pacific southeast', description: 'Sydney' }
  ];

  const plans = [
    { value: 'none', label: 'No plan' },
    {
      label: 'Monthly',
      options: [
        { value: 'starter-month', label: 'Starter', description: '3 seats' },
        { value: 'team-month', label: 'Team', description: '10 seats' },
        { value: 'org-month', label: 'Organization', description: 'Unlimited seats' }
      ]
    },
    {
      label: 'Yearly',
      options: [
        { value: 'starter-year', label: 'Starter', description: '3 seats, one month free' },
        { value: 'team-year', label: 'Team', description: '10 seats, two months free' },
        { value: 'org-year', label: 'Organization', description: 'Retired', disabled: true }
      ]
    }
  ];

  const branches = [
    'main',
    'develop',
    'release/2026-10-platform-migration-with-a-name-that-keeps-going-past-the-edge',
    'release/2026-09',
    'fix/retry-webhook-delivery-when-the-receiver-times-out',
    'fix/rate-limit-headers',
    'feat/audit-log-export',
    'feat/single-sign-on-for-organizations',
    'chore/update-dependencies',
    'docs/rewrite-the-onboarding-guide'
  ].map((name) => ({ value: name, label: name }));

  const zones = [
    { value: 'UTC', label: 'Coordinated universal time', description: 'UTC' },
    { value: 'Europe/London', label: 'London', description: 'Europe/London' },
    { value: 'Europe/Warsaw', label: 'Warsaw', description: 'Europe/Warsaw' },
    { value: 'America/New_York', label: 'New York', description: 'America/New_York' },
    { value: 'America/Los_Angeles', label: 'Los Angeles', description: 'America/Los_Angeles' },
    { value: 'America/Sao_Paulo', label: 'São Paulo', description: 'America/Sao_Paulo' },
    { value: 'Asia/Kolkata', label: 'Kolkata', description: 'Asia/Kolkata' },
    { value: 'Asia/Singapore', label: 'Singapore', description: 'Asia/Singapore' },
    { value: 'Asia/Tokyo', label: 'Tokyo', description: 'Asia/Tokyo' },
    { value: 'Australia/Sydney', label: 'Sydney', description: 'Australia/Sydney' }
  ];

  const retries = [0, 1, 2, 3, 5, 8, 13].map((count) => ({
    value: count,
    label: count === 1 ? '1 attempt' : `${count} attempts`
  }));

  let region = $state<string | null>('eu-central');
  let empty = $state<string | null>(null);
  let plan = $state<string | null>('team-year');
  let branch = $state<string | null>(branches[2].value);
  let zone = $state<string | null>(null);
  let attempts = $state<number | null>(3);
  let sent = $state('Nothing sent yet');

  function send(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    sent = `zone=${data.get('zone')} attempts=${data.get('attempts')}`;
  }
</script>

<Example
  title="States"
  note="A chosen value, a placeholder before anything is chosen, and disabled with its reason under it"
>
  <Field label="Region">
    {#snippet control({ id, describedby })}
      <Select {id} aria-describedby={describedby} options={regions} bind:value={region} />
    {/snippet}
  </Field>
  <Field label="Backup region">
    {#snippet control({ id, describedby })}
      <Select
        {id}
        aria-describedby={describedby}
        options={regions}
        bind:value={empty}
        placeholder="Choose a region"
      />
    {/snippet}
  </Field>
  <Field label="Home region" hint="Fixed once the workspace holds data">
    {#snippet control({ id, describedby })}
      <Select {id} aria-describedby={describedby} options={regions} value="eu-west" disabled />
    {/snippet}
  </Field>
</Example>

<Example
  title="Open states"
  note="A static copy of the open picker under each field, with the value checked and the next option active"
  layout="stack"
>
  <Field label="Region">
    {#snippet control({ id, describedby })}
      <Select {id} aria-describedby={describedby} options={regions} value="eu-central" preview />
    {/snippet}
  </Field>
  <Field label="Plan">
    {#snippet control({ id, describedby })}
      <Select {id} aria-describedby={describedby} options={plans} value="team-month" preview />
    {/snippet}
  </Field>
</Example>

<Example
  title="Groups and notes"
  note="Headed groups, a note after each label in the picker only, and a retired plan that cannot be chosen"
>
  <Field label="Plan">
    {#snippet control({ id, describedby })}
      <Select {id} aria-describedby={describedby} options={plans} bind:value={plan} />
    {/snippet}
  </Field>
  <span class="state">plan={plan ?? 'null'}</span>
</Example>

<Example
  title="Long labels"
  note="The closed field cuts a long branch with an ellipsis, and the picker wraps it in full"
>
  <div class="narrow">
    <Field label="Branch">
      {#snippet control({ id, describedby })}
        <Select {id} aria-describedby={describedby} options={branches} bind:value={branch} />
      {/snippet}
    </Field>
  </div>
</Example>

<Example
  title="In a form"
  note="Native validation stops a send without a time zone, and the values submit by name, numbers included"
>
  <form class="form" onsubmit={send}>
    <Field label="Report time zone" hint="Reports run at midnight in this zone" required>
      {#snippet control({ id, describedby, required })}
        <Select
          {id}
          aria-describedby={describedby}
          name="zone"
          {required}
          options={zones}
          bind:value={zone}
          placeholder="Choose a time zone"
        />
      {/snippet}
    </Field>
    <Field label="Retries">
      {#snippet control({ id, describedby })}
        <Select
          {id}
          aria-describedby={describedby}
          name="attempts"
          options={retries}
          bind:value={attempts}
        />
      {/snippet}
    </Field>
    <Button type="submit">Save the report</Button>
  </form>
  <span class="state">{sent}</span>
</Example>

<style>
  .narrow {
    inline-size: 14rem;
    max-inline-size: 100%;
  }

  .form {
    display: grid;
    gap: var(--sui-space-4);
    justify-items: start;
    min-inline-size: 0;
  }

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
