<script module lang="ts">
  export const section = {
    title: 'Popover and tooltip',
    order: 60,
    lead: 'A floating box beside its trigger, and a short tip on a control that does something. A task that needs an answer is a Modal.',
    components: ['Popover', 'Tooltip']
  };
</script>

<script lang="ts">
  import { Button, Icon, IconButton, Popover, Tooltip } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let above = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let pinned = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let tall = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let pinnedOpen = $state(false);

  const changes = Array.from({ length: 24 }, (_, index) => `Change ${index + 1} in 0.3.0`);
  let sync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let openSync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let opens = $state(0);
  let synced = $state(false);

  const syncHint = $derived(synced ? 'Last synced just now' : 'Last synced 4 minutes ago');
  const pressed = $derived(
    opens === 0 ? 'Name tip' : opens === 1 ? 'Pressed once' : `Pressed ${opens} times`
  );
</script>

<Example title="Popover" note="The browser toggles it, keeps it in the top layer and returns focus">
  <Specimen label="Toggled by its trigger" code={'popovertarget width="min-trigger"'}>
    <Button bind:element={trigger} popovertarget="sink-popover">
      Show details
      {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
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
  <Specimen label="Above, flipped below when there is no room" code={'side="block-start"'}>
    <Button bind:element={above} popovertarget="sink-popover-above">
      Show the author
      {#snippet trailing()}<Icon name="chevron-up" size="sm" />{/snippet}
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
  <Specimen label="Manual, closed by its button or Escape" code={'dismiss="manual"'}>
    <Button bind:element={pinned} popovertarget="sink-popover-pinned">
      Pin the notes
      {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
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
        <Button onclick={() => (pinnedOpen = false)}>Close the notes</Button>
      </div>
    </Popover>
  </Specimen>
  <Specimen label="Taller than its room, scrolling inside">
    <Button bind:element={tall} popovertarget="sink-popover-tall">
      Show every change
      {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
    </Button>
    <Popover
      id="sink-popover-tall"
      anchor={tall}
      width="min-trigger"
      role="dialog"
      aria-label="Changes in 0.3.0"
    >
      <ul class="changes" role="list">
        {#each changes as change (change)}<li>{change}</li>{/each}
      </ul>
    </Popover>
  </Specimen>
</Example>

<Example
  title="Tooltip"
  note="Hover pauses before it shows, focus shows it at once, and a long press shows it on touch"
>
  <Specimen label={pressed} code={'icon="settings" label'}>
    <IconButton icon="settings" label="Open the settings" onclick={() => (opens += 1)} />
  </Specimen>
  <Specimen label="Description tip, words the button lacks" code="text">
    <Button bind:element={sync} onclick={() => (synced = true)}>Sync now</Button>
    <Tooltip anchor={sync} text={syncHint} />
  </Specimen>
</Example>

<Example
  title="Open"
  note="The popover and a described tip drawn in place, so a review needs no click or hover"
>
  <Specimen label="Open popover" code="inline">
    <div class="open">
      <Button aria-expanded="true" aria-controls="sink-popover-open">
        Show details
        {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
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
  <Specimen label="Open tip" code="preview">
    <div class="open">
      <Button bind:element={openSync} onclick={() => (synced = true)}>Sync now</Button>
      <Tooltip anchor={openSync} preview text={syncHint} />
    </div>
  </Specimen>
</Example>

<style>
  .panel {
    display: grid;
    justify-items: start;
    gap: var(--sui-row-copy-gap);
    padding: var(--sui-space-3) var(--sui-space-4);
  }

  .panel-title {
    align-content: center;
    block-size: var(--sui-block-snap);
    font: var(--sui-weight-semibold) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .panel-copy {
    align-content: center;
    block-size: var(--sui-block-snap);
    color: var(--sui-text-secondary);
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-row-copy-leading)
      var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .changes {
    color: var(--sui-text-secondary);
    display: grid;
    font: var(--sui-weight-regular) var(--sui-font-size-meta) / var(--sui-leading-meta)
      var(--sui-sans);
    gap: var(--sui-space-1);
    list-style: none;
    margin: 0;
    padding: var(--sui-space-3) var(--sui-space-4);
  }

  /* One bounded column, so the open tip's 100% cap is the specimen's width and it wraps there. */
  .open {
    display: grid;
    gap: var(--sui-space-1);
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
    min-inline-size: 0;
  }
</style>
