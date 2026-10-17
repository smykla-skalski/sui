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
  note="Rest, filled, technical text in mono, invalid and disabled, in the interface face at control size"
  layout="stack"
>
  <div class="column">
    <Textarea aria-label="Note" placeholder="Add a note for the reviewers…" bind:value={note} />
    <Textarea aria-label="Reason" bind:value={reason} />
    <Textarea aria-label="Branch rules" mono rows={4} bind:value={config} />
    <Textarea aria-label="Summary" value="Fix the typo" invalid />
    <Textarea aria-label="Archived note" value="Archived with the old project" disabled />
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
  .column {
    display: grid;
    gap: var(--sui-space-4);
    inline-size: min(100%, 24rem);
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
