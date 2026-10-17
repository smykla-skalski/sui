<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon from '../icons/Icon.svelte';
  import Button from './Button.svelte';

  const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

  let {
    overridden = $bindable(false),
    inherited,
    source,
    disabled = false,
    control,
    class: className = '',
    ...rest
  }: {
    /** True while this level sets its own value; false follows `source`. */
    overridden?: boolean;
    /** The value that applies while nothing is set here, said as a reader would say it. */
    inherited: string;
    /** Where the inherited value comes from, read after "from", such as "the workspace". */
    source: string;
    disabled?: boolean;
    /** The control that sets the value here, drawn only while it is overridden. */
    control: Snippet;
    /** Layout for the call site only, never the control's own paint. */
    class?: HTMLAttributes<HTMLDivElement>['class'];
  } & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> = $props();

  let root = $state<HTMLElement | null>(null);

  async function override(): Promise<void> {
    overridden = true;
    await tick();
    root?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
  }

  async function inherit(): Promise<void> {
    overridden = false;
    await tick();
    root?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }
</script>

<!--
@component
A value that comes from somewhere else until this level overrides it, and the way back. While it
inherits, it says the value in muted ink and where it comes from, beside an `add` button named
Override. Overriding draws the caller's `control` in its place and moves focus into it; "Use
inherited value" takes it back and returns focus to Override. Both moves keep the page still.

An override is not a change by itself. Mark the row unsaved, with `SettingRow`'s `unsaved`,
only when the setting differs from its saved value, never because it differs from the inherited
one. Set the control's starting value to the inherited one when `overridden` turns on, so
overriding writes nothing until the reader picks.
-->

<div bind:this={root} {...rest} class={['sui-inherit', className]}>
  <span class="sui-inherit-subject">
    <span class="sui-inherit-marker" aria-hidden="true">
      <Icon name={overridden ? 'link-off' : 'link'} size="sm" />
    </span>
    {#if overridden}
      <span class="sui-inherit-control">{@render control()}</span>
    {:else}
      <span class="sui-inherit-value"
        ><span class="sui-inherit-word">{inherited}</span> from {source}</span
      >
    {/if}
  </span>
  {#if overridden}
    <Button tone="quiet" {disabled} onclick={inherit}>Use inherited value</Button>
  {:else}
    <Button tone="add" {disabled} onclick={override}>
      {#snippet icon()}<Icon name="plus" size="sm" />{/snippet}
      Override
    </Button>
  {/if}
</div>

<style>
  .sui-inherit {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sui-space-2) var(--sui-space-3);
    inline-size: fit-content;
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  .sui-inherit-subject {
    align-items: center;
    display: flex;
    gap: var(--sui-inherit-marker-gap);
    min-inline-size: 0;
  }

  .sui-inherit-marker {
    block-size: var(--sui-inherit-marker-size);
    color: var(--sui-text-muted);
    display: grid;
    flex: none;
    inline-size: var(--sui-inherit-marker-size);
    place-items: center;
  }

  .sui-inherit-control {
    display: flex;
    min-inline-size: 0;
  }

  .sui-inherit-value {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    min-inline-size: 0;
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sui-inherit-word {
    font-weight: 600;
  }
</style>
