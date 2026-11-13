<script module lang="ts">
  export const section = {
    title: 'Empty & Error States',
    lead: 'What a collection says when it has nothing to show, or when its request failed, with a next step. A form the server refused shows a FormError.',
    components: ['EmptyState', 'ErrorState', 'FormError']
  };
</script>

<script lang="ts">
  import { clock } from '../kit/format.js';
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
    refused = refused ? null : 'That name is taken by another workspace, so choose another one';
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
      : `Fix ${problems.length === 1 ? '1 problem' : `${problems.length} problems`} to create the workspace`
  );

  function send(event: SubmitEvent) {
    event.preventDefault();
    sent = true;
    attempts += 1;
  }
</script>

<Example
  title="Empty State"
  note="A plain title, one explanation and a next step, with no decorative icon"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Next step">
    <EmptyState
      title="No Repositories Match This Filter"
      description="Clear the filter or search for another name to see the rest of the list"
    >
      {#snippet action()}<Button tone="signal">Clear the Filter</Button>{/snippet}
    </EmptyState>
  </Specimen>
  <Specimen label="Nothing here yet">
    <EmptyState
      title="No Invitations Yet"
      description="People you invite to this workspace appear here until they accept"
    >
      {#snippet action()}<Button tone="signal">Invite People</Button>{/snippet}
    </EmptyState>
  </Specimen>
  <Specimen label={filtered ? 'Emptied by a filter' : 'Filtered list'}>
    <div class="filtered">
      <Button onclick={() => (filtered = !filtered)}
        >{filtered ? 'Show Every Repository' : 'Show Archived Only'}</Button
      >
      {#if filtered}
        <EmptyState
          live
          title="No Archived Repositories"
          description="Archive a repository from its settings and it appears here"
        >
          {#snippet action()}<Button tone="signal">Open Repository Settings</Button>{/snippet}
        </EmptyState>
      {:else}
        <p class="name">smykla-skalski/sui</p>
      {/if}
    </div>
  </Specimen>
</Example>

<Example
  title="Error State"
  note="The retry keeps focus while it runs, and the loaded rows take focus when it succeeds"
  layout="grid"
  ground="canvas"
>
  <Specimen label={recovered ? 'Recovered' : 'Retry'}>
    <Section title="Repositories" level={4} id="sink-states-recovered">
      {#if recovered}
        <div class="loaded">
          <div bind:this={list} tabindex="-1" class="rows">
            <ObjectList aria-labelledby="sink-states-recovered">
              {#each repositories as name (name)}
                <ObjectRow>
                  {#snippet main()}<span class="name">{name}</span>{/snippet}
                </ObjectRow>
              {/each}
            </ObjectList>
          </div>
          <div><Button onclick={() => (recovered = false)}>Show the Failure Again</Button></div>
        </div>
      {:else}
        <ErrorState
          title="Repositories Could Not Load"
          description="The server did not answer in time, so nothing on this page has changed"
          onretry={retry}
          busy={retrying}
          focusAfterRetry={() => list}
        />
      {/if}
    </Section>
  </Specimen>
  <Specimen label="No retry">
    <Section title="Members" level={4}>
      <ErrorState
        title="Access Is Not Available"
        description="Only viewers and owners of this workspace see its members"
        step="Ask an owner to give you the viewer role"
      />
    </Section>
  </Specimen>
  <Specimen label={settled ? 'Retried into words' : 'Retry that leaves no control'}>
    <Section title="Usage" level={4}>
      {#if settled}
        <p class="name">Usage for this month loaded</p>
      {:else}
        <ErrorState
          title="Usage Could Not Load"
          description="The server did not answer in time"
          onretry={() => (settled = true)}
        />
      {/if}
    </Section>
  </Specimen>
</Example>

<Example
  title="Over Loaded Content"
  note="A failed refresh becomes one line above the rows it leaves in place"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Refresh failed">
    <Section title="Repositories" level={4}>
      <ErrorState
        overContent
        title="The List Could Not Refresh"
        description="Showing what loaded at {clock(14, 2)}"
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
  title="Form Error"
  note="A server refusal is announced, and a long form’s summary takes focus with a link to each field"
  layout="stack"
>
  <Specimen label="Refusal">
    <FormError message="The invitation expired before anyone accepted it" />
  </Specimen>
  <Specimen label="On submit">
    <div class="form">
      <Button onclick={submit}>{refused ? 'Clear the Refusal' : 'Submit the Form'}</Button>
      <FormError message={refused} />
    </div>
  </Specimen>
  <Specimen label="Summary of fields to fix">
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
        autocomplete="email"
        required
        error={contactProblem}
        bind:value={contact}
      />
      <Button type="submit" tone="signal">Create the Workspace</Button>
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
    block-size: var(--sui-block-snap-even);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-body) / var(--sui-row-copy-leading)
      var(--sui-sans);
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .form {
    display: grid;
    gap: var(--sui-space-2);
    justify-items: start;
  }

  /* A form keeps a form's measure on a stage as wide as the page. */
  .summary {
    gap: var(--sui-space-4);
    justify-items: stretch;
    max-inline-size: 40rem;
  }
</style>
