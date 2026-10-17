<script module lang="ts">
  export const section = { title: 'Icon button', order: 11 };
</script>

<script lang="ts">
  import { IconButton } from '#lib';
  import Example from '../kit/Example.svelte';
  import Specimen from '../kit/Specimen.svelte';
</script>

<Example title="Quiet tier" note="The label is the accessible name and the tooltip">
  <Specimen label={'icon="settings"'}><IconButton icon="settings" label="Open settings" /></Specimen
  >
  <Specimen label={'icon="trash"'}><IconButton icon="trash" label="Remove the rule" /></Specimen>
  <Specimen label={'icon="more"'}><IconButton icon="more" label="More actions" /></Specimen>
  <Specimen label={'icon="close"'}><IconButton icon="close" label="Close the panel" /></Specimen>
</Example>

<Example title="Toolbar tier" note="Matches the 34px controls beside it">
  <Specimen label="toolbar"><IconButton toolbar icon="filter" label="Filter the list" /></Specimen>
  <Specimen label="toolbar"><IconButton toolbar icon="sort" label="Sort the list" /></Specimen>
  <Specimen label="toolbar busy"
    ><IconButton toolbar icon="refresh" label="Refresh" busy /></Specimen
  >
  <Specimen label="toolbar disabled"
    ><IconButton toolbar icon="trash" label="Remove the rule" disabled /></Specimen
  >
</Example>
