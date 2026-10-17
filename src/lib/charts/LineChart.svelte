<script lang="ts">
  import XYChart from './XYChart.svelte';
  import type { XYChartProps } from './types.js';

  let props: XYChartProps = $props();
</script>

<!--
@component
A numeric series over a numeric axis, drawn as lines through its points. Dates are mapped
to timestamps by the caller, with `formatX` to print them. Every chart needs a short
`description` that states what the reader should take from it, and the values are always
available as a table under "View chart data". Points that are not finite are left out.
-->

<XYChart {...props} kind="line" />
