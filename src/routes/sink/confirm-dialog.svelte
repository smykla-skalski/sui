<script module lang="ts">
  export const section = {
    title: 'Confirm Dialog',
    lead: 'A question asked before an act that cannot be undone or would discard work. An act that can be undone just happens and offers Undo.',
    components: ['ConfirmDialog']
  };
</script>

<script lang="ts">
  import { Button, ConfirmDialog, Field, Modal, toast } from '#lib';
  import Example from '../kit/Example.svelte';
  import Pair from '../kit/Pair.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let remove = $state(false);
  let publish = $state(false);
  let revoke = $state(false);
  let archived = $state(false);
  let reason = $state('');
  let leaving = $state(false);
  let tokens = $state(['Deploy Bot', 'Release Script', 'Nightly Backup']);
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
  layout="grid"
  ground="canvas"
  --specimen-min="30rem"
  --specimen-justify="space-between"
  --specimen-max="30rem"
  --example-phone-pad="var(--sui-space-3)"
  --example-max="calc(67.5rem + 2 * var(--sui-stroke))"
>
  <Specimen label="Destructive">
    <ConfirmDialog
      preview
      title="Delete This Repository?"
      consequence="Its settings, history and webhooks are removed for good"
      confirmLabel="Delete Repository"
      tone="stop"
    />
  </Specimen>
  <Specimen label="Affirmative">
    <ConfirmDialog
      preview
      title="Publish 0.3.0?"
      consequence="Everyone who installs it gets this version from now on"
      confirmLabel="Publish Release"
    />
  </Specimen>
</Example>

<Pair lead="33rem">
  <Example
    title="With a Reason"
    note="Anything the answer needs goes in the body under the consequence"
    layout="stack"
    ground="canvas"
    --example-phone-pad="var(--sui-space-3)"
    --example-max="33rem"
  >
    <Specimen label="Reason field">
      <ConfirmDialog
        preview
        title="Yank 0.2.1?"
        consequence="Nobody can install 0.2.1 again, and the version number is never reused"
        confirmLabel="Yank Release"
        tone="stop"
      >
        <Field label="Reason" placeholder="Ships a broken migration…" />
      </ConfirmDialog>
    </Specimen>
  </Example>

  <Example
    title="Removing the Opener"
    note="When the confirmed act removes the row that asked, focus moves to the next row and never to the page"
    layout="stack"
    --example-max="33rem"
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
        <Button onclick={() => (tokens = ['Deploy Bot', 'Release Script', 'Nightly Backup'])}
          >Restore the Tokens</Button
        >
      {/if}
    </Specimen>
  </Example>
</Pair>

<Example
  title="Pending & Failed"
  note="The act runs before the dialog closes, so a refusal keeps the question open and says so"
  layout="grid"
  ground="canvas"
  --specimen-min="30rem"
  --specimen-justify="space-between"
  --specimen-max="30rem"
  --example-phone-pad="var(--sui-space-3)"
  --example-max="calc(67.5rem + 2 * var(--sui-stroke))"
>
  <!-- Drawn by Modal, since the question reaches these states only while its act runs. -->
  <Specimen label="Pending">
    <Modal
      preview
      busy
      role="alertdialog"
      title="Leave This Workspace?"
      description="You lose access to its repositories until an owner invites you again"
    >
      {#snippet footer()}
        <Button disabled>Cancel</Button>
        <Button tone="stop" loading reserve>Leave Workspace</Button>
      {/snippet}
    </Modal>
  </Specimen>
  <Specimen label="Refused">
    <Modal
      preview
      role="alertdialog"
      title="Leave This Workspace?"
      description="You lose access to its repositories until an owner invites you again"
      error="The workspace needs 1 owner, so you cannot leave it yet"
    >
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="stop" reserve>Leave Workspace</Button>
      {/snippet}
    </Modal>
  </Specimen>
</Example>

<Pair lead="33rem">
  <Example
    title="Asking"
    note="Cancel opens focused on a destructive question, and the confirm action opens focused on an affirmative one"
    layout="grid"
    --specimen-min="max(calc((100% - var(--sui-space-6)) / 2 - 1px), 8.5rem)"
    --example-max="33rem"
  >
    <Specimen label="Destructive">
      <Button tone="stop-quiet" onclick={() => (remove = true)}>Delete Repository</Button>
    </Specimen>
    <Specimen label="Affirmative">
      <Button onclick={() => (publish = true)}>Publish Release</Button>
    </Specimen>
    <Specimen label="With a reason">
      <Button tone="stop-quiet" onclick={() => (revoke = true)}>Revoke Token</Button>
    </Specimen>
    <Specimen label="Refused">
      <Button tone="stop-quiet" onclick={() => (leaving = true)}>Leave Workspace</Button>
    </Specimen>
  </Example>

  <Example
    title="No Question"
    note="An act that can be undone just happens and offers Undo in a toast"
    --example-max="33rem"
  >
    <Specimen label={archived ? 'Archived' : 'Active'}>
      <Button onclick={archived ? restore : archive}
        >{archived ? 'Restore Repository' : 'Archive Repository'}</Button
      >
    </Specimen>
  </Example>
</Pair>

<ConfirmDialog
  bind:open={remove}
  title="Delete This Repository?"
  consequence="Its settings, history and webhooks are removed for good"
  confirmLabel="Delete Repository"
  tone="stop"
/>

<ConfirmDialog
  bind:open={publish}
  title="Publish 0.3.0?"
  consequence="Everyone who installs it gets this version from now on"
  confirmLabel="Publish Release"
/>

<ConfirmDialog
  bind:open={revoke}
  title="Revoke This Token?"
  consequence="Every script that signs in with it stops working at once, and it cannot be restored"
  confirmLabel="Revoke Token"
  tone="stop"
>
  <!-- A form of its own, so the reason is one form's field, and Enter in it never revokes. -->
  <form class="form" onsubmit={(event) => event.preventDefault()}>
    <Field label="Reason" bind:value={reason} placeholder="Leaked in a build log…" />
  </form>
</ConfirmDialog>

<ConfirmDialog
  bind:open={leaving}
  title="Leave This Workspace?"
  consequence="You lose access to its repositories until an owner invites you again"
  confirmLabel="Leave Workspace"
  tone="stop"
  onconfirm={refuse}
  failedLabel={() => 'The workspace needs 1 owner, so you cannot leave it yet'}
/>

<ConfirmDialog
  bind:open={revokeOpen}
  title={`Revoke ${revoking}?`}
  consequence="Every script that signs in with it stops working at once"
  confirmLabel="Revoke Token"
  tone="stop"
  onconfirm={() => {
    tokens = tokens.filter((token) => token !== revoking);
  }}
/>

<style>
  .form {
    display: contents;
  }

  /* Every Revoke action shares the widest one's column, so their edges line up beside the
     names, and at a large text size the column narrows and its words wrap before a name
     breaks or the row leaves the page. */
  .tokens {
    --sui-local-button-span: 100%;
    display: grid;
    column-gap: var(--sui-space-3);
    grid-template-columns: minmax(min-content, 1fr) minmax(0, max-content);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .tokens > li {
    align-items: center;
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    padding-block: var(--sui-space-2);
  }

  .tokens > li + li {
    border-block-start: var(--sui-stroke) solid var(--sui-border-divider);
  }

  .tokens > li:first-child {
    padding-block-start: 0;
  }

  .tokens > li:last-child {
    padding-block-end: 0;
  }

  .token {
    color: var(--sui-text-primary);
    font: var(--sui-weight-medium) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
  }
</style>
