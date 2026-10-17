<script module lang="ts">
  export const section = { title: 'Save bar', order: 103 };
</script>

<script lang="ts">
  import { Field, SaveBar } from '#lib';
  import Example from '../kit/Example.svelte';

  const SAVE_DELAY = 1200;

  let saved = $state({ name: 'smyklot', branch: 'main' });
  let name = $state('smyklot-panel');
  let branch = $state('main');
  let saving = $state(false);
  const dirty = $derived(name !== saved.name || branch !== saved.branch);

  function save() {
    saving = true;
    setTimeout(() => {
      saved = { name, branch };
      saving = false;
    }, SAVE_DELAY);
  }

  function discard() {
    name = saved.name;
    branch = saved.branch;
  }

  const lines = [
    'Merge queue checks run on every pull request',
    'Stale reviews are dismissed when new commits land',
    'Branch protection applies to administrators too',
    'Required checks must pass before a merge',
    'Squash merges keep the history linear'
  ];
  const noop = () => {};
</script>

{#snippet filler()}
  {#each lines as line (line)}<p class="line">{line}</p>{/each}
{/snippet}

<Example
  title="Unsaved work"
  note="Edit a field to raise the bar, and the last line still scrolls clear of it"
  layout="stack"
>
  <div class="pane">
    <div class="scroller">
      <Field label="Repository name" bind:value={name} />
      <Field label="Default branch" bind:value={branch} />
      {@render filler()}
      <SaveBar
        {dirty}
        {saving}
        title="2 settings changed"
        subtitle="They apply to every repository in this workspace"
        onsave={save}
        ondiscard={discard}
      />
    </div>
  </div>
</Example>

<Example title="Saving" note="Both actions hold while the save runs" layout="stack">
  <div class="pane">
    <div class="scroller">
      {@render filler()}
      <SaveBar dirty saving title="1 setting changed" onsave={noop} ondiscard={noop} />
    </div>
  </div>
</Example>

<Example
  title="Failed save"
  note="The reason replaces the subtitle, and the bar stays until the work is saved or discarded"
  layout="stack"
>
  <div class="pane">
    <div class="scroller">
      {@render filler()}
      <SaveBar
        dirty
        error="Another tab saved these settings first, so reload to see them before saving again"
        onsave={noop}
        ondiscard={noop}
      />
    </div>
  </div>
</Example>

<Example
  title="Narrow pane"
  note="Long copy wraps with the 8px rhythm and the actions wrap under it"
  layout="stack"
>
  <div class="pane narrow">
    <div class="scroller">
      {@render filler()}
      <SaveBar
        dirty
        title="14 settings changed across merge rules, branch protection and review policy"
        subtitle="Review anywhere in this workspace, then save everything together in one go"
        onsave={noop}
        ondiscard={noop}
      />
    </div>
  </div>
</Example>

<style>
  /* A containing block for fixed boxes, so the bar sits at this pane's end, not the page's. */
  .pane {
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    block-size: 18rem;
    contain: layout;
    overflow: hidden;
  }

  .narrow {
    inline-size: min(100%, 20rem);
  }

  .scroller {
    block-size: 100%;
    box-sizing: border-box;
    display: grid;
    align-content: start;
    gap: var(--sui-space-4);
    overflow-y: auto;
    padding: var(--sui-space-4);
  }

  .line {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    margin: 0;
  }
</style>
