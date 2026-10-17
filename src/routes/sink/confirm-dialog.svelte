<script module lang="ts">
  export const section = {
    title: 'Confirm dialog',
    order: 52,
    lead: 'A question asked before an act that cannot be undone or would discard work. An act that can be undone just happens and offers Undo.',
    components: ['ConfirmDialog']
  };
</script>

<script lang="ts">
  import { Button, ConfirmDialog, Field, toast } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let remove = $state(false);
  let publish = $state(false);
  let revoke = $state(false);
  let archived = $state(false);
  let reason = $state('');

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

<Example
  title="Tones"
  note="A destructive question wears the stop tone, and an act that gives something confirms with the signal tone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Destructive" code={'tone="stop" preview'}>
    <ConfirmDialog
      preview
      title="Delete this repository?"
      consequence="Its settings, history and webhooks are removed for good"
      confirmLabel="Delete repository"
      tone="stop"
    />
  </Specimen>
  <Specimen label="Affirmative" code="preview">
    <ConfirmDialog
      preview
      title="Publish 0.3.0?"
      consequence="Everyone who installs the package gets this version from now on"
      confirmLabel="Publish release"
    />
  </Specimen>
</Example>

<Example
  title="With a reason"
  note="Anything the answer needs goes in the body under the consequence"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Reason field" code="children">
    <ConfirmDialog
      preview
      title="Yank 0.2.1?"
      consequence="Nobody can install 0.2.1 again, and the version number is never reused"
      confirmLabel="Yank release"
      tone="stop"
    >
      <Field label="Reason" placeholder="Ships a broken migration" />
    </ConfirmDialog>
  </Specimen>
</Example>

<Example
  title="Asking"
  note="Cancel opens focused on a destructive question, and the confirm action opens focused on an affirmative one"
>
  <Specimen label="Destructive" code={'tone="stop"'}>
    <Button tone="stop-quiet" onclick={() => (remove = true)}>Delete repository</Button>
  </Specimen>
  <Specimen label="Affirmative" code={'tone="signal"'}>
    <Button onclick={() => (publish = true)}>Publish release</Button>
  </Specimen>
  <Specimen label="With a reason" code="children">
    <Button tone="stop-quiet" onclick={() => (revoke = true)}>Revoke token</Button>
  </Specimen>
</Example>

<Example
  title="No question"
  note="An act that can be undone just happens and offers Undo in a toast"
>
  <Specimen label={archived ? 'Archived' : 'Active'}>
    <Button onclick={archived ? restore : archive}
      >{archived ? 'Restore repository' : 'Archive repository'}</Button
    >
  </Specimen>
</Example>

<ConfirmDialog
  bind:open={remove}
  title="Delete this repository?"
  consequence="Its settings, history and webhooks are removed for good"
  confirmLabel="Delete repository"
  tone="stop"
/>

<ConfirmDialog
  bind:open={publish}
  title="Publish 0.3.0?"
  consequence="Everyone who installs the package gets this version from now on"
  confirmLabel="Publish release"
/>

<ConfirmDialog
  bind:open={revoke}
  title="Revoke this token?"
  consequence="Every script that signs in with it stops working at once, and it cannot be restored"
  confirmLabel="Revoke token"
  tone="stop"
>
  <Field label="Reason" bind:value={reason} placeholder="Leaked in a build log" />
</ConfirmDialog>
