<script module lang="ts">
  export const section = {
    title: 'Card',
    order: 61,
    lead: 'The surface for a group of related things. Reach for a Plate when the subject has a state to say beside its title.',
    components: ['Card']
  };
</script>

<script lang="ts">
  import { Button, Card, Icon, IconButton } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Parts"
  note="The note is the title's second line, and controls beside the title keep the card's inset"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Title and note" code="title note">
    <Card
      title="Repository access"
      note="Who can open this repository and what they can change"
      level={4}
    >
      <p class="copy">Three teams and two people have access</p>
    </Card>
  </Specimen>
  <Specimen label="Action" code="actions">
    <Card title="Branch rules" level={4}>
      {#snippet actions()}<Button>Edit rules</Button>{/snippet}
      <p class="copy">Pull requests into main need one approval and passing checks</p>
    </Card>
  </Specimen>
  <Specimen label="Icon action" code="actions">
    <Card title="Webhooks" note="Deliveries in the last 24 hours" level={4}>
      {#snippet actions()}<IconButton icon="refresh" label="Refresh deliveries" />{/snippet}
      <p class="copy">All 18 deliveries succeeded</p>
    </Card>
  </Specimen>
  <Specimen label="Footer" code="footer">
    <Card title="Rename the workspace" level={4}>
      {#snippet actions()}<IconButton icon="close" label="Close the rename form" />{/snippet}
      <p class="copy">Links to the old name redirect for 30 days</p>
      {#snippet footer()}
        <Button>Cancel</Button>
        <Button tone="signal">Rename</Button>
      {/snippet}
    </Card>
  </Specimen>
  <Specimen label="Older prop names" code="heading description">
    <Card heading="Usage this month" description="The older names still render" level={4}>
      <p class="copy">2,140 of 5,000 runs</p>
    </Card>
  </Specimen>
</Example>

<Example
  title="States"
  note="A card holding changes not saved yet takes the decision keyline"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Rest">
    <Card title="Merge rules" note="Saved 2 minutes ago" level={4}>
      <p class="copy">Squash merges keep the pull request title</p>
    </Card>
  </Specimen>
  <Specimen label="Unsaved" code="unsaved">
    <Card title="Merge rules" note="Two settings changed since the last save" level={4} unsaved>
      <p class="copy">Squash merges keep the pull request title</p>
    </Card>
  </Specimen>
</Example>

<Example
  title="Long title"
  note="A long title balances its lines and keeps its action on the first line"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Wrapping title and note">
    <Card
      title="Required status checks that every pull request into a protected branch must pass before it can merge into main"
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
  </Specimen>
</Example>

<Example
  title="In context"
  note="Cards take their 16px spacing from the container's gap and never from a margin"
  layout="stack"
  ground="canvas"
>
  <div class="stack">
    <Card title="Usage this month" level={4}>
      <p class="copy">2,140 of 5,000 runs</p>
    </Card>
    <Card title="Storage" level={4}>
      <p class="copy">84.7 MB of 1 GB</p>
    </Card>
  </div>
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
