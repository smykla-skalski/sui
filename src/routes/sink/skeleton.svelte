<script module lang="ts">
  export const section = { title: 'Skeleton', order: 87 };
</script>

<script lang="ts">
  import { Button, ObjectList, ObjectRow, Skeleton } from '#lib';
  import Example from '../kit/Example.svelte';

  const names = ['smykla-skalski/sui', 'smykla-skalski/smyklot', 'smykla-skalski/ksai'];

  let loading = $state(true);

  function reload() {
    loading = true;
    setTimeout(() => (loading = false), 1500);
  }
</script>

<Example
  title="First load"
  note="Placeholder rows reserve the height the loaded rows take, and they share one pulse"
  layout="stack"
>
  <div>
    <Button onclick={() => (loading ? (loading = false) : reload())}>
      {loading ? 'Show the rows' : 'Load again'}
    </Button>
  </div>
  <div class="card">
    {#if loading}
      <Skeleton rows={3} label="Loading repositories…" />
    {:else}
      <ObjectList>
        {#each names as name (name)}
          <ObjectRow>
            {#snippet main()}
              <span class="name">{name}</span>
              <span class="sum">Default branch main · in step</span>
            {/snippet}
          </ObjectRow>
        {/each}
      </ObjectList>
    {/if}
  </div>
</Example>

<Example title="Plain rows" note="Without bars, for a list whose rows hold one line" layout="stack">
  <div class="card">
    <Skeleton rows={2} rowHeight="2.75rem" bars={false} />
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
