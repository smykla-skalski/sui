<script module lang="ts">
  export const section = {
    title: 'Textarea',
    lead: 'The one multi-line field, for words a person writes, such as a reason or a note. A single line is a TextInput.',
    components: ['Textarea']
  };
</script>

<script lang="ts">
  import { Field, Textarea } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let note = $state('');
  let draft = $state('');
  let reason = $state('Rotated the deploy key after the contractor left the team');
  let config = $state('branches:\n  - main\n  - release/*');
</script>

<Example
  title="States"
  --example-max="54rem"
  note="Rest, filled, technical text in mono, invalid, read only and disabled with its reason, at control size"
  layout="grid"
>
  <Specimen label="Rest">
    <Textarea
      aria-label="Note for the reviewers"
      placeholder="Ask for a second look at the migration…"
      bind:value={note}
    />
  </Specimen>
  <Specimen label="Filled">
    <Textarea aria-label="Reason" bind:value={reason} />
  </Specimen>
  <Specimen label="Technical text">
    <Textarea aria-label="Branch rules" mono bind:value={config} />
  </Specimen>
  <Specimen label="Invalid">
    <Textarea aria-label="Summary" value="Fix the typo" invalid />
  </Specimen>
  <Specimen label="Read only">
    <Textarea aria-label="Audit entry" value="Approved by the release owner" readonly />
  </Specimen>
  <Specimen label="Disabled">
    <div class="locked">
      <Textarea
        aria-label="Archived note"
        aria-describedby="sink-textarea-archived-reason"
        value="Archived with the old project"
        disabled
      />
      <p id="sink-textarea-archived-reason" class="reason">The archived project locks its notes</p>
    </div>
  </Specimen>
</Example>

<Example
  title="In a Field"
  --example-max="54rem"
  note="The label names the textarea, and its hint or error describes it"
  layout="pairs"
>
  <Specimen label="With a hint">
    <Field label="Note for the reviewers" hint="Shown above the diff in the review">
      {#snippet control({ id, describedby })}
        <Textarea
          {id}
          aria-describedby={describedby}
          placeholder="Ask for a second look at the migration…"
          bind:value={draft}
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="With an error">
    <Field label="Why this exception" error="Say why in at least 10 words">
      {#snippet control({ id, describedby, invalid })}
        <Textarea {id} aria-describedby={describedby} {invalid} value="Urgent" />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<div class="fill">
  <Example
    title="Narrow Width"
    --example-max="calc(16rem + 2 * var(--sui-space-6))"
    note="Long words wrap inside the box, and the reader can drag it taller but never wider"
    layout="stack"
  >
    <Specimen label="Wrapped text">
      <div class="narrow">
        <Textarea
          aria-label="Release notes"
          value="Moves every repository under the new organization and keeps their branch rules"
        />
      </div>
    </Specimen>
  </Example>
</div>

<style>
  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  .reason {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }

  /* The narrow frame keeps the field's 16rem and the stage's 24px pad on a wide page; on a
     phone it fills the column, as every other frame does (L-55). */
  @media (max-width: 47.9375rem) {
    .fill :global(.example) {
      --example-max: none;
    }
  }
</style>
