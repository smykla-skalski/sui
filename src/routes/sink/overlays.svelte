<script module lang="ts">
  export const section = { title: 'Popover and tooltip', order: 60 };
</script>

<script lang="ts">
  import { Button, Icon, IconButton, Popover, Tooltip } from '#lib';
  import Example from '../kit/Example.svelte';

  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let help = $state<HTMLButtonElement | null>(null);
  let open = $state(false);
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

<Example title="Tooltip" note="Hover pauses before it shows, keyboard focus shows it at once">
  <IconButton icon="info" label="About this project" />
  <button bind:this={help} type="button" class="help">What is a signal button</button>
  <Tooltip
    anchor={help}
    describe
    text="The one action a view exists for, so a view has exactly one of them"
  />
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

  .state {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }

  .help {
    background: none;
    border: 0;
    border-radius: var(--sui-radius-chip);
    color: var(--sui-brand-action-text);
    cursor: help;
    font: 600 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
    min-block-size: var(--sui-control-height-chip);
    padding: 0;
    text-decoration: underline dotted;
    text-underline-offset: 0.2em;
  }

  .help:focus-visible {
    outline: var(--sui-focus-ring-width) solid var(--sui-focus);
    outline-offset: var(--sui-focus-ring-offset);
  }
</style>
