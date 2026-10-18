<script module lang="ts">
  export const section = {
    title: 'Save bar',
    order: 103,
    lead: "The one place a pane's unsaved work is saved or thrown away. A setting that applies at once needs no bar.",
    components: ['SaveBar']
  };
</script>

<script lang="ts">
  import { Field, SaveBar } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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

  // Discarding keeps the draft it threw away, so the bar can offer it back.
  function discard() {
    const draft = { name, branch };
    name = saved.name;
    branch = saved.branch;
    return () => ({ name, branch } = draft);
  }

  const noop = () => {};
</script>

<Example
  title="States"
  note="Editing raises the bar, Ctrl+S saves, a save is confirmed, a discard offers Undo, and a failure stays up"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Unsaved" code="dirty">
    <div class="pane">
      <div class="scroller">
        <Field label="Repository name" bind:value={name} />
        <Field label="Default branch" bind:value={branch} />
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
  </Specimen>
  <Specimen label="Saving" code="saving">
    <div class="pane">
      <div class="scroller">
        <SaveBar dirty saving title="1 setting changed" onsave={noop} ondiscard={noop} />
      </div>
    </div>
  </Specimen>
  <Specimen label="Failed save" code="error">
    <div class="pane">
      <div class="scroller">
        <SaveBar
          dirty
          error="Another tab saved these settings first, so reload to see them before saving again"
          onsave={noop}
          ondiscard={noop}
        />
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow width"
  note="Long copy wraps with the 8px rhythm and the actions wrap under it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Long copy">
    <div class="pane narrow">
      <div class="scroller">
        <SaveBar
          dirty
          title="14 settings changed across merge rules, branch protection and review policy"
          subtitle="Review anywhere in this workspace, then save everything together in one go"
          onsave={noop}
          ondiscard={noop}
        />
      </div>
    </div>
  </Specimen>
</Example>

<style>
  /* The pane grows with its content, so the bar rests after the last line instead of sticking
     over the middle of the content. */
  .pane {
    overflow: hidden;
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }

  .scroller {
    align-content: start;
    box-sizing: border-box;
    display: grid;
    gap: var(--sui-space-4);
    overflow-y: auto;
    padding: var(--sui-space-4);
  }

  /* A bar that shows brings its own room under it. */
  .scroller:has(> :global(.sui-save-bar:not([hidden]))) {
    padding-block-end: 0;
  }
</style>
