<script module lang="ts">
  export const section = { title: 'Card', order: 61 };
</script>

<script lang="ts">
  import { Button, Card, Icon, IconButton } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Title, note and body"
  note="The note is the title's second line, and the body starts 16px under it"
  layout="stack"
>
  <Card
    title="Repository access"
    note="Who can open this repository and what they can change"
    level={4}
  >
    <p class="copy">Three teams and two people have access</p>
  </Card>
</Example>

<Example
  title="Actions beside the title"
  note="Controls centre on the title's cap line and never raise the head"
  layout="stack"
>
  <Card title="Branch rules" level={4}>
    {#snippet actions()}<Button>Edit rules</Button>{/snippet}
    <p class="copy">Pull requests into main need one approval and passing checks</p>
  </Card>
  <Card title="Webhooks" note="Deliveries in the last 24 hours" level={4}>
    {#snippet actions()}<IconButton icon="refresh" label="Refresh deliveries" />{/snippet}
    <p class="copy">All 18 deliveries succeeded</p>
  </Card>
</Example>

<Example
  title="Long wrapping title"
  note="A long title balances its lines and keeps its action on the first line"
  layout="stack"
>
  <Card
    title="Required status checks that every pull request into a protected branch must pass"
    note="Checks that report from a fork are counted the same as checks from the repository itself"
    level={4}
  >
    {#snippet actions()}
      <Button tone="add">
        {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
        Add a check
      </Button>
    {/snippet}
  </Card>
</Example>

<Example
  title="Footer"
  note="The footer closes on the head's track, so its last action sits as far from the edge as the head's"
  layout="stack"
>
  <Card title="Rename the workspace" level={4}>
    {#snippet actions()}<IconButton icon="close" label="Close the rename form" />{/snippet}
    <p class="copy">Links to the old name redirect for 30 days</p>
    {#snippet footer()}
      <Button tone="signal">Rename</Button>
      <Button>Cancel</Button>
    {/snippet}
  </Card>
</Example>

<Example
  title="A stack of cards"
  note="Cards take their 16px spacing from the container's gap and never from a margin"
  layout="stack"
>
  <div class="stack">
    <Card heading="Usage this month" description="The older prop names still render" level={4}>
      <p class="copy">2,140 of 5,000 runs</p>
    </Card>
    <Card title="Storage" level={4}>
      <p class="copy">84.7 MB of 1 GB</p>
    </Card>
  </div>
</Example>

<Example
  title="Unsaved"
  note="A card holding changes not saved yet takes the decision keyline"
  layout="stack"
>
  <Card title="Merge rules" note="Two settings changed since the last save" level={4} unsaved>
    <p class="copy">Squash merges keep the pull request title</p>
  </Card>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-body) / var(--sui-leading-body) var(--sui-sans);
    margin: 0;
  }

  .stack {
    display: grid;
    gap: var(--sui-rhythm-card-gap);
  }
</style>
