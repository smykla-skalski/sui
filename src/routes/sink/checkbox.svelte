<script module lang="ts">
  export const section = {
    title: 'Checkbox and check list',
    order: 25,
    lead: 'A visible box for a multi-choice, a consent or a value that a later save writes. A boolean that takes effect at once is a Switch.',
    components: ['Checkbox', 'CheckList']
  };
</script>

<script lang="ts">
  import { CheckList, Checkbox } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
  import Variants from '../kit/Variants.svelte';

  const states = ['enabled', 'disabled'] as const;
  const values = ['Unchecked', 'Checked', 'Partly chosen'] as const;

  const events = [
    { value: 'push', label: 'Push' },
    { value: 'pull-request', label: 'Pull request' },
    { value: 'release', label: 'Release' },
    { value: 'tag', label: 'Tag (needs app 2.4)', disabled: true }
  ];

  const kinds = [
    { value: 'bug', label: 'Bug' },
    { value: 'docs', label: 'Documentation' },
    { value: 'chore', label: 'Chore' },
    { value: 'security', label: 'Security (owners only)', disabled: true }
  ];

  const scopes = [
    {
      value: 'read',
      label: 'Read repositories',
      description: 'Lists the repositories and reads their settings'
    },
    {
      value: 'write',
      label: 'Change settings',
      description: 'Updates branch rules, labels and webhooks on your behalf'
    },
    {
      value: 'admin',
      label: 'Manage members',
      description: 'Invites and removes people, and only an owner can grant it',
      disabled: true
    }
  ];

  let labels = $state(['bug']);
  let granted = $state(['read']);
  let terms = $state<string[]>([]);
  let chosen = $state(['push']);
  const available = events.filter((option) => !option.disabled).map((option) => option.value);
  const all = $derived(available.every((value) => chosen.includes(value)));
  const some = $derived(chosen.length > 0 && !all);
</script>

<Example
  title="States"
  note="Unchecked, checked and partly chosen, each enabled and disabled, and a locked box says why"
>
  <Variants
    rows={states}
    columns={values}
    rowLabel={(state) => (state === 'disabled' ? 'disabled' : 'disabled={false}')}
  >
    {#snippet cell(state, value)}
      <Checkbox
        label="Delete the branch after merge"
        description={state === 'disabled' ? 'Only an owner can change it' : undefined}
        checked={value === 'Checked'}
        indeterminate={value === 'Partly chosen'}
        disabled={state === 'disabled'}
      />
    {/snippet}
  </Variants>
</Example>

<Example
  title="Check list"
  note="Short labels run along one line, and once any option has a description each takes its own line"
>
  <Specimen label="Short labels" code="options">
    <CheckList label="Labels on the pull request" options={kinds} bind:value={labels} />
  </Specimen>
  <Specimen label="With descriptions" code="description">
    <CheckList label="Permissions" options={scopes} bind:value={granted} />
  </Specimen>
</Example>

<Example title="Invalid" note="An error under the group names what is missing" layout="stack">
  <Specimen label="Invalid" code="error">
    <CheckList
      label="Agreement"
      options={[{ value: 'terms', label: 'I accept the terms of service' }]}
      error="Accept the terms to continue"
      bind:value={terms}
    />
  </Specimen>
</Example>

<Example
  title="In context"
  note="A parent box shows a partial choice of the list under it, and a press chooses all or none"
  layout="stack"
>
  <div class="bleed">
    <Checkbox
      label="Every available event"
      checked={all}
      indeterminate={some}
      onchange={(event) => (chosen = event.currentTarget.checked ? available : [])}
    />
  </div>
  <CheckList label="Events that start a sync" options={events} bind:value={chosen} />
</Example>

<Example
  title="Narrow width"
  note="Long labels wrap and the box stays on the first line"
  layout="stack"
>
  <Specimen label="Wrapped labels">
    <div class="narrow">
      <CheckList
        label="When a sync fails on the default branch"
        options={[
          { value: 'mail', label: 'Send an email to every owner of the repository' },
          {
            value: 'pause',
            label: 'Pause the schedule',
            description: 'Nothing else runs until a person resumes it from the settings page'
          }
        ]}
        value={['mail']}
      />
    </div>
  </Specimen>
</Example>

<style>
  /* A lone box's hover ground bleeds into the margin, as a check list's does, so its box
     lines up with the legend under it. */
  .bleed {
    margin-inline-start: calc(-1 * var(--sui-space-2));
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
