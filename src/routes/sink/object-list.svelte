<script module lang="ts">
  export const section = { title: 'Object list', order: 86 };
</script>

<script lang="ts">
  import { Chip, IconButton, IdentityRow, ObjectList, ObjectRow, Pill, RelativeTime } from '#lib';
  import Example from '../kit/Example.svelte';

  const synced = new Date(Date.now() - 12 * 60_000).toISOString();

  let syncing = $state(false);

  function sync() {
    syncing = true;
    setTimeout(() => (syncing = false), 1200);
  }
</script>

<Example
  title="Rows"
  note="Linked rows open as a whole, and the controls inside them stay pressable"
  layout="stack"
>
  <div class="card">
    <ObjectList>
      <ObjectRow href="#object-list">
        {#snippet main()}
          <span class="name">smykla-skalski/sui</span>
          <span class="sum">Synced <RelativeTime value={synced} /> · 84 files in step</span>
        {/snippet}
        {#snippet side()}
          <Chip tone="success" label="In step" />
          <IconButton
            icon="refresh"
            label="Sync smykla-skalski/sui"
            busy={syncing}
            onclick={sync}
          />
        {/snippet}
      </ObjectRow>
      <ObjectRow href="#object-list">
        {#snippet main()}
          <span class="name"
            >smykla-skalski/an-unusually-long-repository-name-that-has-to-break-somewhere-on-a-phone</span
          >
          <span class="sum"
            >Three rules would change, and the sentence wraps rather than running under the side</span
          >
        {/snippet}
        {#snippet side()}
          <Chip tone="warning" label="3 changes" />
        {/snippet}
      </ObjectRow>
      <ObjectRow>
        {#snippet main()}
          <IdentityRow name="Ada Lovelace" handle="@ada" />
        {/snippet}
        {#snippet side()}
          <Pill tone="role">Owner</Pill>
        {/snippet}
      </ObjectRow>
      <ObjectRow>
        {#snippet main()}
          <span class="name">Audit log export</span>
          <span class="sum">A row without a link stays still under the pointer</span>
        {/snippet}
      </ObjectRow>
    </ObjectList>
  </div>
</Example>

<style>
  .card {
    background: var(--sui-surface-base);
    border: 1px solid var(--sui-border-subtle);
    border-radius: var(--sui-radius-surface);
    min-inline-size: 0;
    padding: var(--sui-rhythm-surface-pad);
  }

  @media (max-width: 36rem) {
    .card {
      padding: var(--sui-rhythm-surface-pad-compact);
    }
  }

  .name {
    color: var(--sui-text-primary);
    font: 600 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }

  .sum {
    color: var(--sui-text-muted);
    font: 400 var(--sui-font-size-meta) / var(--sui-row-copy-leading) var(--sui-sans);
    overflow-wrap: anywhere;
    text-box: trim-both cap alphabetic;
  }
</style>
