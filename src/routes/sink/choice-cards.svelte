<script module lang="ts">
  export const section = { title: 'Choice cards', order: 26 };
</script>

<script lang="ts">
  import { ChoiceCards } from '#lib';
  import Example from '../kit/Example.svelte';

  const methods = [
    {
      value: 'merge',
      label: 'Merge commit',
      description: 'Keeps every commit and adds one that joins the branches'
    },
    {
      value: 'squash',
      label: 'Squash',
      description: 'Folds the branch into one commit with the pull request title'
    },
    {
      value: 'rebase',
      label: 'Rebase',
      description: 'Replays each commit on top of the base branch, one by one',
      disabled: true
    }
  ];

  let method = $state<string | null>('squash');
  let pending = $state<string | null>(null);
</script>

<Example
  title="States"
  note="Chosen, resting and a disabled answer that stays visible while the keyboard skips it"
  layout="stack"
>
  <ChoiceCards
    label="How pull requests merge"
    hint="Rebase needs linear history on the base branch"
    options={methods}
    bind:value={method}
  />
</Example>

<Example
  title="Invalid"
  note="Nothing is chosen yet, and the error under the group says so"
  layout="stack"
>
  <ChoiceCards
    label="Who can approve"
    options={[
      { value: 'owners', label: 'Owners only', description: 'Only people who own the repository' },
      {
        value: 'members',
        label: 'Any member',
        description: 'Anybody in the organization with write access'
      }
    ]}
    error="Choose who can approve before you save"
    bind:value={pending}
  />
</Example>

<Example title="Disabled" note="The whole group is disabled while the change saves" layout="stack">
  <ChoiceCards label="How pull requests merge" options={methods} value="merge" disabled />
</Example>

<Example
  title="Narrow width"
  note="Below two 14rem columns the cards stack, and long sentences wrap"
  layout="stack"
>
  <div class="narrow">
    <ChoiceCards label="How pull requests merge" options={methods} value="merge" />
  </div>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
