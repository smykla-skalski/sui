<script module lang="ts">
  export const section = {
    title: 'Page header',
    order: 65,
    lead: 'The top of a page: where it is, what it is called, what it is for and the controls that act on it. A group inside the page takes a Card title instead.',
    components: ['PageHeader', 'Breadcrumb', 'BackLink']
  };
</script>

<script lang="ts">
  import { BackLink, Breadcrumb, Button, PageHeader } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Parts"
  note="The actions centre on the whole copy stack, and move under it on a phone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Eyebrow, description and actions" code="eyebrow description actions">
    <PageHeader
      level={4}
      eyebrow="Acme · Sync"
      title="Repository settings"
      description="Rules every repository in this workspace is held to"
    >
      {#snippet actions()}
        <Button>Export</Button>
        <Button tone="signal">Save changes</Button>
      {/snippet}
    </PageHeader>
  </Specimen>
  <Specimen label="Title only" code="title">
    <PageHeader level={4} title="Activity" />
  </Specimen>
</Example>

<Example
  title="Breadcrumb and back link"
  note="A breadcrumb or a back link takes the eyebrow's place"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Breadcrumb" code="kicker">
    <PageHeader
      level={4}
      title="Sync schedule"
      description="When this repository is checked against its template"
    >
      {#snippet kicker()}
        <Breadcrumb
          items={[
            { label: 'Acme', href: '#page-header' },
            { label: 'Repositories', href: '#page-header' }
          ]}
        />
      {/snippet}
    </PageHeader>
  </Specimen>
  <Specimen label="Back link" code="kicker">
    <PageHeader level={4} title="Run 1842">
      {#snippet kicker()}<BackLink href="#page-header" label="All runs" />{/snippet}
    </PageHeader>
  </Specimen>
</Example>

<Example
  title="Long title"
  note="The title balances its lines, and the copy keeps its 8px rhythm when it wraps"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Wrapping title and description">
    <PageHeader
      level={4}
      eyebrow="Acme · Access"
      title="Bypass rules for the platform team's deployment and release repositories in every region"
      description="People and apps listed here can push past the branch rules, and every push they make is written to the audit log"
    >
      {#snippet actions()}
        <Button tone="signal">Add a rule</Button>
      {/snippet}
    </PageHeader>
  </Specimen>
</Example>
