<script module lang="ts">
  export const section = { title: 'Confirm dialog', order: 52 };
</script>

<script lang="ts">
  import { Button, ConfirmDialog, TextInput, toast } from '#lib';
  import Example from '../kit/Example.svelte';

  let remove = $state(false);
  let publish = $state(false);
  let revoke = $state(false);
  let archived = $state(false);
  let reason = $state('');
  let answer = $state('No answer yet');

  function archive(): void {
    archived = true;
    toast({
      title: 'Repository archived',
      description: 'It is read-only until an owner restores it',
      action: { label: 'Undo', run: restore }
    });
  }

  function restore(): void {
    archived = false;
    toast({ title: 'Repository restored' });
  }
</script>

<Example title="Destructive" note="The confirm action wears the stop tone and Cancel opens focused">
  <Button tone="stop-quiet" onclick={() => (remove = true)}>Delete repository</Button>
  <span class="state">{answer}</span>
</Example>

<Example
  title="Open states"
  note="A destructive question and one with a reason, drawn in place so a review needs no click"
  layout="stack"
>
  <ConfirmDialog
    preview
    title="Delete this repository?"
    consequence="Its settings, history and webhooks are removed for good"
    confirmLabel="Delete repository"
    tone="stop"
  />
  <ConfirmDialog
    preview
    title="Yank 0.2.1?"
    consequence="Nobody can install 0.2.1 again, and the version number is never reused"
    confirmLabel="Yank release"
    tone="stop"
  >
    <div class="field">
      <label for="sink-confirm-open-reason">Reason</label>
      <TextInput id="sink-confirm-open-reason" placeholder="Ships a broken migration" />
    </div>
  </ConfirmDialog>
</Example>

<Example
  title="Affirmative"
  note="An act that gives something confirms with the signal tone, and its confirm action opens focused"
>
  <Button onclick={() => (publish = true)}>Publish release</Button>
</Example>

<Example
  title="With a reason"
  note="Anything the answer needs goes in the body under the consequence"
>
  <Button tone="stop-quiet" onclick={() => (revoke = true)}>Revoke token</Button>
</Example>

<Example
  title="No question"
  note="An act that can be undone just happens and offers Undo in a toast"
>
  <Button onclick={archived ? restore : archive}
    >{archived ? 'Restore repository' : 'Archive repository'}</Button
  >
  <span class="state">{archived ? 'Archived' : 'Active'}</span>
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
  bind:open={revoke}
  title="Revoke this token?"
  consequence="Every script that signs in with it stops working at once, and it cannot be restored"
  confirmLabel="Revoke token"
  tone="stop"
  onconfirm={() => (answer = reason ? `Revoked: ${reason}` : 'Revoked')}
  oncancel={() => (answer = 'Not revoked')}
>
  <div class="field">
    <label for="sink-confirm-reason">Reason</label>
    <TextInput id="sink-confirm-reason" bind:value={reason} placeholder="Leaked in a build log" />
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
