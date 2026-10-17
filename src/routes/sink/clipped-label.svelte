<script module lang="ts">
  export const section = {
    title: 'Clipped label',
    order: 84,
    lead: 'A one-line label that shows its whole text in a tooltip, and only once the text is cut. Text that may wrap needs no tooltip, so let it wrap.',
    components: ['ClippedLabel']
  };
</script>

<script lang="ts">
  import { ClippedLabel } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example
  title="Fits and clipped"
  note="Each label has 16rem, and only the clipped ones answer a hover with their whole text"
  layout="grid"
>
  <Specimen label="Fits">
    <div class="frame">
      <ClippedLabel text="Platform" />
    </div>
  </Specimen>
  <Specimen label="Clipped">
    <div class="frame">
      <ClippedLabel text="Platform engineering and developer experience" />
    </div>
  </Specimen>
  <Specimen label="Clipped identifier" code="mono">
    <div class="frame mono">
      <ClippedLabel mono text="smykla-skalski/sui/src/lib/components/ClippedLabel.svelte" />
    </div>
  </Specimen>
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
