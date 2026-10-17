<script module lang="ts">
  export const section = { title: 'Confirm dialog', order: 52 };
</script>

<script lang="ts">
  import { Button, ConfirmDialog, TextInput } from '#lib';
  import Example from '../kit/Example.svelte';

  let remove = $state(false);
  let publish = $state(false);
  let archive = $state(false);
  let reason = $state('');
  let answer = $state('No answer yet');
</script>

<Example title="Destructive" note="The confirm action wears the stop tone and Cancel opens focused">
  <Button tone="stop-quiet" onclick={() => (remove = true)}>Delete repository</Button>
  <span class="state">{answer}</span>
</Example>

<Example title="Affirmative" note="An act that gives something confirms with the signal tone">
  <Button onclick={() => (publish = true)}>Publish release</Button>
</Example>

<Example
  title="With a reason"
  note="Anything the answer needs goes in the body under the consequence"
>
  <Button onclick={() => (archive = true)}>Archive repository</Button>
</Example>

<ConfirmDialog
  bind:open={remove}
  title="Delete this repository?"
  consequence="Its settings, history and webhooks are removed for good"
  confirmLabel="Delete repository"
  tone="stop"
  onconfirm={() => (answer = 'Deleted')}
  oncancel={() => (answer = 'Kept')}
/>

<ConfirmDialog
  bind:open={publish}
  title="Publish 0.3.0?"
  consequence="Everyone who installs the package gets this version from now on"
  confirmLabel="Publish release"
  onconfirm={() => (answer = 'Published')}
  oncancel={() => (answer = 'Not published')}
/>

<ConfirmDialog
  bind:open={archive}
  title="Archive this repository?"
  consequence="It turns read-only for everyone until an owner restores it"
  confirmLabel="Archive repository"
  onconfirm={() => (answer = reason ? `Archived: ${reason}` : 'Archived')}
  oncancel={() => (answer = 'Not archived')}
>
  <div class="field">
    <label for="sink-confirm-reason">Reason</label>
    <TextInput id="sink-confirm-reason" bind:value={reason} placeholder="Moved to a new home" />
  </div>
</ConfirmDialog>

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

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }
</style>
