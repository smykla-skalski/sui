<script module lang="ts">
  export const section = { title: 'Icon button', order: 11 };
</script>

<script lang="ts">
  import { IconButton } from '#lib';
  import Example from '../kit/Example.svelte';
</script>

<Example title="Quiet tier" note="The label is the accessible name and the tooltip">
  <IconButton icon="settings" label="Open settings" />
  <IconButton icon="trash" label="Remove the rule" />
  <IconButton icon="more" label="More actions" />
  <IconButton icon="close" label="Close the panel" />
</Example>

<Example title="Toolbar tier" note="Matches the 34px controls beside it">
  <IconButton toolbar icon="filter" label="Filter the list" />
  <IconButton toolbar icon="sort" label="Sort the list" />
  <IconButton toolbar icon="refresh" label="Refresh" busy />
  <IconButton toolbar icon="trash" label="Remove the rule" disabled />
</Example>
