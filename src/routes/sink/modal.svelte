<script module lang="ts">
  export const section = {
    title: 'Modal',
    order: 50,
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
  let discard = $state(false);

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
  let newName = $state('smyklot');

  function rename(): void {
    renameError = undefined;
    renaming = true;
  }

  // The sink's server always refuses, so the dialog shows its pending and failed states.
  function saveName(): void {
    renameBusy = true;
    setTimeout(() => {
      renameBusy = false;
      renameError = 'Another repository in this workspace already has that name';
    }, 900);
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

  // Closing would throw away the note, so ask first, and only when there is one.
  function keepNote(): boolean {
    if (note.trim() === '') return true;
    discard = true;
    return false;
  }
</script>

<Example
  title="Sizes"
  note="Each size drawn in place at its real width without the scrim, so a review needs no click"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Dialog" code="preview">
    <Modal
      preview
      title="Edit webhook"
      description="Smyklot posts every event you pick to this address"
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
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Save webhook</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Inspector" code={'size="inspector" preview'}>
    <Modal
      preview
      size="inspector"
      title="Edit run settings"
      description="Applies to every run of smyklot from the next push"
    >
      <Field label="Branch" value="main" />
      <Field
        label="Timeout in minutes"
        type="number"
        value="30"
        hint="A run that takes longer is stopped and marked failed"
      />
      <CheckList label="Run on" options={triggerOptions} value={['push', 'pull']} />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Save settings</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Wide" code={'size="wide" preview'}>
    <Modal
      preview
      size="wide"
      title="Write release notes"
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
        <Button tone="signal">Save notes</Button>
      {/snippet}
    </Modal>
  </Specimen>
</Example>

<Example
  title="States"
  note="A save in progress refuses every way out, and a failed save keeps the fields and says why above the actions"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Saving" code="busy preview">
    <Modal
      preview
      busy
      title="Rename repository"
      description="Links to the old name redirect for a year"
    >
      <Field label="Name" value="smyklot-next" />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal" loading>Rename repository</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Save failed" code="error preview">
    <Modal
      preview
      title="Rename repository"
      description="Links to the old name redirect for a year"
      error="Another repository in this workspace already has that name"
    >
      <Field label="Name" value="smyklot" />
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Rename repository</Button>
      {/snippet}
    </Modal>
  </Specimen>
</Example>

<Example
  title="Opening"
  note="Each size opens over a scrim on a copy of its record, and only Save writes the copy back"
>
  <Specimen label="Dialog" code="bind:open">
    <Button onclick={editWebhook}>Edit webhook</Button>
  </Specimen>
  <Specimen label="Inspector" code={'size="inspector"'}>
    <Button onclick={editRun}>Edit run settings</Button>
  </Specimen>
  <Specimen label="Wide" code={'size="wide"'}>
    <Button onclick={writeNotes}>Write release notes</Button>
  </Specimen>
</Example>

<Example
  title="Guarded close"
  note="Escape and the close button ask before throwing away a note, and a press outside never closes a form"
>
  <Specimen label="Guarded" code="beforeClose">
    <Button onclick={() => (guarded = true)}>Write a note</Button>
  </Specimen>
  <Specimen label="Failing save" code="busy error">
    <Button onclick={rename}>Rename repository</Button>
  </Specimen>
</Example>

<Modal
  bind:open={webhookOpen}
  title="Edit webhook"
  description="Smyklot posts every event you pick to this address"
>
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
  {#snippet footer()}
    <Button onclick={() => (webhookOpen = false)}>Cancel</Button>
    <Button
      tone="signal"
      onclick={() => {
        webhook = webhookDraft;
        webhookOpen = false;
      }}>Save webhook</Button
    >
  {/snippet}
</Modal>

<Modal
  bind:open={runOpen}
  size="inspector"
  title="Edit run settings"
  description="Applies to every run of smyklot from the next push"
>
  <Field label="Branch" bind:value={runDraft.branch} />
  <Field
    label="Timeout in minutes"
    type="number"
    min="1"
    bind:value={runDraft.timeout}
    hint="A run that takes longer is stopped and marked failed"
  />
  <CheckList label="Run on" options={triggerOptions} bind:value={runDraft.triggers} />
  {#snippet footer()}
    <Button onclick={() => (runOpen = false)}>Cancel</Button>
    <Button
      tone="signal"
      onclick={() => {
        run = runDraft;
        runOpen = false;
      }}>Save settings</Button
    >
  {/snippet}
</Modal>

<Modal
  bind:open={notesOpen}
  size="wide"
  title="Write release notes"
  description="Shown on the release page and in the changelog for 0.3.0"
>
  <Field label="Release notes">
    {#snippet control({ id, describedby, invalid })}
      <Textarea
        {id}
        aria-describedby={describedby}
        {invalid}
        rows={12}
        placeholder="What changed, and what a reader has to do about it…"
        bind:value={notesDraft}
      />
    {/snippet}
  </Field>
  {#snippet footer()}
    <Button onclick={() => (notesOpen = false)}>Cancel</Button>
    <Button
      tone="signal"
      onclick={() => {
        notes = notesDraft;
        notesOpen = false;
      }}>Save notes</Button
    >
  {/snippet}
</Modal>

<Modal bind:open={guarded} title="Write a note" beforeClose={keepNote}>
  <Field label="Note" bind:value={note} placeholder="Type something, then press Escape" />
  {#snippet footer()}
    <Button
      onclick={() => {
        note = '';
        guarded = false;
      }}>Discard note</Button
    >
    <Button tone="signal" onclick={() => (guarded = false)}>Keep note</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={renaming}
  title="Rename repository"
  description="Links to the old name redirect for a year"
  busy={renameBusy}
  error={renameError}
>
  <Field label="Name" bind:value={newName} />
  {#snippet footer()}
    <Button disabled={renameBusy} onclick={() => (renaming = false)}>Cancel</Button>
    <Button tone="signal" loading={renameBusy} onclick={saveName}>Rename repository</Button>
  {/snippet}
</Modal>

<ConfirmDialog
  bind:open={discard}
  title="Discard the note?"
  consequence="What you typed is gone once the dialog closes"
  confirmLabel="Discard note"
  tone="stop"
  onconfirm={() => {
    note = '';
    guarded = false;
  }}
/>
