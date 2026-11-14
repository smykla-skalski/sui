<script module lang="ts">
  export const section = {
    title: 'Empty & Error States',
    lead: 'What a collection says when it has nothing to show, or when its request failed, with a next step. A form the server refused shows a FormError.',
    components: ['EmptyState', 'ErrorState', 'FormError']
  };
</script>

<script lang="ts">
  import { tick } from 'svelte';
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
  let failure = $state<HTMLDivElement | null>(null);
  let held = $state(0);
  let refused = $state<string | null>(null);
  /* The filtered specimen opens emptied, so every panel of the example shows an empty state at
     rest; it speaks only once the reader's own filter empties it, never on page load. */
  let filtered = $state(true);
  let toggled = $state(false);
  let filterBox = $state<HTMLElement>();

  /* The toggle is the empty panel's own action while the filter holds and a button under the
     rows once it is off, so the one that was pressed leaves with its state; focus moves to the
     toggle that takes its place. */
  async function toggleFilter() {
    filtered = !filtered;
    toggled = true;
    await tick();
    filterBox?.querySelector('button')?.focus();
  }

  /* The first retry succeeds, so the panel gives way to the rows and hands them focus. The rows
     hold the panel's height, so the panels beside them, stretched to it, keep theirs. */
  function retry() {
    retrying = true;
    setTimeout(() => {
      retrying = false;
      held = Math.ceil(failure?.getBoundingClientRect().height ?? 0);
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
    <Section title="Repositories" level={4}>
      <EmptyState
        title="No Repositories Match This Filter"
        description="Clear the filter or search for another name to see the rest of the list"
      >
        {#snippet action()}<Button tone="signal">Clear the Filter</Button>{/snippet}
      </EmptyState>
    </Section>
  </Specimen>
  <Specimen label="Nothing here yet">
    <Section title="Invitations" level={4}>
      <EmptyState
        title="No Invitations Yet"
        description="People you invite to this workspace appear here until they accept"
      >
        {#snippet action()}<Button tone="signal">Invite People</Button>{/snippet}
      </EmptyState>
    </Section>
  </Specimen>
  <Specimen label={filtered ? 'Emptied by a filter' : 'Filtered list'}>
    <Section title="Repositories" level={4} id="sink-states-filtered">
      <div class="loaded" bind:this={filterBox}>
        {#if filtered}
          <EmptyState
            live={toggled}
            title="No Archived Repositories"
            description="Archive a repository from its settings and it appears here"
          >
            {#snippet action()}<Button tone="signal" onclick={toggleFilter}
                >Show Every Repository</Button
              >{/snippet}
          </EmptyState>
        {:else}
          <div class="rows">
            <ObjectList aria-labelledby="sink-states-filtered">
              {#each repositories as name (name)}
                <ObjectRow>
                  {#snippet main()}<span class="name">{name}</span>{/snippet}
                </ObjectRow>
              {/each}
            </ObjectList>
          </div>
          <div><Button onclick={toggleFilter}>Show Archived Only</Button></div>
        {/if}
      </div>
    </Section>
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
        <div class="loaded" style:min-block-size="{held}px">
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
          bind:element={failure}
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
    <div class="measure">
      <FormError message="The invitation expired before anyone accepted it" />
    </div>
  </Specimen>
  <Specimen label="On submit">
    <div class="form measure">
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
      <Button type="submit" tone="signal" class="action">Create the Workspace</Button>
    </form>
  </Specimen>
</Example>

<style>
  .loaded {
    align-content: start;
    display: grid;
    gap: var(--sui-space-4);
  }

  /* Rows take back the last row's padding the list hands to the section, so a button under them
     stands a row's pitch off, and recovered rows that take focus have a ring that frames them
     whole, past the title's edge too. */
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

  /* A form keeps a form's measure on a stage as wide as the page, its refusals too. */
  .measure {
    max-inline-size: 40rem;
  }

  /* The summary heads a form, so its fields stand a form's 20px apart and its action a step
     further, the form's close (L-35). */
  .summary {
    gap: var(--sui-space-5);
    justify-items: stretch;
    max-inline-size: 40rem;
  }

  .summary > :global(.action) {
    margin-block-start: var(--sui-space-1);
  }
</style>
