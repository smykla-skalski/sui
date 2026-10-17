<script module lang="ts">
  export const section = { title: 'Textarea', order: 22 };
</script>

<script lang="ts">
  import { Field, Textarea } from '#lib';
  import Example from '../kit/Example.svelte';

  let note = $state('');
  let reason = $state('Rotated the deploy key after the contractor left the team');
  let config = $state('branches:\n  - main\n  - release/*');
</script>

<Example
  title="States"
  note="Rest, filled, technical text in mono, invalid and disabled with its reason, at control size"
  layout="stack"
>
  <div class="column">
    <Textarea aria-label="Note" placeholder="Add a note for the reviewers…" bind:value={note} />
    <Textarea aria-label="Reason" bind:value={reason} />
    <Textarea aria-label="Branch rules" mono rows={4} bind:value={config} />
    <Textarea aria-label="Summary" value="Fix the typo" invalid />
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
  </div>
</Example>

<Example
  title="In a field"
  note="An error names what is wrong and the textarea is described by it"
  layout="stack"
>
  <div class="column">
    <Field label="Why this exception" error="Say why in at least ten words">
      {#snippet control({ id, describedby, invalid })}
        <Textarea {id} aria-describedby={describedby} {invalid} value="Urgent" />
      {/snippet}
    </Field>
  </div>
</Example>

<Example
  title="Narrow width"
  note="Long words wrap inside the box, and the reader can drag it taller but never wider"
  layout="stack"
>
  <div class="column narrow">
    <Textarea
      aria-label="Release notes"
      rows={2}
      value="Moves every repository under the new organization and keeps their branch rules"
    />
  </div>
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

  .column {
    display: grid;
    gap: var(--sui-space-4);
    inline-size: min(100%, 24rem);
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
