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
  let leaving = $state(false);
  let tokens = $state(['Deploy bot', 'Release script', 'Nightly backup']);
  let revoking = $state('');
  let revokeOpen = $state(false);

  // The sink's server refuses, so the question shows its pending and failed states.
  const refuse = () =>
    new Promise((_, reject) => setTimeout(() => reject(new Error('refused')), 900));

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
  title="Pending and failed"
  note="The act runs before the dialog closes, so a refusal keeps the question open and says so"
>
  <Specimen label="Refused" code="onconfirm returns a promise">
    <Button tone="stop-quiet" onclick={() => (leaving = true)}>Leave workspace</Button>
  </Specimen>
</Example>

<Example
  title="Removing the opener"
  note="When the confirmed act removes the row that asked, focus moves to the next row and never to the page"
  layout="stack"
>
  <Specimen label={`${tokens.length} tokens`}>
    <ul class="tokens" role="list">
      {#each tokens as token (token)}
        <li>
          <span class="token">{token}</span>
          <Button
            tone="stop-quiet"
            onclick={() => {
              revoking = token;
              revokeOpen = true;
            }}>Revoke {token}</Button
          >
        </li>
      {/each}
    </ul>
    {#if tokens.length === 0}
      <Button onclick={() => (tokens = ['Deploy bot', 'Release script', 'Nightly backup'])}
        >Restore the tokens</Button
      >
    {/if}
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

<ConfirmDialog
  bind:open={leaving}
  title="Leave this workspace?"
  consequence="You lose access to its repositories until an owner invites you again"
  confirmLabel="Leave workspace"
  tone="stop"
  onconfirm={refuse}
  failedLabel={() => 'The workspace needs one owner, so you cannot leave it yet'}
/>

<ConfirmDialog
  bind:open={revokeOpen}
  title={`Revoke ${revoking}?`}
  consequence="Every script that signs in with it stops working at once"
  confirmLabel="Revoke token"
  tone="stop"
  onconfirm={() => {
    tokens = tokens.filter((token) => token !== revoking);
  }}
/>

<style>
  .tokens {
    display: grid;
    gap: var(--sui-space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .tokens > li {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    justify-content: space-between;
  }

  .token {
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }
</style>
