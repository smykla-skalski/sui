<script module lang="ts">
  export const section = {
    title: 'Save Bar',
    lead: 'The one place a pane’s unsaved work is saved or thrown away. A setting that applies at once needs no bar.',
    components: ['SaveBar']
  };
</script>

<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { Field, SaveBar } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const SAVE_DELAY = 1200;

  let saved = $state({ name: 'smyklot', branch: 'main' });
  let name = $state('smyklot-panel');
  let branch = $state('main');
  let saving = $state(false);
  const dirty = $derived(name !== saved.name || branch !== saved.branch);
  // The example opens with unsaved work to show the bar, so only work the reader made is asked
  // about.
  const edited = $derived(dirty && (name !== 'smyklot-panel' || branch !== 'main'));

  // A move inside the app never unloads the page, so the browser's own question never comes,
  // and the app asks before the move drops the work.
  beforeNavigate((navigation) => {
    if (navigation.type === 'leave' || !edited) return;
    if (!confirm('Leave this page and drop your unsaved settings?')) navigation.cancel();
  });

  // The save keys as the reader's platform names them, once the page runs and can tell.
  let saveKeys = $state('Ctrl+S');
  $effect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ??
      navigator.platform;
    if (/mac|iphone|ipad/i.test(platform)) saveKeys = '⌘S';
  });

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

  // Another tab saved "trunk" after this one loaded "main", so a save from here is refused until
  // the reader reloads, and Undo then puts their own value back over the latest one.
  const LATEST = 'trunk';
  let loaded = $state('main');
  let draft = $state('develop');
  let stale = $state(true);
  let reloading = $state(false);
  let savingDraft = $state(false);

  function reload() {
    const mine = draft;
    reloading = true;
    setTimeout(() => {
      loaded = LATEST;
      draft = LATEST;
      stale = false;
      reloading = false;
    }, SAVE_DELAY);
    return () => (draft = mine);
  }

  function saveDraft() {
    savingDraft = true;
    setTimeout(() => {
      loaded = draft;
      savingDraft = false;
    }, SAVE_DELAY);
  }

  function discardDraft() {
    const mine = draft;
    draft = loaded;
    return () => (draft = mine);
  }

  const noop = () => {};
</script>

<Example
  title="States"
  note="Editing raises the bar, {saveKeys} saves, a discard offers Undo, a failure stays up, and a conflict reloads with Undo"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Unsaved">
    <div class="pane">
      <div class="scroller">
        <Field label="Repository name" spellcheck="false" autocapitalize="off" bind:value={name} />
        <Field label="Default branch" spellcheck="false" autocapitalize="off" bind:value={branch} />
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
  <Specimen label="Saving">
    <div class="pane">
      <div class="scroller">
        <SaveBar
          dirty
          saving
          askBeforeLeaving={false}
          title="1 setting changed"
          onsave={noop}
          ondiscard={() => noop}
        />
      </div>
    </div>
  </Specimen>
  <Specimen label="Failed save">
    <div class="pane">
      <div class="scroller">
        <SaveBar
          dirty
          askBeforeLeaving={false}
          error="The server did not answer, so your changes are still here to save again"
          onsave={noop}
          ondiscard={() => noop}
        />
      </div>
    </div>
  </Specimen>
  <Specimen label="Conflict">
    <div class="pane">
      <div class="scroller">
        <Field label="Default branch" spellcheck="false" autocapitalize="off" bind:value={draft} />
        <SaveBar
          dirty={draft !== loaded}
          askBeforeLeaving={false}
          conflict={stale}
          {reloading}
          saving={savingDraft}
          onsave={saveDraft}
          ondiscard={discardDraft}
          onreload={reload}
        />
      </div>
    </div>
  </Specimen>
</Example>

<Example
  title="Narrow Width"
  note="Long copy wraps with the 8 px rhythm and the actions wrap under it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Long copy">
    <div class="pane narrow">
      <div class="scroller">
        <SaveBar
          dirty
          askBeforeLeaving={false}
          title="14 settings changed across merge rules, branch protection and review policy"
          subtitle="Review anywhere in this workspace, then save everything together in one go"
          onsave={noop}
          ondiscard={() => noop}
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
