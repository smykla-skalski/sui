<script module lang="ts">
  export const section = { title: 'Combobox', order: 42 };
</script>

<script lang="ts">
  import { Combobox } from '#lib';
  import Example from '../kit/Example.svelte';

  const languages = [
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ts', label: 'TypeScript', description: 'Typed JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rb', label: 'Ruby', disabled: true },
    { value: 'kt', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' }
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

  let language = $state('ts');
  let label = $state('');
  let reviewer = $state('');
</script>

<Example
  title="Filtered options"
  note="Type to narrow the list, and the matched letters are marked"
>
  <div class="field">
    <label for="sink-combobox-language">Language</label>
    <Combobox id="sink-combobox-language" options={languages} bind:value={language} />
  </div>
  <span class="state">{language || 'Nothing chosen'}</span>
</Example>

<Example title="Free entry" note="What was typed is offered as a value of its own">
  <div class="field">
    <label for="sink-combobox-label">Label</label>
    <Combobox
      id="sink-combobox-label"
      free
      options={[
        { value: 'bug', label: 'bug' },
        { value: 'documentation', label: 'documentation' },
        { value: 'good first issue', label: 'good first issue' }
      ]}
      bind:value={label}
      placeholder="bug"
    />
  </div>
  <span class="state">{label || 'Nothing chosen'}</span>
</Example>

<Example
  title="Search and empty result"
  note="Suggestions come from a slow search, and a login nobody has says nothing matches"
>
  <div class="field">
    <label for="sink-combobox-reviewer">Reviewer</label>
    <Combobox
      id="sink-combobox-reviewer"
      search={findAccounts}
      bind:value={reviewer}
      placeholder="octocat"
    />
  </div>
  <span class="state">{reviewer || 'Nothing chosen'}</span>
</Example>

<Example title="Disabled" note="A disabled field keeps its value in view">
  <div class="field">
    <label for="sink-combobox-disabled">Language</label>
    <Combobox id="sink-combobox-disabled" options={languages} value="go" disabled />
  </div>
</Example>

<style>
  .field {
    display: grid;
    gap: var(--sui-space-2);
    inline-size: 16rem;
    max-inline-size: 100%;
  }

  label {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-mono);
  }
</style>
