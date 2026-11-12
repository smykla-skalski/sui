<script module lang="ts">
  export const section = {
    title: 'Plate',
    lead: 'A titled ground for one subject that says its state beside its name. A group with no state to say is a Card.',
    components: ['Plate']
  };
</script>

<script lang="ts">
  import { clock } from '../kit/format.js';
  import { Button, Callout, Icon, Plate } from '#lib';
  import Example from '../kit/Example.svelte';
  import Pair from '../kit/Pair.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let synced = $state(false);
</script>

<Example
  title="Head & Body"
  note="An empty plate still names its subject and state, and a body adds a title step and a rule"
  layout="pairs"
  ground="canvas"
>
  <Specimen label="Head only">
    <Plate title="Nightly Backup" level={4} state="Not run yet" icon="pending" />
  </Specimen>
  <Specimen label="With a body">
    <Plate title="Sync Status" level={4} state="Up to date" icon="success" tone="success">
      <p class="copy">Every repository matches its template</p>
    </Plate>
  </Specimen>
</Example>

<Pair even --pair-max="100%">
  <Example
    title="Long Title"
    note="A long title wraps beside the state, which stays on its first line and never moves the title"
    layout="stack"
    ground="canvas"
  >
    <Specimen label="Wrapping title">
      <Plate
        title="Configuration Drift across Repositories in the Platform Organisation"
        level={4}
        state="2 repositories differ"
        icon="warning"
        tone="warning"
      >
        <p class="copy">The 2 repositories changed their branch rules by hand</p>
      </Plate>
    </Specimen>
  </Example>

  <Example
    title="Changing State"
    note="The state sits in a polite status region, so a screen reader hears it change while focus stays on the button"
    layout="stack"
    ground="canvas"
  >
    <Specimen label="Announced">
      <Plate
        title="Template Sync"
        level={4}
        state={synced ? 'Up to date' : '3 repositories behind'}
        icon={synced ? 'success' : 'pending'}
        tone={synced ? 'success' : 'neutral'}
      >
        <div class="change">
          <p class="copy">Last run 3&nbsp;days ago</p>
          <Button onclick={() => (synced = !synced)}
            ><span class="swap"
              ><span>{synced ? 'Undo the Sync' : 'Sync Now'}</span><span aria-hidden="true"
                >{synced ? 'Sync Now' : 'Undo the Sync'}</span
              ></span
            ></Button
          >
        </div>
      </Plate>
    </Specimen>
  </Example>
</Pair>

<Example
  title="In Context"
  note="A callout about a plate stands beside it, never inside it, so surfaces do not nest"
  layout="stack"
  ground="canvas"
>
  <Plate title="Configuration Drift" level={4} state="2 differ" icon="warning" tone="warning" />
  <Callout tone="warning" title="Drift blocks the next sync">
    {#snippet icon()}<Icon name="warning" size="sm" />{/snippet}
    Resolve the 2 differences before the sync at {clock(2)}
  </Callout>
</Example>

<style>
  .copy {
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-body) / var(--sui-leading-body)
      var(--sui-sans);
    margin: 0;
  }

  /* Both words take one cell, the one not said hidden, so the button keeps the wider and its
     edge and focus ring never move when the press changes its words (L-64). */
  .swap {
    display: grid;
    justify-items: center;
  }

  /* Each trims its cap in a box snapped as a button's own label is, so the button keeps the
     compact height and its words stay on the pixel grid (L-95). */
  .swap > * {
    align-content: center;
    block-size: var(--sui-block-snap-even);
    grid-area: 1 / 1;
    padding-block: var(--sui-block-snap-room-even);
    text-box: trim-both cap alphabetic;
  }

  .swap > [aria-hidden='true'] {
    visibility: hidden;
  }

  .change {
    display: grid;
    gap: var(--sui-space-4);
  }
</style>
