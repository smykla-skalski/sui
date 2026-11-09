<script module lang="ts">
  export const section = {
    title: 'Choice Cards',
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
  <Specimen label="Chosen, with a disabled answer">
    <ChoiceCards
      label="How pull requests merge"
      hint="Turn on linear history in the branch rules to offer rebase"
      options={methods}
      bind:value={method}
    />
  </Specimen>
  <Specimen label="Required, still unanswered">
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
  <Specimen label="Locked while it saves">
    <ChoiceCards
      label="How pull requests merge"
      hint="Saving the merge method…"
      options={methods}
      value="merge"
      disabled
    />
  </Specimen>
</Example>

<div class="fill">
  <Example
    title="Narrow Width"
    --example-max="calc(16rem + 2 * var(--sui-space-6))"
    note="Below 2 columns of 14 rem the cards stack, and long sentences wrap"
    layout="stack"
  >
    <Specimen label="Stacked cards">
      <div class="narrow">
        <ChoiceCards label="How pull requests merge" options={methods} value="merge" />
      </div>
    </Specimen>
  </Example>
</div>

<style>
  .narrow {
    inline-size: min(100%, 16rem);
  }

  /* The narrow frame keeps the cards' 16rem and the stage's 24px pad on a wide page; on a
     phone it fills the column, as every other frame does (L-55). */
  @media (max-width: 47.9375rem) {
    .fill :global(.example) {
      --example-max: none;
    }
  }
</style>
