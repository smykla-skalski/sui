<script module lang="ts">
  export const section = {
    title: 'Card',
    order: 61,
    lead: "A box only for a peer summary that links to its page, a feed entry, a bare page's one box or the danger zone. For anything else, reach for a Section.",
    components: ['Card']
  };
</script>

<script lang="ts">
  import { ActionMenu, Button, Card, Field, Icon, Switch, type ActionMenuItem } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  const nothing = () => {};
  let nightly = $state(true);

  const rules: ActionMenuItem[] = [
    { label: 'Add a rule', icon: 'plus', onselect: nothing },
    { label: 'Show the history', icon: 'history', onselect: nothing }
  ];
</script>

<Example
  title="Linked peers"
  note="Each card is one link named by its title, a control inside it stays pressable, and peers take their 16px from the grid's gap"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Three peers" code="href">
    <div class="peers">
      <Card href="#card" title="Repositories" description="16 in acme" level={4}>
        <p class="copy">3 differ from the saved settings</p>
      </Card>
      <Card href="#card" title="Rules" description="Branch, merge and review" level={4}>
        {#snippet actions()}
          <ActionMenu label="Rule actions" icon="more" items={rules} align="end" />
        {/snippet}
        <p class="copy">12 rules, 2 changed this week</p>
      </Card>
      <Card href="#card" title="Members" description="People and apps in acme" level={4}>
        {#snippet actions()}<Button tone="ghost">Invite</Button>{/snippet}
        <p class="copy">8 people and 2 apps</p>
      </Card>
    </div>
  </Specimen>
</Example>

<Example
  title="Head actions"
  note="The title's cap stands the card's inset from the top beside any control, and a framed control's top stands there too"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Framed, menu, ghost and switch" code="href actions">
    <div class="peers wide">
      <Card href="#card" title="Branch rules" level={4}>
        {#snippet actions()}<Button>Edit</Button>{/snippet}
        <p class="copy">Pull requests into main need one approval</p>
      </Card>
      <Card href="#card" title="Deploy keys" level={4}>
        {#snippet actions()}
          <ActionMenu label="Deploy key actions" icon="more" items={rules} align="end" />
        {/snippet}
        <p class="copy">Two keys can push</p>
      </Card>
      <Card href="#card" title="Webhooks" level={4}>
        {#snippet actions()}<Button tone="ghost">Refresh</Button>{/snippet}
        <p class="copy">All 18 deliveries succeeded</p>
      </Card>
      <Card href="#card" title="Nightly sync" level={4}>
        {#snippet actions()}
          <Switch aria-label="Run the nightly sync" bare bind:checked={nightly} />
        {/snippet}
        <p class="copy">Runs at 02:00 every day</p>
      </Card>
    </div>
  </Specimen>
</Example>

<Example
  title="Danger zone"
  note="The page's danger zone wears a danger keyline and title, never a filled ground, and holds the acts that cannot be undone"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Danger zone" code={'tone="danger" footer'}>
    <Card
      title="Danger zone"
      description="Deleting the workspace removes the rules and history of its 16 repositories for everyone"
      tone="danger"
      level={4}
    >
      {#snippet footer()}<Button tone="stop-quiet">Delete the workspace</Button>{/snippet}
    </Card>
  </Specimen>
</Example>

<Example
  title="Bare page"
  note="The one box on a page that holds nothing else, with its actions in a footer row as tall as they are"
  layout="stack"
  ground="canvas"
>
  <Specimen label="An expired invite" code="title description footer">
    <div class="bare">
      <Card title="This invite has expired" description="Invites last 7 days" level={4}>
        <p class="copy">Ask an owner of acme to send you a new one</p>
        {#snippet footer()}<Button tone="signal">Ask for a new invite</Button>{/snippet}
      </Card>
    </div>
  </Specimen>
</Example>

<Example
  title="States"
  note="A card holding changes not saved yet says so after its title, to a screen reader too, and takes the unsaved keyline"
  layout="grid"
  ground="canvas"
>
  <Specimen label="Rest">
    <div class="bare">
      <Card title="Workspace" description="Saved 2 minutes ago" level={4}>
        <Field label="Workspace name" value="acme" />
      </Card>
    </div>
  </Specimen>
  <Specimen label="Unsaved" code="unsaved">
    <div class="bare">
      <Card title="Workspace" description="Changed since the last save" level={4} unsaved>
        <Field label="Workspace name" value="acme-platform" />
      </Card>
    </div>
  </Specimen>
</Example>

<Example
  title="Long title"
  note="A long title balances its lines and keeps its action on the first line"
  layout="stack"
  ground="canvas"
>
  <Specimen label="Wrapping title and description" code="href actions">
    <Card
      href="#card"
      title="Required status checks that every pull request into a protected branch must pass before it can merge"
      description="Checks that report from a fork count the same as checks from the repository itself"
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
  <Specimen label="In 20rem" code="href">
    <div class="narrow">
      <Card href="#card" title="Storage" description="Across every repository" level={4}>
        <p class="copy">84.7 MB of 1 GB</p>
      </Card>
    </div>
  </Specimen>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  .peers {
    display: grid;
    gap: var(--sui-rhythm-card-gap);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  }

  /* Room for a head control beside each title. */
  .wide {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  }

  /* A page with nothing else on it: its one box stands centred on the page's ground. */
  .bare {
    background: var(--sui-canvas);
    display: grid;
    grid-template-columns: min(100%, 26rem);
    justify-content: center;
    padding-block: var(--sui-space-8);
  }

  .narrow {
    inline-size: min(100%, 20rem);
  }
</style>
