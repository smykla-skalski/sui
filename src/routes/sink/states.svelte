<script module lang="ts">
  export const section = { title: 'Empty and error states', order: 89 };
</script>

<script lang="ts">
  import { Button, EmptyState, ErrorState, FormError, ObjectList, ObjectRow } from '#lib';
  import Example from '../kit/Example.svelte';

  const repositories = ['smykla-skalski/sui', 'smykla-skalski/smyklot'];

  let retrying = $state(false);
  let recovered = $state(false);
  let refreshing = $state(false);
  let list = $state<HTMLElement>();

  /* The first retry succeeds, so the panel gives way to the rows and hands them focus. */
  function retry() {
    retrying = true;
    setTimeout(() => {
      retrying = false;
      recovered = true;
    }, 1200);
  }

  function refresh() {
    refreshing = true;
    setTimeout(() => (refreshing = false), 1200);
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
  note="The retry keeps focus while it runs, and the loaded rows take focus when it succeeds"
  layout="stack"
>
  {#if recovered}
    <div class="loaded">
      <div bind:this={list} tabindex="-1" class="rows">
        <ObjectList aria-label="Repositories">
          {#each repositories as name (name)}
            <ObjectRow>
              {#snippet main()}<span class="name">{name}</span>{/snippet}
            </ObjectRow>
          {/each}
        </ObjectList>
      </div>
      <Button onclick={() => (recovered = false)}>Show the failure again</Button>
    </div>
  {:else}
    <ErrorState
      title="Repositories could not be loaded"
      description="The server did not answer in time, so nothing on this page has changed"
      onretry={retry}
      busy={retrying}
      focusAfterRetry={() => list}
    />
  {/if}
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
    onretry={refresh}
    busy={refreshing}
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
  .loaded {
    display: grid;
    gap: var(--sui-space-4);
    justify-items: start;
  }

  .rows {
    border-radius: var(--sui-radius-control);
    justify-self: stretch;
    padding-inline: var(--sui-row-pad-default);
  }

  .rows:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .name {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .form {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
  }
</style>
