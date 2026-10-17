<script module lang="ts">
  export const section = { title: 'Page header', order: 65 };
</script>

<script lang="ts">
  import { BackLink, Breadcrumb, Button, PageHeader } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Eyebrow, title, description and actions"
  note="The actions centre on the whole copy stack, and move under it on a phone"
  layout="stack"
>
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
</Example>

<Example
  title="Long wrapping title"
  note="The title balances its lines, and the copy keeps its 8px rhythm when it wraps"
  layout="stack"
>
  <PageHeader
    level={4}
    eyebrow="Acme · Access"
    title="Bypass rules for the platform team's deployment repositories"
    description="People and apps listed here can push past the branch rules, and every push they make is written to the audit log"
  >
    {#snippet actions()}
      <Button tone="signal">Add a rule</Button>
    {/snippet}
  </PageHeader>
</Example>

<Example
  title="With a way up"
  note="A breadcrumb or a back link takes the eyebrow's place"
  layout="stack"
>
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
  <PageHeader level={4} title="Run 1842">
    {#snippet kicker()}<BackLink href="#page-header" label="All runs" />{/snippet}
  </PageHeader>
</Example>

<Example title="Title only" note="Not every page owes an eyebrow or a description" layout="stack">
  <PageHeader level={4} title="Activity" />
</Example>
