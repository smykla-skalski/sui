<script module lang="ts">
  export const section = {
    title: 'Card',
    order: 61,
    lead: 'The surface for a group of related things. Reach for a Plate when the subject has a state to say beside its title.',
    components: ['Card']
  };
</script>

<script lang="ts">
  import { ActionMenu, Button, Card, Icon, IconButton, type ActionMenuItem } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const nothing = () => {};

  const keys: ActionMenuItem[] = [
    { label: 'Add a deploy key', icon: 'plus', onselect: nothing },
    { label: 'Remove every key', icon: 'trash', tone: 'stop', onselect: nothing }
  ];
</script>

<Example
  title="Parts"
  note="The description is the title's second line, and a control beside the title keeps the card's inset to its ink"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Title and description" code="title description">
    <Card
      title="Repository access"
      description="Who can open this repository and what they can change"
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
  <Specimen label="Head action" code="actions">
    <Card title="Webhooks" description="Deliveries in the last 24 hours" level={4}>
      {#snippet actions()}<Button tone="ghost">Refresh</Button>{/snippet}
      <p class="copy">All 18 deliveries succeeded</p>
    </Card>
  </Specimen>
  <Specimen label="Menu" code="actions">
    <Card title="Deploy keys" level={4}>
      {#snippet actions()}
        <ActionMenu label="Deploy key actions" icon="more" items={keys} align="end" />
      {/snippet}
      <p class="copy">Two keys can push to this repository</p>
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
</Example>

<Example
  title="States"
  note="A card holding changes not saved yet stars its title, says so to a screen reader and takes the unsaved keyline"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Rest">
    <Card title="Merge rules" description="Saved 2 minutes ago" level={4}>
      <p class="copy">Squash merges keep the pull request title</p>
    </Card>
  </Specimen>
  <Specimen label="Unsaved" code="unsaved">
    <Card
      title="Merge rules"
      description="Two settings changed since the last save"
      level={4}
      unsaved
    >
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
  <Specimen label="Wrapping title and description">
    <Card
      title="Required status checks that every pull request into a protected branch must pass before it can merge into main"
      description="Checks that report from a fork are counted the same as checks from the repository itself"
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
  title="Narrow width"
  note="A card 36rem wide or narrower steps its inset from 20px to 16px, by its own width rather than the page's"
  layout="stack"
  ground="canvas"
>
  <Specimen label="In 20rem">
    <div class="narrow">
      <Card title="Storage" description="Across every repository" level={4}>
        <p class="copy">84.7 MB of 1 GB</p>
      </Card>
    </div>
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
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  .narrow {
    inline-size: min(100%, 20rem);
  }

  .stack {
    display: grid;
    gap: var(--sui-rhythm-card-gap);
  }
</style>
