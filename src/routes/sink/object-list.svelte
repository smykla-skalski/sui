<script module lang="ts">
  export const section = {
    title: 'Object list',
    order: 86,
    lead: 'The things a page is about, as rows that grow with their content. Values a reader compares across columns belong in a DataTable.',
    components: ['ObjectList', 'ObjectRow']
  };
</script>

<script lang="ts">
  import {
    Button,
    FactLine,
    Icon,
    IdentityRow,
    ObjectList,
    ObjectRow,
    Pill,
    RelativeTime,
    Section
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const synced = new Date(Date.now() - 12.5 * 60_000).toISOString();

  const repositories = [
    { name: 'smykla-skalski/sui', summary: ['Default branch main', '84 files up to date'] },
    { name: 'smykla-skalski/smyklot', summary: ['Default branch main', '3 rules would change'] },
    { name: 'smykla-skalski/ledger', summary: ['Default branch trunk', 'archived last year'] }
  ];

  let syncing = $state(false);

  function sync() {
    syncing = true;
    setTimeout(() => (syncing = false), 1200);
  }
</script>

<Example
  title="Rows"
  note="A linked row opens as a whole, and a row without a link stays still under the pointer"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Linked" code="href">
    <Section title="Repositories" level={4}>
      <ObjectList>
        <ObjectRow href="#object-list">
          {#snippet main()}
            <span class="name">smykla-skalski/sui</span>
            <span class="sum"
              ><FactLine><span>Default branch main</span><span>84 files up to date</span></FactLine
              ></span
            >
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Section>
  </Specimen>
  <Specimen label="Still">
    <Section title="Exports" level={4}>
      <ObjectList>
        <ObjectRow>
          {#snippet main()}
            <span class="name">Audit log export</span>
            <span class="sum">Written every night at 02:00</span>
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Section>
  </Specimen>
</Example>

<Example
  title="Content"
  note="The side holds marks and controls that stay pressable, and long words wrap instead of running under it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Status and action" code="side">
    <Section title="Repositories" level={4}>
      <ObjectList>
        <ObjectRow href="#object-list">
          {#snippet main()}
            <span class="name">smykla-skalski/sui</span>
            <span class="sum"
              ><FactLine
                ><span>Synced <RelativeTime value={synced} /></span><span>84 files up to date</span
                ></FactLine
              ></span
            >
          {/snippet}
          {#snippet side()}
            <Pill tone="success">Up to date</Pill>
            <Button loading={syncing} aria-label="Sync smykla-skalski/sui" onclick={sync}>
              {#snippet icon()}<Icon name="refresh" size="sm" />{/snippet}
              Sync
            </Button>
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Section>
  </Specimen>
  <Specimen label="Identity">
    <Section title="Members" level={4}>
      <ObjectList>
        <ObjectRow>
          {#snippet main()}
            <IdentityRow name="Ada Lovelace" handle="@ada" />
          {/snippet}
          {#snippet side()}
            <Pill tone="role">Owner</Pill>
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Section>
  </Specimen>
  <Specimen label="Long text">
    <Section title="Repositories" level={4}>
      <ObjectList>
        <ObjectRow href="#object-list">
          {#snippet main()}
            <span class="name"
              >smykla-skalski/an-unusually-long-repository-name-that-has-to-break-somewhere-on-a-phone</span
            >
            <span class="sum"
              >Three rules would change, and the sentence wraps rather than running under the side</span
            >
          {/snippet}
          {#snippet side()}
            <Pill tone="warning">3 changes</Pill>
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Section>
  </Specimen>
</Example>

<Example
  title="In context"
  note="Rows stand on hairlines inset by their padding, and their words keep the section title's edge"
  layout="stack"
  ground="canvas"
>
  <Section title="Repositories" level={4}>
    <ObjectList>
      {#each repositories as repository (repository.name)}
        <ObjectRow href="#object-list">
          {#snippet main()}
            <span class="name">{repository.name}</span>
            <span class="sum"
              ><FactLine
                >{#each repository.summary as fact (fact)}<span>{fact}</span>{/each}</FactLine
              ></span
            >
          {/snippet}
        </ObjectRow>
      {/each}
    </ObjectList>
  </Section>
</Example>

<style>
  .name {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sum {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
