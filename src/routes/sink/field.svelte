<script module lang="ts">
  export const section = {
    title: 'Field',
    lead: 'A label, its control and the help and error under it, for one value in a form. A group of choices names itself with a legend and needs no Field.',
    components: ['Field']
  };
</script>

<script lang="ts">
  import { Button, Checkbox, Field, Section, Textarea } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let project = $state('');
  let owner = $state('smykla-skalski');
  let team = $state('Team with spaces');
  let repository = $state('');
  let summary = $state('');
  let reason = $state('');
  let sync = $state(true);
  let protect = $state(false);
  let sent = $state('Nothing sent yet');

  function send(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    sent = `Sent ${data.get('repository')} for ${data.get('contact')}`;
  }
</script>

<Example
  title="States"
  note="Rest, filled with a hint, invalid with its error and disabled with its reason"
  layout="grid"
>
  <Specimen label="Rest" code="placeholder">
    <Field label="Project name" placeholder="your-project" bind:value={project} />
  </Specimen>
  <Specimen label="Filled, with a hint" code="hint">
    <Field
      label="Owner"
      hint="The organization or user that owns the repository"
      bind:value={owner}
    />
  </Specimen>
  <Specimen label="Invalid" code="error">
    <Field
      label="Team name"
      hint="Shown on every review request"
      error="Use letters, digits and dashes only"
      bind:value={team}
    />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <Field
      label="Default branch"
      hint="Only an owner can rename the default branch"
      value="main"
      disabled
    />
  </Specimen>
</Example>

<Example
  title="Required"
  note="A required field says so in a word beside its label, and an optional one says nothing"
  layout="grid"
>
  <Specimen label="Required" code="required">
    <Field label="Repository name" required placeholder="your-project" bind:value={repository} />
  </Specimen>
  <Specimen label="Optional">
    <Field label="Description" hint="Shown under the name in every list" bind:value={summary} />
  </Specimen>
</Example>

<Example
  title="Any control"
  note="The control snippet takes the id, the description ids and the invalid flag"
  layout="grid"
>
  <Specimen label="Textarea" code="control">
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
  </Specimen>
</Example>

<Example
  title="Label beside a checkbox"
  note="A row layout centres the label and a form's checkbox on one line, and the label names the box"
  layout="grid"
>
  <Specimen label="Checked" code={'layout="row"'}>
    <Field label="Sync on every push" layout="row" hint="Runs within a minute of each push">
      {#snippet control({ id, describedby, invalid })}
        <Checkbox {id} aria-describedby={describedby} {invalid} bare bind:checked={sync} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Invalid" code={'layout="row" error'}>
    <Field
      label="Protect the default branch"
      layout="row"
      error="The default branch must stay protected while reviews are required"
    >
      {#snippet control({ id, describedby, invalid })}
        <Checkbox {id} aria-describedby={describedby} {invalid} bare bind:checked={protect} />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Refused send"
  note="A refused send shows each field's own error in place of the browser's bubble and focuses the first field to fix"
  layout="grid"
>
  <Specimen label={sent} code="required pattern validationMessage">
    <form class="form" onsubmit={send}>
      <Field
        label="Repository name"
        name="repository"
        required
        pattern="[a-z0-9\-]+"
        validationMessage="Enter a name of lowercase letters, digits and dashes"
        placeholder="your-project"
      />
      <Field
        label="Contact email"
        name="contact"
        type="email"
        required
        validationMessage="Enter an email address such as you@example.com"
        placeholder="you@example.com"
      />
      <Button type="submit">Create the repository</Button>
    </form>
  </Specimen>
</Example>

<Example
  title="In context"
  note="Fields stack 16px apart, and a focused field's own border becomes the ring, so nothing around it clips it"
  layout="grid"
  ground="canvas"
>
  <Section title="New repository" level={4}>
    <div class="form">
      <Field label="Repository name" required placeholder="your-project" />
      <Field label="Contact email" type="email" required placeholder="you@example.com" />
    </div>
  </Section>
</Example>

<Example
  title="Narrow width"
  note="Long labels, hints and errors wrap and keep the same 8px gap between lines"
  layout="stack"
>
  <Specimen label="Wrapped label, hint and error">
    <div class="narrow">
      <Field
        label="The address that hears about every scheduled sync that fails on any repository"
        hint="One address only, and it can be a shared team inbox that several people read"
        error="This address bounced the last message, so check it before you save"
        value="alerts@example"
      />
    </div>
  </Specimen>
</Example>

<style>
  .form {
    display: grid;
    gap: var(--sui-space-4);
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }
</style>
