<script module lang="ts">
  export const section = { title: 'Checkbox and check list', order: 25 };
</script>

<script lang="ts">
  import { CheckList, Checkbox } from '#lib';
  import Example from '../kit/Example.svelte';

  const events = [
    { value: 'push', label: 'Push' },
    { value: 'pull-request', label: 'Pull request' },
    { value: 'release', label: 'Release' },
    { value: 'tag', label: 'Tag (needs app 2.4)', disabled: true }
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

  let chosen = $state(['push']);
  let granted = $state(['read']);
  let terms = $state<string[]>([]);
  const available = events.filter((option) => !option.disabled).map((option) => option.value);
  const all = $derived(available.every((value) => chosen.includes(value)));
  const some = $derived(chosen.length > 0 && !all);
</script>

<Example
  title="States"
  note="The states alone: unchecked, checked, partly chosen and disabled, each with its label"
>
  <div class="line">
    <Checkbox label="Unchecked" />
    <Checkbox label="Checked" checked />
    <Checkbox label="Partly chosen" indeterminate />
    <Checkbox label="Disabled" disabled />
    <Checkbox label="Disabled and checked" checked disabled />
  </div>
</Example>

<Example
  title="Check list"
  note="Short labels run along one line, and the parent box shows a partial choice"
  layout="stack"
>
  <Checkbox
    label="Every available event"
    checked={all}
    indeterminate={some}
    onchange={(event) => (chosen = event.currentTarget.checked ? available : [])}
  />
  <CheckList label="Events that start a sync" options={events} bind:value={chosen} />
</Example>

<Example
  title="With descriptions"
  note="Each option takes its own line, and the description is read after the label"
  layout="stack"
>
  <CheckList label="Permissions" options={scopes} bind:value={granted} />
</Example>

<Example title="Invalid" note="An error under the group names what is missing" layout="stack">
  <CheckList
    label="Agreement"
    options={[{ value: 'terms', label: 'I accept the terms of service' }]}
    error="Accept the terms to continue"
    bind:value={terms}
  />
</Example>

<Example
  title="Narrow width"
  note="Long labels wrap and the box stays on the first line"
  layout="stack"
>
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
</Example>

<style>
  .line {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-1) var(--sui-space-3);
    margin-inline-start: calc(-1 * var(--sui-space-2));
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
