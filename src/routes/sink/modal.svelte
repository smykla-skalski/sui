<script module lang="ts">
  export const section = { title: 'Modal', order: 50 };
</script>

<script lang="ts">
  import { Button, Combobox, ConfirmDialog, Modal, Select, TextInput } from '#lib';
  import Example from '../kit/Example.svelte';

  let webhook = $state(false);
  let inspector = $state(false);
  let wide = $state(false);
  let guarded = $state(false);
  let discard = $state(false);

  let url = $state('https://example.com/hooks/smyklot');
  let events = $state<string | null>('push');
  let owner = $state('');
  let note = $state('');

  const steps = [
    'Checked out the repository at 4f2a9c1',
    'Restored the module cache',
    'Downloaded 42 modules',
    'Built the panel frontend',
    'Built the server binary',
    'Ran 318 unit tests',
    'Ran 46 browser tests at phone width',
    'Ran 46 browser tests at desktop width',
    'Checked every design law on the kitchen sink',
    'Measured the bundle at 84.7 kB',
    'Signed the container image',
    'Pushed the image to the registry',
    'Rolled the staging deployment',
    'Waited for 3 healthy replicas',
    'Ran the smoke tests against staging',
    'Posted the result to the pull request'
  ];

  const changes = [
    'Select, combobox and action menu replace the native pickers',
    'Modal and confirm dialog run on the native dialog element',
    'Toasts stack in the corner and wait while they are read',
    'Help tips explain a label in one sentence'
  ];

  // Closing would throw away the note, so ask first, and only when there is one.
  function keepNote(): boolean {
    if (note.trim() === '') return true;
    discard = true;
    return false;
  }
</script>

<Example
  title="Sizes"
  note="A dialog asks, an inspector reads a record from the edge, wide holds a document"
>
  <Button onclick={() => (webhook = true)}>Edit webhook</Button>
  <Button onclick={() => (inspector = true)}>Inspect run</Button>
  <Button onclick={() => (wide = true)}>Read the changelog</Button>
</Example>

<Example
  title="Open states"
  note="Each size drawn in place at its real width without the scrim, so a review needs no click"
  layout="stack"
>
  <Modal
    preview
    title="Edit webhook"
    description="Smyklot posts every event you pick to this address"
  >
    <div class="field">
      <label for="sink-modal-open-url">Payload address</label>
      <TextInput
        id="sink-modal-open-url"
        type="url"
        value="https://example.com/hooks/smyklot"
        mono
      />
    </div>
    {#snippet footer()}
      <Button>Cancel</Button>
      <Button tone="signal">Save webhook</Button>
    {/snippet}
  </Modal>
  <Modal
    preview
    size="inspector"
    title="Run 4821"
    description="Started by a push to main and finished in 6 minutes"
  >
    <ul class="steps">
      {#each steps.slice(0, 4) as step (step)}
        <li>{step}</li>
      {/each}
    </ul>
    {#snippet footer()}
      <Button>Close run</Button>
      <Button tone="signal">Run again</Button>
    {/snippet}
  </Modal>
  <Modal
    preview
    size="wide"
    title="Changelog 0.3.0"
    description="Everything that changed since 0.2.1"
  >
    <ul class="steps">
      {#each changes as change (change)}
        <li>{change}</li>
      {/each}
    </ul>
  </Modal>
</Example>

<Example
  title="Guarded close"
  note="Escape, an outside press and the close button ask before throwing away a note"
>
  <Button onclick={() => (guarded = true)}>Write a note</Button>
</Example>

<Modal
  bind:open={webhook}
  title="Edit webhook"
  description="Smyklot posts every event you pick to this address"
>
  <div class="field">
    <label for="sink-modal-url">Payload address</label>
    <TextInput id="sink-modal-url" type="url" bind:value={url} mono />
  </div>
  <div class="field">
    <label for="sink-modal-events">Events</label>
    <Select
      id="sink-modal-events"
      bind:value={events}
      options={[
        { value: 'push', label: 'Pushes' },
        { value: 'pull', label: 'Pull requests' },
        { value: 'all', label: 'Everything' }
      ]}
    />
  </div>
  <div class="field">
    <label for="sink-modal-owner">Owner</label>
    <Combobox
      id="sink-modal-owner"
      bind:value={owner}
      options={[
        { value: 'platform', label: 'Platform team' },
        { value: 'release', label: 'Release team' },
        { value: 'security', label: 'Security team' }
      ]}
    />
  </div>
  {#snippet footer()}
    <Button onclick={() => (webhook = false)}>Cancel</Button>
    <Button tone="signal" onclick={() => (webhook = false)}>Save webhook</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={inspector}
  size="inspector"
  title="Run 4821"
  description="Started by a push to main and finished in 6 minutes"
>
  <ul class="steps">
    {#each steps as step (step)}
      <li>{step}</li>
    {/each}
  </ul>
  {#snippet footer()}
    <Button onclick={() => (inspector = false)}>Close run</Button>
    <Button tone="signal" onclick={() => (inspector = false)}>Run again</Button>
  {/snippet}
</Modal>

<Modal
  bind:open={wide}
  size="wide"
  title="Changelog 0.3.0"
  description="Everything that changed since 0.2.1"
>
  <ul class="steps">
    {#each changes as change (change)}
      <li>{change}</li>
    {/each}
  </ul>
</Modal>

<Modal bind:open={guarded} title="Write a note" beforeClose={keepNote}>
  <div class="field">
    <label for="sink-modal-note">Note</label>
    <TextInput
      id="sink-modal-note"
      bind:value={note}
      placeholder="Type something, then press Escape"
    />
  </div>
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

<style>
  .field {
    display: grid;
    gap: var(--sui-space-2);
  }

  label {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-control) / var(--sui-leading-flat) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .steps {
    color: var(--sui-text-secondary);
    display: grid;
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    gap: var(--sui-space-2);
    margin: 0;
    padding-inline-start: var(--sui-space-5);
  }
</style>
