<script module lang="ts">
  export const section = {
    title: 'Empty and error states',
    order: 89,
    lead: 'What a collection says when it has nothing to show, or when its request failed, with a next step. A form the server refused shows a FormError.',
    components: ['EmptyState', 'ErrorState', 'FormError']
  };
</script>

<script lang="ts">
  import { Button, Card, EmptyState, ErrorState, FormError, ObjectList, ObjectRow } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories = ['smykla-skalski/sui', 'smykla-skalski/smyklot'];

  let retrying = $state(false);
  let recovered = $state(false);
  let refreshing = $state(false);
  let list = $state<HTMLElement>();
  let refused = $state<string | null>(null);

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

  function submit() {
    refused = refused ? null : 'That name is taken by another workspace, so pick another one';
  }
</script>

<Example
  title="Empty state"
  note="A plain title, one explanation and a next step, with no decorative icon"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Next step" code="action">
    <EmptyState
      title="No repositories match this filter"
      description="Clear the filter or search for another name to see the rest of the list"
    >
      {#snippet action()}<Button>Clear the filter</Button>{/snippet}
    </EmptyState>
  </Specimen>
  <Specimen label="Nothing to do yet">
    <EmptyState
      title="No invitations yet"
      description="People you invite to this workspace appear here until they accept"
    />
  </Specimen>
</Example>

<Example
  title="Error state"
  note="The retry keeps focus while it runs, and the loaded rows take focus when it succeeds"
  layout="grid"
  ground="canvas"
>
  <Specimen label={recovered ? 'Recovered' : 'Retry'} code="onretry busy focusAfterRetry">
    {#if recovered}
      <div class="loaded">
        <div bind:this={list} tabindex="-1" class="rows">
          <Card>
            <ObjectList aria-label="Repositories">
              {#each repositories as name (name)}
                <ObjectRow>
                  {#snippet main()}<span class="name">{name}</span>{/snippet}
                </ObjectRow>
              {/each}
            </ObjectList>
          </Card>
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
  </Specimen>
  <Specimen label="No retry">
    <ErrorState
      title="Access is not available"
      description="Ask an owner of this workspace to give you the viewer role"
    />
  </Specimen>
</Example>

<Example
  title="Over loaded content"
  note="A failed refresh becomes one line above the rows it leaves in place"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Refresh failed" code="overContent">
    <Card>
      <ErrorState
        overContent
        title="The list could not be refreshed"
        description="Showing what loaded at 14:02"
        onretry={refresh}
        busy={refreshing}
      />
      <ObjectList aria-label="Repositories">
        {#each repositories as name (name)}
          <ObjectRow>
            {#snippet main()}<span class="name">{name}</span>{/snippet}
          </ObjectRow>
        {/each}
      </ObjectList>
    </Card>
  </Specimen>
</Example>

<Example title="Form error" note="A server refusal is announced and carries no margin of its own">
  <Specimen label="Refusal">
    <FormError message="The invitation expired before it was accepted" />
  </Specimen>
  <Specimen label="On submit" code="message">
    <div class="form">
      <Button onclick={submit}>{refused ? 'Clear the refusal' : 'Submit the form'}</Button>
      <FormError message={refused} />
    </div>
  </Specimen>
</Example>

<style>
  .loaded {
    display: grid;
    gap: var(--sui-space-4);
    justify-items: start;
  }

  .rows {
    border-radius: var(--sui-radius-surface);
    justify-self: stretch;
  }

  .rows:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .name {
    block-size: var(--sui-block-snap);
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
