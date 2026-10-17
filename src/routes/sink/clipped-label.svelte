<script module lang="ts">
  export const section = { title: 'Clipped label', order: 84 };
</script>

<script lang="ts">
  import { ClippedLabel } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example
  title="Fits and clipped"
  note="Only the clipped label answers a hover with its whole text"
  layout="stack"
>
  <div class="frame">
    <ClippedLabel text="Platform" />
  </div>
  <div class="frame">
    <ClippedLabel text="Platform engineering and developer experience" />
  </div>
  <div class="frame mono">
    <ClippedLabel mono text="smykla-skalski/sui/src/lib/components/ClippedLabel.svelte" />
  </div>
</Example>

<style>
  .frame {
    color: var(--sui-text-primary);
    display: flex;
    font: 500 var(--sui-font-size-control) / var(--sui-leading-meta) var(--sui-sans);
    inline-size: min(100%, 16rem);
  }

  .mono {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
