<script module lang="ts">
  export const section = {
    title: 'Combobox',
    order: 42,
    lead: 'A text field that suggests values as the reader types and commits one. A list short enough to read whole is a Select.',
    components: ['Combobox']
  };
</script>

<script lang="ts">
  import { Button, Combobox, Field } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const languages = [
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ts', label: 'TypeScript', description: 'Typed JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rb', label: 'Ruby', description: 'Retired', disabled: true },
    { value: 'kt', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' }
  ];

  const labels = [
    { value: 'bug', label: 'bug' },
    { value: 'documentation', label: 'documentation' },
    { value: 'good first issue', label: 'good first issue' }
  ];

  const accounts = [
    { value: 'octocat', label: 'octocat', description: 'The Octocat' },
    { value: 'hubot', label: 'hubot', description: 'Hubot' },
    { value: 'renovate-bot', label: 'renovate-bot', description: 'Renovate' },
    { value: 'dependabot', label: 'dependabot', description: 'Dependabot' }
  ];

  function findAccounts(query: string): Promise<typeof accounts> {
    const needle = query.toLowerCase();
    return new Promise((resolve) =>
      setTimeout(() => resolve(accounts.filter((account) => account.value.includes(needle))), 300)
    );
  }

  /* The directory never answers, so the refused state shows on the first letters typed. */
  function offline(): Promise<typeof accounts> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('The directory is offline')), 300)
    );
  }

  let language = $state('ts');
  let label = $state('');
  let reviewer = $state('');
  let owner = $state('');
  let runtime = $state('rust');
  let primary = $state('rb');
  let sent = $state('Nothing sent yet');

  function send(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
    event.preventDefault();
    sent = `Sent ${new FormData(event.currentTarget).get('runtime') || 'nothing'}`;
  }
</script>

<Example
  title="Suggestions"
  note="Typing narrows the options, free entry offers what was typed, and a slow search says it is searching or that nothing matches"
  layout="grid"
>
  <Specimen label="Filtered options" code="options">
    <Field label="Language">
      {#snippet control({ id, describedby })}
        <Combobox {id} aria-describedby={describedby} options={languages} bind:value={language} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Free entry" code="free">
    <Field label="Label">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          free
          options={labels}
          bind:value={label}
          placeholder="bug"
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Search" code="search">
    <Field label="Reviewer">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          search={findAccounts}
          bind:value={reviewer}
          placeholder="octocat"
        />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="States"
  note="A refused value keeps its danger edge, a refused search says so, and a disabled field says why under it"
  layout="grid"
>
  <Specimen label="Invalid" code="invalid">
    <Field label="Primary language" error="Ruby is retired, so pick another language">
      {#snippet control({ id, describedby, invalid })}
        <Combobox
          {id}
          aria-describedby={describedby}
          {invalid}
          options={languages}
          bind:value={primary}
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Search refused" code="search">
    <Field label="Owner" hint="Type a name to look it up">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          search={offline}
          bind:value={owner}
          placeholder="octocat"
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <Field label="Language" hint="The template sets the language for every new repository">
      {#snippet control({ id, describedby })}
        <Combobox {id} aria-describedby={describedby} options={languages} value="go" disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="In a form"
  note="The form posts the chosen value, never its label, and a label typed in full picks its option"
>
  <Specimen label={sent} code="name">
    <form class="form" onsubmit={send}>
      <Field label="Runtime">
        {#snippet control({ id, describedby })}
          <Combobox
            {id}
            aria-describedby={describedby}
            name="runtime"
            options={languages}
            bind:value={runtime}
          />
        {/snippet}
      </Field>
      <Button type="submit">Save the runtime</Button>
    </form>
  </Specimen>
</Example>

<Example
  title="Open"
  note="The open list drawn in place, with the current value as the active row and its check"
  layout="grid"
>
  <Specimen label="Open" code="preview">
    <Field label="Language">
      {#snippet control({ id, describedby })}
        <Combobox {id} aria-describedby={describedby} options={languages} value="ts" preview />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<style>
  .form {
    display: grid;
    gap: var(--sui-space-4);
    justify-items: stretch;
    min-inline-size: 0;
  }
</style>
