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
    Card,
    FactLine,
    Icon,
    IdentityRow,
    ObjectList,
    ObjectRow,
    Pill,
    RelativeTime
  } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const synced = new Date(Date.now() - 12 * 60_000).toISOString();

  const repositories = [
    { name: 'smykla-skalski/sui', summary: ['Default branch main', '84 files in step'] },
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
    <Card>
      <ObjectList>
        <ObjectRow href="#object-list">
          {#snippet main()}
            <span class="name">smykla-skalski/sui</span>
            <span class="sum"
              ><FactLine><span>Default branch main</span><span>84 files in step</span></FactLine
              ></span
            >
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Card>
  </Specimen>
  <Specimen label="Still">
    <Card>
      <ObjectList>
        <ObjectRow>
          {#snippet main()}
            <span class="name">Audit log export</span>
            <span class="sum">Written every night at 02:00</span>
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Card>
  </Specimen>
</Example>

<Example
  title="Content"
  note="The side holds marks and controls that stay pressable, and long words wrap instead of running under it"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Status and action" code="side">
    <Card>
      <ObjectList>
        <ObjectRow href="#object-list">
          {#snippet main()}
            <span class="name">smykla-skalski/sui</span>
            <span class="sum"
              ><FactLine
                ><span>Synced <RelativeTime value={synced} /></span><span>84 files in step</span
                ></FactLine
              ></span
            >
          {/snippet}
          {#snippet side()}
            <Pill tone="success">In step</Pill>
            <Button loading={syncing} aria-label="Sync smykla-skalski/sui" onclick={sync}>
              {#snippet icon()}<Icon name="refresh" size="sm" />{/snippet}
              Sync
            </Button>
          {/snippet}
        </ObjectRow>
      </ObjectList>
    </Card>
  </Specimen>
  <Specimen label="Identity">
    <Card>
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
    </Card>
  </Specimen>
  <Specimen label="Long text">
    <Card>
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
    </Card>
  </Specimen>
</Example>

<Example
  title="In context"
  note="Rows stand on hairlines inset by their padding, and the last row closes on the card's frame"
  layout="stack"
  ground="canvas"
>
  <Card title="Repositories" level={4}>
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
  </Card>
</Example>

<style>
  .name {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-primary);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sum {
    block-size: var(--sui-block-snap);
    color: var(--sui-text-muted);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
