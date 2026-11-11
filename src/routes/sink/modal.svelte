<script module lang="ts">
  export const section = {
    title: 'Modal',
    lead: 'A task the reader must finish or abandon before using the page again. Reading belongs on a page or in a panel.',
    components: ['Modal']
  };
</script>

<script lang="ts">
  import {
    Button,
    CheckList,
    ConfirmDialog,
    Field,
    Modal,
    SegmentedControl,
    TextInput,
    Textarea
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const eventOptions = [
    { value: 'push', label: 'Pushes' },
    { value: 'pull', label: 'Pull requests' },
    { value: 'all', label: 'Everything' }
  ];
  const teamOptions = [
    { value: 'platform', label: 'Platform team' },
    { value: 'release', label: 'Release team' },
    { value: 'security', label: 'Security team' }
  ];
  const triggerOptions = [
    { value: 'push', label: 'Pushes' },
    { value: 'pull', label: 'Pull requests' },
    { value: 'schedule', label: 'Nightly schedule' }
  ];

  let webhookOpen = $state(false);
  let runOpen = $state(false);
  let notesOpen = $state(false);
  let guarded = $state(false);

  // Each dialog edits a copy, and only Save writes it back, so every other way out reverts.
  let webhook = $state({
    url: 'https://example.com/hooks/smyklot',
    events: 'push' as string | null,
    teams: ['platform']
  });
  let webhookDraft = $state({ url: '', events: null as string | null, teams: [] as string[] });
  let run = $state({ branch: 'main', timeout: '30', triggers: ['push', 'pull'] });
  let runDraft = $state({ branch: '', timeout: '', triggers: [] as string[] });
  let notes = $state('');
  let notesDraft = $state('');
  let note = $state('');
  let renaming = $state(false);
  let renameBusy = $state(false);
  let renameError = $state<string | undefined>();
  const REPOSITORY = 'smyklot';
  let newName = $state(REPOSITORY);

  function rename(): void {
    renameError = undefined;
    renaming = true;
  }

  // The sink's server always refuses, so the dialog shows its pending and failed states.
  function saveName(event: SubmitEvent): void {
    event.preventDefault();
    renameBusy = true;
    setTimeout(() => {
      renameBusy = false;
      renameError = 'Another repository in this workspace already has that name';
    }, 900);
  }

  // Each form saves its copy back, so Enter in a field saves as the primary action does.
  function saveWebhook(event: SubmitEvent): void {
    event.preventDefault();
    webhook = webhookDraft;
    webhookOpen = false;
  }

  function saveRun(event: SubmitEvent): void {
    event.preventDefault();
    run = runDraft;
    runOpen = false;
  }

  function saveNotes(event: SubmitEvent): void {
    event.preventDefault();
    notes = notesDraft;
    notesOpen = false;
  }

  function keepNote(event: SubmitEvent): void {
    event.preventDefault();
    guarded = false;
  }

  function editWebhook(): void {
    webhookDraft = $state.snapshot(webhook);
    webhookOpen = true;
  }

  function editRun(): void {
    runDraft = $state.snapshot(run);
    runOpen = true;
  }

  function writeNotes(): void {
    notesDraft = notes;
    notesOpen = true;
  }

  // Escape, the close button and a press outside all throw a form's changes away, so a form
  // that holds changes asks first and a pristine one closes at once. `leaving` is the close
  // that waits on the answer.
  let leaving = $state<(() => void) | null>(null);

  function guard(changed: () => boolean, close: () => void): () => boolean {
    return () => {
      if (!changed()) return true;
      leaving = close;
      return false;
    };
  }

  const same = (one: unknown, other: unknown) => JSON.stringify(one) === JSON.stringify(other);
</script>

<Example
  title="Sizes"
  note="Each size drawn in place at its real width without the scrim, so a review needs no click"
  layout="stack"
  ground="canvas"
  --example-max="49rem"
>
  <Specimen label="Dialog">
    <Modal
      preview
      title="Edit Webhook"
      description="Smyklot posts every event you choose to this address"
    >
      <Field label="Payload address">
        {#snippet control({ id, describedby })}
          <TextInput
            {id}
            aria-describedby={describedby}
            type="url"
            value="https://example.com/hooks/smyklot"
            mono
          />
        {/snippet}
      </Field>
      <SegmentedControl label="Events" options={eventOptions} value="push" />
      <CheckList label="Teams to notify" options={teamOptions} value={['platform']} />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Save Webhook</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Inspector">
    <Modal
      preview
      size="inspector"
      title="Edit Run Settings"
      description="Applies to every run of smyklot from the next push"
    >
      <Field label="Branch" spellcheck="false" autocapitalize="off" value="main" />
      <Field
        label="Timeout in minutes"
        inputmode="numeric"
        pattern="[1-9][0-9]*"
        validationMessage="Enter the minutes as a whole number from 1"
        value="30"
        hint="The runner stops a longer run and marks it failed"
      />
      <CheckList label="Run on" options={triggerOptions} value={['push', 'pull']} />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Save Settings</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Wide">
    <Modal
      preview
      size="wide"
      title="Write Release Notes"
      description="Shown on the release page and in the changelog for 0.3.0"
    >
      <Field label="Release notes">
        {#snippet control({ id, describedby, invalid })}
          <Textarea
            {id}
            aria-describedby={describedby}
            {invalid}
            rows={6}
            value="Select is the native picker, styled where the browser allows it"
          />
        {/snippet}
      </Field>
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Save Notes</Button>
      {/snippet}
    </Modal>
  </Specimen>
</Example>

<Example
  title="States"
  note="A save in progress refuses every way out, a failed save says why above the actions, and a close that would lose changes asks first"
  layout="stack"
  ground="canvas"
  --example-max="37rem"
>
  <Specimen label="Saving">
    <Modal
      preview
      busy
      title="Rename Repository"
      description="Links to the old name redirect for a year"
    >
      <Field label="Name" value="smyklot-next" />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal" loading>Rename Repository</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Save failed">
    <Modal
      preview
      title="Rename Repository"
      description="Links to the old name redirect for a year"
      error="Another repository in this workspace has that name, so choose another"
    >
      <Field label="Name" value="smyklot" />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Rename Repository</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Closing with changes">
    <ConfirmDialog
      preview
      title="Discard Your Changes?"
      consequence="What you changed is gone once the dialog closes"
      confirmLabel="Discard Changes"
      tone="stop"
    />
  </Specimen>
</Example>

<Example
  title="Opening"
  note="Each size opens over a scrim on a copy of its record, and only Save writes the copy back"
>
  <Specimen label="Dialog">
    <Button onclick={editWebhook}>Edit Webhook</Button>
  </Specimen>
  <Specimen label="Inspector">
    <Button onclick={editRun}>Edit Run Settings</Button>
  </Specimen>
  <Specimen label="Wide">
    <Button onclick={writeNotes}>Write Release Notes</Button>
  </Specimen>
</Example>

<Example
  title="Guarded Close"
  note="Escape, the close button and a press outside ask before throwing away a note, and close a blank one at once"
>
  <Specimen label="Guarded">
    <Button onclick={() => (guarded = true)}>Write a Note</Button>
  </Specimen>
  <Specimen label="Failing save">
    <Button onclick={rename}>Rename Repository</Button>
  </Specimen>
</Example>

<Modal
  bind:open={webhookOpen}
  beforeClose={guard(
    () => !same(webhookDraft, webhook),
    () => (webhookOpen = false)
  )}
  title="Edit Webhook"
  description="Smyklot posts every event you choose to this address"
>
  <form id="sink-webhook" class="form" onsubmit={saveWebhook}>
    <Field label="Payload address">
      {#snippet control({ id, describedby })}
        <TextInput
          {id}
          aria-describedby={describedby}
          type="url"
          bind:value={webhookDraft.url}
          mono
        />
      {/snippet}
    </Field>
    <SegmentedControl label="Events" options={eventOptions} bind:value={webhookDraft.events} />
    <CheckList label="Teams to notify" options={teamOptions} bind:value={webhookDraft.teams} />
  </form>
  {#snippet footer()}
    <Button onclick={() => (webhookOpen = false)}>Cancel</Button>
    <Button tone="signal" type="submit" form="sink-webhook">Save Webhook</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={runOpen}
  beforeClose={guard(
    () => !same(runDraft, run),
    () => (runOpen = false)
  )}
  size="inspector"
  title="Edit Run Settings"
  description="Applies to every run of smyklot from the next push"
>
  <form id="sink-run" class="form" onsubmit={saveRun}>
    <Field label="Branch" spellcheck="false" autocapitalize="off" bind:value={runDraft.branch} />
    <Field
      label="Timeout in minutes"
      inputmode="numeric"
      pattern="[1-9][0-9]*"
      validationMessage="Enter the minutes as a whole number from 1"
      bind:value={runDraft.timeout}
      hint="The runner stops a longer run and marks it failed"
    />
    <CheckList label="Run on" options={triggerOptions} bind:value={runDraft.triggers} />
  </form>
  {#snippet footer()}
    <Button onclick={() => (runOpen = false)}>Cancel</Button>
    <Button tone="signal" type="submit" form="sink-run">Save Settings</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={notesOpen}
  beforeClose={guard(
    () => notesDraft !== notes,
    () => (notesOpen = false)
  )}
  size="wide"
  title="Write Release Notes"
  description="Shown on the release page and in the changelog for 0.3.0"
>
  <form id="sink-notes" class="form" onsubmit={saveNotes}>
    <Field label="Release notes">
      {#snippet control({ id, describedby, invalid })}
        <Textarea
          {id}
          aria-describedby={describedby}
          {invalid}
          rows={12}
          placeholder="Renames the sync setting, so update your config…"
          bind:value={notesDraft}
        />
      {/snippet}
    </Field>
  </form>
  {#snippet footer()}
    <Button onclick={() => (notesOpen = false)}>Cancel</Button>
    <Button tone="signal" type="submit" form="sink-notes">Save Notes</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={guarded}
  title="Write a Note"
  beforeClose={guard(
    () => note.trim() !== '',
    () => {
      note = '';
      guarded = false;
    }
  )}
>
  <form id="sink-note" class="form" onsubmit={keepNote}>
    <Field label="Note" bind:value={note} placeholder="Thanks for the review…" />
  </form>
  {#snippet footer()}
    <Button
      onclick={() => {
        note = '';
        guarded = false;
      }}>Discard Note</Button
    >
    <Button tone="signal" type="submit" form="sink-note">Keep Note</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={renaming}
  beforeClose={guard(
    () => newName !== REPOSITORY,
    () => {
      newName = REPOSITORY;
      renaming = false;
    }
  )}
  title="Rename Repository"
  description="Links to the old name redirect for a year"
  busy={renameBusy}
  error={renameError}
>
  <form id="sink-rename" class="form" onsubmit={saveName}>
    <Field label="Name" bind:value={newName} />
  </form>
  {#snippet footer()}
    <Button disabled={renameBusy} onclick={() => (renaming = false)}>Cancel</Button>
    <Button tone="signal" type="submit" form="sink-rename" loading={renameBusy}
      >Rename Repository</Button
    >
  {/snippet}
</Modal>

<ConfirmDialog
  bind:open={
    () => leaving !== null,
    (next) => {
      if (!next) leaving = null;
    }
  }
  title="Discard Your Changes?"
  consequence="What you changed is gone once the dialog closes"
  confirmLabel="Discard Changes"
  tone="stop"
  onconfirm={() => leaving?.()}
/>

<style>
  /* The form owns its fields and lets them stand in the dialog body's own rhythm. */
  .form {
    display: contents;
  }
</style>
