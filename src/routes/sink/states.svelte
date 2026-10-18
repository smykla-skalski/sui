<script module lang="ts">
  export const section = {
    title: 'Empty and error states',
    order: 89,
    lead: 'What a collection says when it has nothing to show, or when its request failed, with a next step. A form the server refused shows a FormError.',
    components: ['EmptyState', 'ErrorState', 'FormError']
  };
</script>

<script lang="ts">
  import {
    Button,
    EmptyState,
    ErrorState,
    Field,
    FormError,
    ObjectList,
    ObjectRow,
    Section
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories = ['smykla-skalski/sui', 'smykla-skalski/smyklot'];

  let retrying = $state(false);
  let recovered = $state(false);
  let refreshing = $state(false);
  let settled = $state(false);
  let list = $state<HTMLElement>();
  let refused = $state<string | null>(null);
  let filtered = $state(false);

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

  let workspace = $state('');
  let contact = $state('');
  let sent = $state(false);
  let attempts = $state(0);
  const nameProblem = $derived(sent && !workspace.trim() ? 'Enter a workspace name' : undefined);
  const contactProblem = $derived(
    sent && !contact.includes('@') ? 'Enter an email address such as you@example.com' : undefined
  );
  const problems = $derived([
    ...(nameProblem ? [{ field: 'sink-states-workspace', message: nameProblem }] : []),
    ...(contactProblem ? [{ field: 'sink-states-contact', message: contactProblem }] : [])
  ]);
  const summary = $derived(
    problems.length === 0
      ? null
      : `Fix ${problems.length === 1 ? 'one problem' : `${problems.length} problems`} to create the workspace`
  );

  function send(event: SubmitEvent) {
    event.preventDefault();
    sent = true;
    attempts += 1;
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
  <Specimen label="Nothing here yet">
    <EmptyState
      title="No invitations yet"
      description="People you invite to this workspace appear here until they accept"
    >
      {#snippet action()}<Button>Invite people</Button>{/snippet}
    </EmptyState>
  </Specimen>
  <Specimen label={filtered ? 'Emptied by a filter' : 'Filtered list'} code="live">
    <div class="filtered">
      <Button onclick={() => (filtered = !filtered)}
        >{filtered ? 'Show every repository' : 'Show archived only'}</Button
      >
      {#if filtered}
        <EmptyState
          live
          title="No archived repositories"
          description="Archive a repository from its settings and it appears here"
        >
          {#snippet action()}<Button>Open repository settings</Button>{/snippet}
        </EmptyState>
      {:else}
        <p class="name">smykla-skalski/sui</p>
      {/if}
    </div>
  </Specimen>
</Example>

<Example
  title="Error state"
  note="The retry keeps focus while it runs, and the loaded rows take focus when it succeeds"
  layout="grid"
  ground="canvas"
>
  <Specimen label={recovered ? 'Recovered' : 'Retry'} code="onretry busy focusAfterRetry">
    <div class="loaded">
      <Section title="Repositories" level={4} id="sink-states-recovered">
        {#if recovered}
          <div bind:this={list} tabindex="-1" class="rows">
            <ObjectList aria-labelledby="sink-states-recovered">
              {#each repositories as name (name)}
                <ObjectRow>
                  {#snippet main()}<span class="name">{name}</span>{/snippet}
                </ObjectRow>
              {/each}
            </ObjectList>
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
      </Section>
      {#if recovered}
        <div><Button onclick={() => (recovered = false)}>Show the failure again</Button></div>
      {/if}
    </div>
  </Specimen>
  <Specimen label="No retry">
    <Section title="Members" level={4}>
      <ErrorState
        title="Access is not available"
        description="Ask an owner of this workspace to give you the viewer role"
      />
    </Section>
  </Specimen>
  <Specimen label={settled ? 'Retried into words' : 'Retry that leaves no control'}>
    <Section title="Usage" level={4}>
      {#if settled}
        <p class="name">Usage for this month loaded</p>
      {:else}
        <ErrorState
          title="Usage could not be loaded"
          description="The server did not answer in time"
          onretry={() => (settled = true)}
        />
      {/if}
    </Section>
  </Specimen>
</Example>

<Example
  title="Over loaded content"
  note="A failed refresh becomes one line above the rows it leaves in place"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Refresh failed" code="overContent">
    <Section title="Repositories" level={4}>
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
    </Section>
  </Specimen>
</Example>

<Example
  title="Form error"
  note="A server refusal is announced, and a long form's summary takes focus with a link to each field"
>
  <Specimen label="Refusal">
    <FormError message="The invitation expired before it was accepted" />
  </Specimen>
  <Specimen label="On submit" code="message">
    <div class="form">
      <Button onclick={submit}>{refused ? 'Clear the refusal' : 'Submit the form'}</Button>
      <FormError message={refused} />
    </div>
  </Specimen>
  <Specimen label="Summary of fields to fix" code="problems attempt">
    <form class="form summary" novalidate onsubmit={send}>
      <FormError message={summary} {problems} attempt={attempts} />
      <Field
        id="sink-states-workspace"
        label="Workspace name"
        required
        error={nameProblem}
        bind:value={workspace}
      />
      <Field
        id="sink-states-contact"
        label="Contact email"
        type="email"
        required
        error={contactProblem}
        bind:value={contact}
      />
      <Button type="submit">Create the workspace</Button>
    </form>
  </Specimen>
</Example>

<style>
  .filtered {
    display: grid;
    gap: var(--sui-space-3);
    justify-items: start;
  }

  .filtered > p {
    margin: 0;
  }

  .loaded {
    display: grid;
    gap: var(--sui-space-4);
  }

  /* The rows take focus once the retry succeeds, so the ring frames them whole: their reach past
     the title's edge, and the last row's padding the list hands back to the section. */
  .rows {
    border-radius: var(--sui-radius-control);
    margin-inline: calc(-1 * var(--sui-row-pad-default));
    padding: 0 var(--sui-row-pad-default) calc(var(--sui-row-pad-default) + var(--sui-row-hairline));
  }

  .rows:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }

  .name {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    text-box: trim-both cap alphabetic;
  }

  .form {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
  }

  .summary {
    gap: var(--sui-space-4);
    justify-items: stretch;
  }
</style>
