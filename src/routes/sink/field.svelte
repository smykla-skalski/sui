<script module lang="ts">
  export const section = {
    title: 'Field',
    lead: 'A label, its control and the help and error under it, for one value in a form. A group of choices names itself with a legend and needs no Field.',
    components: ['Field']
  };
</script>

<script lang="ts">
  import {
    Button,
    Checkbox,
    Combobox,
    DurationInput,
    Field,
    Section,
    Select,
    Textarea,
    TextInput
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let project = $state('');
  let owner = $state('smykla-skalski');
  let team = $state('Team with spaces');
  let repository = $state('');
  let reason = $state('');
  let region = $state('eu-west');
  let label = $state('triage');
  let timeout = $state(3456000);
  let notes = $state('');
  let notify = $state(true);
  let sync = $state(true);
  let protect = $state(false);
  let sent = $state('Nothing sent yet');

  const regions = [
    { value: 'eu-west', label: 'Europe west', description: 'Dublin' },
    { value: 'us-east', label: 'United States east', description: 'Virginia' }
  ];
  const labels = [
    { value: 'bug', label: 'bug' },
    { value: 'documentation', label: 'documentation' }
  ];

  function send(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    sent = `Sent ${data.get('repository')} for ${data.get('contact')}`;
  }
</script>

<Example
  title="States"
  --example-max="54rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="Rest, filled with a hint, required by a word beside its label, invalid with its error, read only and disabled with its reason"
  layout="grid"
  --specimen-min="21rem"
>
  <Specimen label="Rest">
    <Field label="Project name" placeholder="acme-web…" bind:value={project} />
  </Specimen>
  <Specimen label="Filled, with a hint">
    <Field
      label="Owner"
      hint="The organization or user that owns the repository"
      bind:value={owner}
    />
  </Specimen>
  <Specimen label="Required">
    <Field
      label="Repository name"
      spellcheck="false"
      autocapitalize="off"
      required
      placeholder="acme-web…"
      bind:value={repository}
    />
  </Specimen>
  <Specimen label="Invalid">
    <Field
      label="Team name"
      hint="Shown on every review request"
      error="Use letters, digits and dashes only"
      bind:value={team}
    />
  </Specimen>
  <Specimen label="Read only">
    <Field label="Repository ID" hint="Sent with every call to the API">
      {#snippet control({ id, describedby, invalid })}
        <TextInput
          {id}
          aria-describedby={describedby}
          {invalid}
          mono
          value="R_kgDOL8q2Zw"
          readonly
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled">
    <Field
      label="Default branch"
      spellcheck="false"
      autocapitalize="off"
      hint="Only an owner can rename the default branch"
      value="main"
      disabled
    />
  </Specimen>
</Example>

<Example
  title="Any Control"
  --example-max="54rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="The control snippet takes the id, the description ids and the invalid flag, so every input keeps one label, hint and error"
  layout="grid"
  --specimen-min="21rem"
>
  <Specimen label="Select">
    <Field label="Storage region" hint="Where the workspace keeps its data">
      {#snippet control({ id, describedby, invalid })}
        <Select
          {id}
          aria-describedby={describedby}
          {invalid}
          options={regions}
          bind:value={region}
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Combobox, invalid">
    <Field
      label="Default label"
      hint="Added to every new issue"
      error="Choose a label the repository has"
    >
      {#snippet control({ id, describedby, invalid })}
        <Combobox
          {id}
          aria-describedby={describedby}
          {invalid}
          free
          options={labels}
          bind:value={label}
          placeholder="bug…"
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Duration Input, invalid">
    <Field label="Review timeout" error="Enter a timeout of 30&nbsp;days or less">
      {#snippet control({ id, describedby, invalid })}
        <DurationInput {id} aria-describedby={describedby} {invalid} bind:value={timeout} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Textarea">
    <Field label="Reason" hint="Shown in the audit log next to the change">
      {#snippet control({ id, describedby, invalid })}
        <Textarea
          {id}
          aria-describedby={describedby}
          {invalid}
          placeholder="Moves the retry into the queue…"
          bind:value={reason}
        />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Label beside a Checkbox"
  --example-max="54rem"
  note="A row layout centres the label and a form’s checkbox on one line, and the label names the box"
  layout="grid"
  --specimen-min="21rem"
>
  <Specimen label="Checked">
    <Field label="Sync on every push" layout="row" hint="Runs within a minute of each push">
      {#snippet control({ id, describedby, invalid })}
        <Checkbox {id} aria-describedby={describedby} {invalid} bare bind:checked={sync} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Invalid">
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
  title="Refused Send"
  --example-max="54rem"
  note="A refused send shows each field’s own error in place of the browser’s bubble and focuses the first field to fix"
  layout="grid"
  --specimen-min="21rem"
>
  <Specimen label={sent}>
    <form class="form" onsubmit={send}>
      <Field
        label="Repository name"
        spellcheck="false"
        autocapitalize="off"
        name="repository"
        required
        pattern="[a-z0-9\-]+"
        validationMessage="Enter a name of lowercase letters, digits and dashes"
        placeholder="acme-web…"
      />
      <Field
        label="Contact email"
        name="contact"
        type="email"
        autocomplete="email"
        required
        validationMessage="Enter an email address such as you@example.com"
        placeholder="jane@example.com…"
      />
      <Button type="submit" tone="signal">Create the Repository</Button>
    </form>
  </Specimen>
  <Specimen label="Refused, both left empty">
    <div class="form">
      <Field
        label="Repository name"
        spellcheck="false"
        autocapitalize="off"
        required
        error="Enter a name of lowercase letters, digits and dashes"
        placeholder="acme-web…"
      />
      <Field
        label="Contact email"
        type="email"
        autocomplete="email"
        required
        error="Enter an email address such as you@example.com"
        placeholder="jane@example.com…"
      />
    </div>
  </Specimen>
</Example>

<Example
  title="In Context"
  --example-max="35rem"
  note="Fields stack 16 px apart, and every control in the form keeps one label, hint and error"
  layout="grid"
  --specimen-min="21rem"
  ground="canvas"
>
  <Section title="New Repository" level={4}>
    <div class="form">
      <Field
        label="Repository name"
        spellcheck="false"
        autocapitalize="off"
        required
        placeholder="acme-web…"
      />
      <Field
        label="Contact email"
        type="email"
        autocomplete="email"
        required
        placeholder="jane@example.com…"
      />
      <Field label="Setup notes" hint="Shown to the reviewers of the first pull request">
        {#snippet control({ id, describedby, invalid })}
          <Textarea {id} aria-describedby={describedby} {invalid} bind:value={notes} />
        {/snippet}
      </Field>
      <Field label="Email me about failed syncs" layout="row">
        {#snippet control({ id, describedby, invalid })}
          <Checkbox {id} aria-describedby={describedby} {invalid} bare bind:checked={notify} />
        {/snippet}
      </Field>
      <div><Button tone="signal">Create the Repository</Button></div>
    </div>
  </Section>
</Example>

<Example
  title="Narrow Width"
  --example-max="calc(16rem + 2 * var(--sui-space-6) + 2 * var(--sui-stroke))"
  note="Long labels, hints and errors wrap at one 20 px leading"
  layout="stack"
>
  <Specimen label="Wrapped label, hint & error">
    <div class="narrow">
      <Field
        label="The address that hears about every scheduled sync that fails on any repository"
        hint="1 address only, and it can be a shared team inbox that several people read"
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
