<script module lang="ts">
  export const section = {
    title: 'Combobox',
    short: 'Combo\u00adbox',
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

  /* The directory is offline: the search the refused copy stands for. */
  function offline(): Promise<typeof accounts> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('The directory is offline')), 300)
    );
  }

  let language = $state('ts');
  let label = $state('');
  let reviewer = $state('');
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
  --example-max="54rem"
  --specimen-min="15rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="Typing narrows the options, free entry offers what was typed, and a slow search says it is searching or that nothing matches"
  layout="grid"
>
  <Specimen label="Filtered options">
    <Field label="Language">
      {#snippet control({ id, describedby })}
        <Combobox {id} aria-describedby={describedby} options={languages} bind:value={language} />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Free entry">
    <Field label="Label">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          free
          options={labels}
          bind:value={label}
          placeholder="bug…"
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Search">
    <Field label="Reviewer">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          search={findAccounts}
          bind:value={reviewer}
          placeholder="octocat…"
        />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="States"
  --example-max="54rem"
  --specimen-min="15rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="A refused value keeps its danger edge, a field that only reads drops its chevron, and a disabled field says why under it"
  layout="grid"
>
  <Specimen label="Invalid">
    <Field label="Primary language" error="Ruby is retired, so choose another language">
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
  <Specimen label="Read-only">
    <Field label="Language" hint="The organization policy sets it">
      {#snippet control({ id, describedby })}
        <Combobox {id} aria-describedby={describedby} options={languages} value="rust" readonly />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Disabled">
    <Field label="Language" hint="The template sets the language for every new repository">
      {#snippet control({ id, describedby })}
        <Combobox {id} aria-describedby={describedby} options={languages} value="go" disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Open"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="Static copies of the open list: the checked value over a count of the rest, and marked matches with one row lit. Free entry offers the text, and the notes show no match, a wait and a refusal"
  layout="grid"
>
  <Specimen label="Chosen & limited">
    <Field label="Language">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          options={languages}
          value="ts"
          limit={3}
          preview
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Typed & matched">
    <Field label="Language">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          options={languages}
          value="ts"
          previewText="r"
          previewActive={0}
          preview
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Free entry">
    <Field label="Label">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          free
          options={labels}
          previewText="feature"
          preview
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Nothing matches">
    <Field label="Language">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          options={languages}
          previewText="zig"
          preview
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Searching">
    <Field label="Reviewer">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          search={findAccounts}
          previewText="octo"
          previewSearch="waiting"
          preview
        />
      {/snippet}
    </Field>
  </Specimen>
  <Specimen label="Search refused">
    <Field label="Owner">
      {#snippet control({ id, describedby })}
        <Combobox
          {id}
          aria-describedby={describedby}
          search={offline}
          previewText="octo"
          previewSearch="refused"
          preview
        />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="In a Form"
  --example-max="54rem"
  --specimen-min="21rem"
  --specimen-row-gap="var(--sui-space-6)"
  layout="grid"
  note="The form posts the chosen value, never its label, and a label typed in full chooses its option"
>
  <Specimen label={sent}>
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
      <Button type="submit" tone="signal" class="action">Save the Runtime</Button>
    </form>
  </Specimen>
</Example>

<style>
  .form {
    display: grid;
    gap: var(--sui-space-5);
    min-inline-size: 0;
  }

  /* The action ends the form a step past the fields' own gap, so it reads as the form's
     close and not as one more field (L-35). */
  .form > :global(.action) {
    justify-self: start;
    margin-block-start: var(--sui-space-1);
  }
</style>
