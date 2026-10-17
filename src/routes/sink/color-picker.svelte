<script module lang="ts">
  export const section = { title: 'Color picker', order: 101 };
</script>

<script lang="ts">
  import { ColorPicker, Field } from '#lib';
  import Example from '../kit/Example.svelte';

  let label = $state('#0e8a16');
  let pale = $state('#fef2c0');
  let grey = $state('#6b7280');
  let brand = $state('#0f766e');
  let chart = $state('#2f6f9f');

  const chartSwatches = ['#2f6f9f', '#4f8a3c', '#b7791f', '#a33a45', '#6d4fb3', '#3b7f7a'];
</script>

<Example
  title="States"
  note="A saturated pick, a pale one, a grey that keeps its hue and a locked one with its reason"
>
  <ColorPicker label="Label color" bind:value={label} />
  <ColorPicker label="Highlight color" bind:value={pale} />
  <ColorPicker label="Muted color" bind:value={grey} />
  <Field label="Locked color" hint="The workspace theme sets it, so only an owner can change it">
    {#snippet control(field)}
      <ColorPicker id={field.id} aria-describedby={field.describedby} value="#5319e7" disabled />
    {/snippet}
  </Field>
</Example>

<Example
  title="In a field"
  note="The field's label and the hex name the trigger together, and its hint describes it"
>
  <Field label="Brand color" hint="Used for links and the one signal button on each view">
    {#snippet control(field)}
      <ColorPicker id={field.id} aria-describedby={field.describedby} bind:value={brand} />
    {/snippet}
  </Field>
</Example>

<Example
  title="Own swatches"
  note="A caller replaces the swatch list, and a color off the list checks no swatch"
>
  <ColorPicker label="Series color" swatches={chartSwatches} bind:value={chart} />
  <span class="value">Picked <code>{chart}</code></span>
</Example>

<style>
  .value {
    color: var(--sui-text-secondary);
    font: 400 var(--sui-font-size-meta) / var(--sui-leading-meta) var(--sui-sans);
  }

  code {
    font-family: var(--sui-mono);
    font-variant-numeric: tabular-nums;
  }
</style>
