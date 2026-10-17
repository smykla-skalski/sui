<script module lang="ts">
  export const section = { title: 'Empty and error states', order: 89 };
</script>

<script lang="ts">
  import { Button, EmptyState, ErrorState, FormError } from '#lib';
  import Example from '../kit/Example.svelte';

  let retrying = $state(false);

  function retry() {
    retrying = true;
    setTimeout(() => (retrying = false), 1200);
  }

  let refused = $state<string | null>(null);
</script>

<Example
  title="Empty state"
  note="A plain title, one explanation and a next step, with no decorative icon"
  layout="stack"
>
  <EmptyState
    title="No repositories match this filter"
    description="Clear the filter or search for another name to see the rest of the list"
  >
    {#snippet action()}<Button>Clear the filter</Button>{/snippet}
  </EmptyState>
  <EmptyState
    title="No invitations yet"
    description="People you invite to this workspace appear here until they accept"
  />
</Example>

<Example
  title="Error state"
  note="A failure says so, and the retry reports on itself while it runs"
  layout="stack"
>
  <ErrorState
    title="Repositories could not be loaded"
    description="The server did not answer in time, so nothing on this page has changed"
    onretry={retry}
    busy={retrying}
  />
  <ErrorState
    title="Access is not available"
    description="Ask an owner of this workspace to give you the viewer role"
  />
</Example>

<Example
  title="Over loaded content"
  note="A failed refresh becomes one line above the rows it leaves in place"
  layout="stack"
>
  <ErrorState
    overContent
    title="The list could not be refreshed"
    description="Showing what loaded at 14:02"
    onretry={retry}
    busy={retrying}
  />
</Example>

<Example title="Form error" note="A server refusal is announced and carries no margin of its own">
  <div class="form">
    <Button
      onclick={() =>
        (refused = refused ? null : 'That name is taken by another workspace, so pick another one')}
    >
      {refused ? 'Clear the refusal' : 'Submit the form'}
    </Button>
    <FormError message={refused} />
    <FormError message="The invitation expired before it was accepted" />
  </div>
</Example>

<style>
  .form {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
  }
</style>
