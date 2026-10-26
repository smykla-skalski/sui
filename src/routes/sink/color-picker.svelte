<script module lang="ts">
  export const section = {
    title: 'Color picker',
    lead: "A color as a hex, picked from swatches, an area and a hue rail, for a color that is the user's own data. A theme never needs one.",
    components: ['ColorPicker']
  };
</script>

<script lang="ts">
  import { ColorPicker, Field } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';

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
  <Specimen label="Saturated" code="label">
    <ColorPicker label="Label color" bind:value={label} />
  </Specimen>
  <Specimen label="Pale">
    <ColorPicker label="Highlight color" bind:value={pale} />
  </Specimen>
  <Specimen label="Grey">
    <ColorPicker label="Muted color" bind:value={grey} />
  </Specimen>
  <Specimen label="Disabled" code="disabled">
    <Field label="Locked color" hint="The workspace theme sets it, so only an owner can change it">
      {#snippet control(field)}
        <ColorPicker id={field.id} aria-describedby={field.describedby} value="#5319e7" disabled />
      {/snippet}
    </Field>
  </Specimen>
</Example>

<Example
  title="Own swatches"
  note="A caller replaces the swatch list, and a color off the list checks no swatch"
>
  <Specimen label="Chart series" code="swatches">
    <ColorPicker label="Series color" swatches={chartSwatches} bind:value={chart} />
  </Specimen>
</Example>

<Example
  title="In a field"
  note="The field's label and the hex name the trigger together, and its hint describes it"
>
  <Specimen label="Field label and hint" code="id aria-describedby">
    <Field label="Brand color" hint="Used for links and the one signal button on each view">
      {#snippet control(field)}
        <ColorPicker id={field.id} aria-describedby={field.describedby} bind:value={brand} />
      {/snippet}
    </Field>
  </Specimen>
</Example>
