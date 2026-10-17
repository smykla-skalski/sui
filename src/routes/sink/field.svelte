<script module lang="ts">
  export const section = { title: 'Field', order: 21 };
</script>

<script lang="ts">
  import { Checkbox, Field, Textarea } from '#lib';
  import Example from '../kit/Example.svelte';

  let project = $state('');
  let owner = $state('smykla-skalski');
  let team = $state('Team with spaces');
  let reason = $state('');
  let repository = $state('');
  let summary = $state('');
  let sync = $state(true);
  let protect = $state(false);
</script>

<Example
  title="States"
  note="Rest, filled, invalid with its error and disabled, 16px apart with 8px inside each field"
  layout="stack"
>
  <div class="form">
    <Field label="Project name" placeholder="your-project" bind:value={project} />
    <Field
      label="Owner"
      hint="The organization or user that owns the repository"
      bind:value={owner}
    />
    <Field
      label="Team name"
      hint="Shown on every review request"
      error="Use letters, digits and dashes only"
      bind:value={team}
    />
    <Field
      label="Default branch"
      hint="Only an owner can rename the default branch"
      value="main"
      disabled
    />
  </div>
</Example>

<Example
  title="Required"
  note="A required field says so in a word beside its label, and an optional one says nothing"
  layout="stack"
>
  <div class="form">
    <Field label="Repository name" required placeholder="your-project" bind:value={repository} />
    <Field label="Description" hint="Shown under the name in every list" bind:value={summary} />
  </div>
</Example>

<Example
  title="Keyboard focus"
  note="Tab into a field and its own border becomes the ring, so a card never clips it"
  layout="stack"
>
  <div class="form">
    <Field label="Contact email" type="email" required placeholder="you@example.com" />
  </div>
</Example>

<Example
  title="Any control"
  note="The control snippet takes the id, the description ids and the invalid flag"
  layout="stack"
>
  <div class="form">
    <Field label="Reason" hint="Shown in the audit log next to the change">
      {#snippet control({ id, describedby, invalid })}
        <Textarea
          {id}
          aria-describedby={describedby}
          {invalid}
          placeholder="Explain the change…"
          bind:value={reason}
        />
      {/snippet}
    </Field>
  </div>
</Example>

<Example
  title="Label beside a checkbox"
  note="A row layout centres the label and a form's checkbox on one line, and the label names the box"
  layout="stack"
>
  <div class="form">
    <Field label="Sync on every push" layout="row" hint="Runs within a minute of each push">
      {#snippet control({ id, describedby, invalid })}
        <Checkbox {id} aria-describedby={describedby} {invalid} bare bind:checked={sync} />
      {/snippet}
    </Field>
    <Field
      label="Protect the default branch"
      layout="row"
      error="The default branch must stay protected while reviews are required"
    >
      {#snippet control({ id, describedby, invalid })}
        <Checkbox {id} aria-describedby={describedby} {invalid} bare bind:checked={protect} />
      {/snippet}
    </Field>
  </div>
</Example>

<Example
  title="Narrow width"
  note="Long labels, hints and errors wrap and keep the same 8px gap between lines"
  layout="stack"
>
  <div class="form narrow">
    <Field
      label="The address that hears about every scheduled sync that fails on any repository"
      hint="One address only, and it can be a shared team inbox that several people read"
      error="This address bounced the last message, so check it before you save"
      value="alerts@example"
    />
  </div>
</Example>

<style>
  .form {
    display: grid;
    gap: var(--sui-space-4);
    inline-size: min(100%, 24rem);
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
