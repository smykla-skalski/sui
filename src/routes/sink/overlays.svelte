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
  let sync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let openSync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let refreshes = $state(0);
  let synced = $state(false);

  const syncHint = $derived(synced ? 'Last synced just now' : 'Last synced 4 minutes ago');
  const refreshed = $derived(
    refreshes === 0
      ? 'Name tip'
      : refreshes === 1
        ? 'Refreshed once'
        : `Refreshed ${refreshes} times`
  );
</script>

<Example title="Popover" note="The browser toggles it, keeps it in the top layer and returns focus">
  <Specimen label="Toggled by its trigger" code={'popovertarget width="min-trigger"'}>
    <Button bind:element={trigger} popovertarget="sink-popover">
      Show details
      {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
    </Button>
    <Popover id="sink-popover" anchor={trigger} width="min-trigger">
      <div class="panel">
        <p class="panel-title">Release 0.3.0</p>
        <p class="panel-copy">Published to npm and tagged on GitHub</p>
      </div>
    </Popover>
  </Specimen>
</Example>

<Example
  title="Tooltip"
  note="Hover pauses before it shows, focus shows it at once, and a long press shows it on touch"
>
  <Specimen label={refreshed} code={'icon="refresh" label'}>
    <IconButton icon="refresh" label="Refresh the list" onclick={() => (refreshes += 1)} />
  </Specimen>
  <Specimen label="Description tip" code="describe">
    <Button bind:element={sync} onclick={() => (synced = true)}>Sync now</Button>
    <Tooltip anchor={sync} describe text={syncHint} />
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
      <Popover id="sink-popover-open" anchor={null} inline>
        <div class="panel">
          <p class="panel-title">Release 0.3.0</p>
          <p class="panel-copy">Published to npm and tagged on GitHub</p>
        </div>
      </Popover>
    </div>
  </Specimen>
  <Specimen label="Open tip" code="preview">
    <div class="open">
      <Button bind:element={openSync} onclick={() => (synced = true)}>Sync now</Button>
      <Tooltip anchor={openSync} describe preview text={syncHint} />
    </div>
  </Specimen>
</Example>

<style>
  .panel {
    display: grid;
    gap: var(--sui-row-copy-gap);
    padding: var(--sui-space-3) var(--sui-space-4);
  }

  .panel-title {
    font: 600 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .panel-copy {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    margin: 0;
    text-box: trim-both cap alphabetic;
  }

  .open {
    display: grid;
    gap: var(--sui-space-1);
    justify-items: start;
    min-inline-size: 0;
  }
</style>
