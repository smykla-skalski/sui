<script module lang="ts">
  export const section = {
    title: 'Textarea',
    order: 22,
    lead: 'The one multi-line field, for words a person writes, such as a reason or a note. A single line is a TextInput.',
    components: ['Textarea']
  };
</script>

<script lang="ts">
  import { Field, Textarea } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let note = $state('');
  let reason = $state('Rotated the deploy key after the contractor left the team');
  let config = $state('branches:\n  - main\n  - release/*');
</script>

<Example
  title="States"
  note="Rest, filled, technical text in mono, invalid and disabled with its reason, at control size"
  layout="grid"
>
  <Specimen label="Rest" code="placeholder">
    <Textarea aria-label="Note" placeholder="Add a note for the reviewers…" bind:value={note} />
  </Specimen>
  <Specimen label="Filled">
    <Textarea aria-label="Reason" bind:value={reason} />
  </Specimen>
  <Specimen label="Technical text" code={'mono rows={4}'}>
    <Textarea aria-label="Branch rules" mono rows={4} bind:value={config} />
  </Specimen>
  <Specimen label="Invalid" code="invalid">
    <Textarea aria-label="Summary" value="Fix the typo" invalid />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <div class="locked">
      <Textarea
        aria-label="Archived note"
        aria-describedby="sink-textarea-archived-reason"
        value="Archived with the old project"
        disabled
      />
      <p id="sink-textarea-archived-reason" class="reason">
        The project is archived, so its notes are read only
      </p>
    </div>
  </Specimen>
</Example>

<Example
  title="In a field"
  note="An error names what is wrong and the textarea is described by it"
  layout="grid"
>
  <Specimen label="With an error" code="control">
    <Field label="Why this exception" error="Say why in at least ten words">
      {#snippet control({ id, describedby, invalid })}
        <Textarea {id} aria-describedby={describedby} {invalid} value="Urgent" />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Long words wrap inside the box, and the reader can drag it taller but never wider"
  layout="stack"
>
  <Specimen label="Wrapped text" code={'rows={2}'}>
    <div class="narrow">
      <Textarea
        aria-label="Release notes"
        rows={2}
        value="Moves every repository under the new organization and keeps their branch rules"
      />
    </div>
  </Specimen>
</Example>

<style>
  .locked {
    display: grid;
    gap: var(--sui-row-copy-gap);
  }

  .reason {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
