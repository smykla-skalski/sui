<script module lang="ts">
  export const section = {
    title: 'Choice cards',
    lead: 'One answer to one question, where every answer needs a sentence to say what it does. Answers that a word names are a SegmentedControl.',
    components: ['ChoiceCards']
  };
</script>

<script lang="ts">
  import { ChoiceCards } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
      description: 'Needs linear history, then replays each commit on top of the base branch',
      disabled: true
    }
  ];

  let method = $state<string | null>('squash');
  let pending = $state<string | null>(null);
</script>

<Example
  title="States"
  note="A chosen answer, a disabled one the keyboard skips, a required answer still missing and a group locked while it saves"
  layout="stack"
>
  <Specimen label="Chosen, with a disabled answer" code="bind:value">
    <ChoiceCards
      label="How pull requests merge"
      hint="Turn on linear history in the branch rules to offer rebase"
      options={methods}
      bind:value={method}
    />
  </Specimen>
  <Specimen label="Required, still unanswered" code="required error">
    <ChoiceCards
      label="Who can approve"
      required
      options={[
        {
          value: 'owners',
          label: 'Owners only',
          description: 'Only people who own the repository'
        },
        {
          value: 'members',
          label: 'Any member',
          description: 'Anybody in the organization with write access'
        }
      ]}
      error="Choose who can approve before you save"
      bind:value={pending}
    />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <ChoiceCards
      label="How pull requests merge"
      hint="Saving the merge method…"
      options={methods}
      value="merge"
      disabled
    />
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Below two 14rem columns the cards stack, and long sentences wrap"
  layout="stack"
>
  <Specimen label="Stacked cards">
    <div class="narrow">
      <ChoiceCards label="How pull requests merge" options={methods} value="merge" />
    </div>
  </Specimen>
</Example>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
