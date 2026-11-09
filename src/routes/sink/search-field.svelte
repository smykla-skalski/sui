<script module lang="ts">
  export const section = {
    title: 'Search Field',
    lead: 'A search that narrows what is already on screen. A value chosen from suggestions as the reader types is a Combobox.',
    components: ['SearchField']
  };
</script>

<script lang="ts">
  import { Button, FactLine, SearchField, SettingList, SettingRow } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const repositories = ['atlas', 'atlas-gui', 'atlas-website', 'smyklot', 'sui', 'mesh-perf'];

  let query = $state('');
  let people = $state('Grace');
  let teams = $state('pl');
  let filter = $state('atlas');
  const matches = $derived(
    repositories.filter((name) => name.includes(filter.trim().toLowerCase()))
  );
  let searched = $state('Nothing searched yet');
  let audit = $state('');

  function search(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
    event.preventDefault();
    searched = `Searched for ${new FormData(event.currentTarget).get('q')}`;
  }
</script>

<Example
  title="States"
  --example-max="54rem"
  --specimen-row-gap="var(--sui-space-6)"
  note="Empty with an example query, filled with its clear button, invalid with its error and disabled, and Escape clears the query before it closes anything"
  layout="grid"
  --specimen-min="21rem"
>
  <Specimen label="Empty">
    <SearchField label="Search the projects" placeholder="acme-web…" bind:value={query} />
  </Specimen>
  <Specimen label="Filled">
    <SearchField label="Search the people" placeholder="Jane Doe…" bind:value={people} />
  </Specimen>
  <Specimen label="Invalid">
    <SearchField
      label="Search the teams"
      placeholder="platform…"
      error="Enter at least 3 characters to search"
      bind:value={teams}
    />
  </Specimen>
  <Specimen label="Disabled">
    <SearchField label="Search the locked projects" value="Locked" disabled />
  </Specimen>
</Example>

<!-- Each tier says the height it draws. A phone or a touch screen lifts every tier to the touch
     height, so there one specimen stands for all three. -->
{#snippet defaultTier()}<FactLine
    ><span><span class="fine">Default</span><span class="coarse">All tiers</span></span><span
      ><span class="fine">34 px</span><span class="coarse">44 px</span></span
    ></FactLine
  >{/snippet}
{#snippet tallTier()}<FactLine><span>Tall</span><span>40 px</span></FactLine>{/snippet}
{#snippet touchTier()}<FactLine><span>Touch</span><span>44 px</span></FactLine>{/snippet}

<Example
  title="Tiers"
  --example-max="54rem"
  note="34 px by default and 44 px on phones, and a surface may opt into 40 px with the clear button centred"
  layout="grid"
>
  <Specimen label={defaultTier}>
    <SearchField label="Search the teams" placeholder="Platform team…" value="Platform" />
  </Specimen>
  <Specimen label={tallTier}>
    <div class="tall">
      <SearchField label="Search the members" placeholder="octocat…" value="Bart" />
    </div>
  </Specimen>
  <Specimen label={touchTier}>
    <div class="touch">
      <SearchField label="Search the repositories" placeholder="sui…" value="sui" />
    </div>
  </Specimen>
</Example>

<Example
  title="In a Form"
  --example-max="54rem"
  note="A search the form sends refuses a query its constraints reject and says why under the field"
  layout="pairs"
>
  <Specimen label={searched}>
    <form class="search" onsubmit={search}>
      <SearchField
        label="Search the audit log"
        name="q"
        required
        minlength={3}
        validationMessage="Enter at least 3 characters to search"
        placeholder="deploy…"
        bind:value={audit}
      />
      <div class="actions">
        <Button type="submit" tone="signal">Search Events</Button>
        <Button tone="ghost" onclick={() => (audit = 'valid')}>Fix the Audit Query</Button>
      </div>
    </form>
  </Specimen>
  <Specimen label="Refused, too short">
    <div class="search">
      <SearchField
        label="Search the audit log"
        placeholder="deploy…"
        value="de"
        error="Enter at least 3 characters to search"
      />
      <div class="actions"><Button tone="signal">Search Events</Button></div>
    </div>
  </Specimen>
</Example>

<Example
  title="Soft Hold"
  --example-max="35rem"
  note="A saving setting keeps the clear action in place but refuses it"
  layout="stack"
>
  <Specimen label="Pending">
    <SettingList>
      <SettingRow name="Saved search" pending stacked>
        {#snippet control({ id, describedby })}
          <SearchField
            {id}
            aria-describedby={describedby}
            label="Search the held projects"
            hideLabel
            value="Held"
          />
        {/snippet}
      </SettingRow>
    </SettingList>
  </Specimen>
</Example>

<Example
  title="In Context"
  --example-max="35rem"
  note="A status under the field says how many match and a screen reader hears it, so the field never disables itself"
  layout="grid"
>
  <div class="filter">
    <SearchField label="Filter the repositories" placeholder="sui…" bind:value={filter} />
    <p class="result" role="status">{matches.length} of {repositories.length} repositories match</p>
  </div>
</Example>

<div class="fill">
  <Example
    title="Narrow Width"
    --example-max="calc(16rem + 2 * var(--sui-space-4))"
    note="The field fills the room it has, and a long query scrolls inside it"
    layout="stack"
  >
    <Specimen label="Long query">
      <div class="narrow">
        <SearchField
          label="Search the audit log"
          value="registry.example.com/platform/control-plane"
        />
      </div>
    </Specimen>
  </Example>
</div>

<style>
  .tall,
  .touch {
    display: grid;
    inline-size: 100%;
  }

  .tall {
    --sui-local-control-height: var(--sui-control-height);
  }

  .touch {
    --sui-local-control-height: var(--sui-touch-target);
  }

  .coarse {
    display: none;
  }

  @media (max-width: 47.9375rem), (pointer: coarse) {
    .fine,
    :global(.specimen):has(.tall, .touch) {
      display: none;
    }

    .coarse {
      display: inline;
    }
  }

  .filter {
    display: grid;
    gap: var(--sui-space-3);
  }

  .search {
    display: grid;
    gap: var(--sui-space-5);
  }

  /* The actions end the form a step past the field's own gap, so they read as its close (L-35). */
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-3);
    margin-block-start: var(--sui-space-1);
  }

  .narrow {
    inline-size: min(100%, 16rem);
  }

  .result {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  /* The narrow frame keeps the field's 16rem and the stage's 16px pad on a wide page; on a
     phone it fills the column, as every other frame does (L-55). */
  @media (max-width: 47.9375rem) {
    .fill :global(.example) {
      --example-max: none;
    }
  }
</style>
