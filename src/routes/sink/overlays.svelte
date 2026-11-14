<script module lang="ts">
  export const section = {
    title: 'Popover & Tooltip',
    short: 'Popover',
    lead: 'A floating box beside its trigger, and a short tip on a control that does something. A task that needs an answer is a Modal.',
    components: ['Popover', 'Tooltip']
  };
</script>

<script lang="ts">
  import { Button, Field, Icon, IconButton, Popover, Tooltip } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let above = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let pinned = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let tall = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let pinnedOpen = $state(false);
  let note = $state('Ship after the review');

  const changes = Array.from({ length: 24 }, (_, index) => `Change ${index + 1} in 0.3.0`);
  let sync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let openSync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let openName = $state<HTMLButtonElement | null>(null);
  let opens = $state(0);
  let synced = $state(false);

  const syncHint = $derived(synced ? 'Last synced just now' : 'Last synced 4\u00a0minutes ago');
  const pressed = $derived(
    opens === 0 ? 'Name tip' : opens === 1 ? 'Pressed once' : `Pressed ${opens} times`
  );
</script>

<Example
  title="Popover"
  note="The browser toggles it, keeps it in the top layer and returns focus"
  layout="grid"
  --example-max="48rem"
  --specimen-min="19rem"
  --specimen-row-gap="5.25rem"
>
  <Specimen label="Toggled by its trigger">
    <Button bind:element={trigger} popovertarget="sink-popover">
      Show Details
      {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
    </Button>
    <Popover
      id="sink-popover"
      anchor={trigger}
      width="min-trigger"
      role="dialog"
      aria-labelledby="sink-popover-title"
    >
      <div class="panel">
        <p id="sink-popover-title" class="panel-title">Release 0.3.0</p>
        <p class="panel-copy">Published to npm and tagged on GitHub</p>
      </div>
    </Popover>
  </Specimen>
  <Specimen label="Above, flipped below when there is no room">
    <Button bind:element={above} popovertarget="sink-popover-above">
      Show the Author
      {#snippet trailing()}<Icon name="chevron-up" size="base" />{/snippet}
    </Button>
    <Popover
      id="sink-popover-above"
      anchor={above}
      side="block-start"
      role="dialog"
      aria-labelledby="sink-popover-above-title"
    >
      <div class="panel">
        <p id="sink-popover-above-title" class="panel-title">Published by Ada</p>
        <p class="panel-copy">From the release workflow on main</p>
      </div>
    </Popover>
  </Specimen>
  <Specimen label="Manual, closed by its button or Escape">
    <Button bind:element={pinned} popovertarget="sink-popover-pinned">
      Pin the Notes
      {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
    </Button>
    <Popover
      id="sink-popover-pinned"
      anchor={pinned}
      dismiss="manual"
      bind:open={pinnedOpen}
      role="dialog"
      aria-labelledby="sink-popover-pinned-title"
    >
      <div class="panel">
        <p id="sink-popover-pinned-title" class="panel-title">Notes stay open</p>
        <p class="panel-copy">A press outside leaves them in place</p>
        <div class="panel-field"><Field label="Note" bind:value={note} /></div>
        <div class="panel-action">
          <Button onclick={() => (pinnedOpen = false)}>Close the Notes</Button>
        </div>
      </div>
    </Popover>
  </Specimen>
  <Specimen label="Taller than its room, scrolling inside">
    <Button bind:element={tall} popovertarget="sink-popover-tall">
      Show Every Change
      {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
    </Button>
    <Popover
      id="sink-popover-tall"
      anchor={tall}
      width="min-trigger"
      role="dialog"
      aria-label="Changes in 0.3.0"
      tabindex={0}
    >
      <ul class="changes" role="list">
        {#each changes as change (change)}<li>{change}</li>{/each}
      </ul>
    </Popover>
  </Specimen>
</Example>

<Example
  title="Tooltip"
  layout="grid"
  --example-max="48rem"
  --specimen-min="19rem"
  --specimen-caption-gap="3rem"
  note="Hover pauses before it shows, focus shows it at once, and a long press shows it on touch"
>
  <Specimen label={pressed}>
    <IconButton icon="settings" label="Open the settings" toolbar onclick={() => (opens += 1)} />
  </Specimen>
  <Specimen label="Description tip, words the button lacks">
    <Button bind:element={sync} onclick={() => (synced = true)}>Sync Now</Button>
    <Tooltip anchor={sync} text={syncHint} />
  </Specimen>
</Example>

<Example
  title="Open"
  layout="grid"
  --example-max="48rem"
  --specimen-min="19rem"
  note="The popovers and a described tip drawn in place, so a review needs no click or hover"
>
  <Specimen label="Open popover">
    <div class="open floating">
      <Button aria-expanded="true" aria-controls="sink-popover-open">
        Show Details
        {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
      </Button>
      <Popover
        id="sink-popover-open"
        anchor={null}
        inline
        role="dialog"
        aria-labelledby="sink-popover-open-title"
      >
        <div class="panel">
          <p id="sink-popover-open-title" class="panel-title">Release 0.3.0</p>
          <p class="panel-copy">Published to npm and tagged on GitHub</p>
        </div>
      </Popover>
    </div>
  </Specimen>
  <Specimen label="Open notes, closed by their button">
    <div class="open floating">
      <Button aria-expanded="true" aria-controls="sink-popover-open-pinned">
        Pin the Notes
        {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
      </Button>
      <Popover
        id="sink-popover-open-pinned"
        anchor={null}
        inline
        role="dialog"
        aria-labelledby="sink-popover-open-pinned-title"
      >
        <div class="panel">
          <p id="sink-popover-open-pinned-title" class="panel-title">Notes stay open</p>
          <p class="panel-copy">A press outside leaves them in place</p>
          <div class="panel-field"><Field label="Note" value="Ship after the review" /></div>
          <div class="panel-action"><Button>Close the Notes</Button></div>
        </div>
      </Popover>
    </div>
  </Specimen>
  <Specimen label="Open list, scrolling inside">
    <div class="open floating fit">
      <Button aria-expanded="true" aria-controls="sink-popover-open-tall">
        Show Every Change
        {#snippet trailing()}<Icon name="chevron-down" size="base" />{/snippet}
      </Button>
      <Popover
        id="sink-popover-open-tall"
        style="justify-self: stretch; max-block-size: 11.4375rem"
        anchor={null}
        inline
        role="dialog"
        aria-label="Changes in 0.3.0"
        tabindex={0}
      >
        <ul class="changes" role="list">
          {#each changes as change (change)}<li>{change}</li>{/each}
        </ul>
      </Popover>
    </div>
  </Specimen>
  <Specimen label="Open tips, a name and a description">
    <div class="tips">
      <div class="open centred">
        <IconButton bind:element={openName} icon="settings" label="Open the settings" toolbar />
        <Tooltip anchor={openName} preview text="Open the settings" />
      </div>
      <div class="open centred">
        <Button bind:element={openSync} onclick={() => (synced = true)}>Sync Now</Button>
        <Tooltip anchor={openSync} preview text={syncHint} />
      </div>
    </div>
  </Specimen>
</Example>

<style>
  .panel {
    display: grid;
    justify-items: start;
    gap: var(--sui-title-copy-gap);
    padding: var(--sui-space-4);
  }

  /* A popover's title, two type steps over its copy as well as heavier (L-25). */
  .panel-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-semibold) var(--sui-font-size-title) / var(--sui-leading-title)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  .panel-copy {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    padding-block: var(--sui-block-snap-room);
    text-box: trim-both cap alphabetic;
  }

  /* A field in a panel stands a form's 20px under the copy, and the action that closes the
     panel 24px past it at the end edge, as a dialog ends with its actions, so it reads as the
     panel's close and not as a line of copy (L-35). */
  .panel-field {
    justify-self: stretch;
    margin-block-start: var(--sui-space-2);
  }

  .panel-action {
    justify-self: end;
    margin-block-start: var(--sui-space-3);
  }

  /* The two tip copies side by side, each tip over its own control, a specimen's width apart
     so they read as two tips and not as one strip. */
  .tips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-8);
  }

  .changes {
    color: var(--sui-text-primary);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-1);
    list-style: none;
    margin: 0;
    padding: var(--sui-space-4);
  }

  /* One bounded column, so the open tip's 100% cap is the specimen's width and it wraps there. */
  .open {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
    min-inline-size: 0;
  }

  /* A column as wide as the wider of the trigger and its list, which stretches to it, so the
     copy keeps the live list's least width, its trigger's (`width="min-trigger"`). */
  .fit {
    grid-template-columns: minmax(0, max-content);
  }

  /* The live tip centres on its button, so the copy's column is the tip's width and the button
     stands in its middle, inside the specimen. */
  .centred {
    grid-template-columns: minmax(0, max-content);
    justify-items: center;
  }

  /* An inline popover skips placement, so its copy takes the floating gap here. The tip copy
     keeps its own. */
  .floating {
    gap: var(--sui-floating-gap);
  }
</style>
