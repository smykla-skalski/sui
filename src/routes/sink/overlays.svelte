<script module lang="ts">
  export const section = { title: 'Popover and tooltip', order: 60 };
</script>

<script lang="ts">
  import { Button, Icon, IconButton, Popover, Tooltip } from '#lib';
  import Example from '../kit/Example.svelte';

  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let sync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let openSync = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let open = $state(false);
  let refreshes = $state(0);
  let synced = $state(false);
  let last = $state('Nothing done yet');

  const syncHint = $derived(synced ? 'Last synced just now' : 'Last synced 4 minutes ago');

  function refresh(): void {
    refreshes += 1;
    last = refreshes === 1 ? 'Refreshed once' : `Refreshed ${refreshes} times`;
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText('https://github.com/smykla-skalski/sui');
      last = 'Link copied';
    } catch {
      last = 'The browser did not allow the copy';
    }
  }

  function syncNow(): void {
    synced = true;
    last = 'Synced';
  }
</script>

<Example title="Popover" note="The browser toggles it, keeps it in the top layer and returns focus">
  <Button bind:element={trigger} popovertarget="sink-popover">
    Show details
    {#snippet trailing()}<Icon name="chevron-down" size="sm" />{/snippet}
  </Button>
  <Popover id="sink-popover" anchor={trigger} bind:open width="min-trigger">
    <div class="panel">
      <p class="panel-title">Release 0.3.0</p>
      <p class="panel-copy">Published to npm and tagged on GitHub</p>
    </div>
  </Popover>
  <span class="state">{open ? 'Open' : 'Closed'}</span>
</Example>

<Example
  title="Open states"
  note="The popover and a described tip drawn in place, so a review needs no click or hover"
>
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
  <div class="open">
    <Button bind:element={openSync} onclick={syncNow}>Sync now</Button>
    <Tooltip anchor={openSync} describe preview text={syncHint} />
  </div>
</Example>

<Example
  title="Tooltip"
  note="Hover pauses before it shows, focus shows it at once, and a long press shows it on touch"
>
  <IconButton icon="refresh" label="Refresh the list" onclick={refresh} />
  <IconButton icon="link" label="Copy the link" onclick={copyLink} />
  <Button bind:element={sync} onclick={syncNow}>Sync now</Button>
  <Tooltip anchor={sync} describe text={syncHint} />
  <span class="state" role="status">{last}</span>
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
    align-self: start;
    display: grid;
    gap: var(--sui-space-1);
    justify-items: start;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }
</style>
