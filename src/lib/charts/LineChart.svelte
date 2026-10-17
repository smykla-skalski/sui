<script lang="ts">
  import XYChart from './XYChart.svelte';
  import type { XYChartProps } from './types.js';

  let props: XYChartProps = $props();
</script>

<!--
@component
A numeric series over a numeric axis, drawn as lines through its points. Dates are mapped
to timestamps by the caller, with `formatX` to print them. Series never differ by color
alone: each has its own marker shape, every line after the first its own dash, and with four
series or fewer each line is named at its end in text ink. The legend stays. Every chart needs a short
`description` that states what the reader should take from it, and any values it has are
available as a table under "View chart data". Points that are not finite are left out. The plot
fills the width of its container with text at its token size, and scrolls sideways below 280px.
Axis ticks fall on round numbers, and on whole numbers when every value is whole.
-->

<XYChart {...props} kind="line" />
