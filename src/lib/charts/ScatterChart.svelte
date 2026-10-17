<script lang="ts">
  import XYChart from './XYChart.svelte';
  import type { XYChartProps } from './types.js';

  let props: XYChartProps = $props();
</script>

<!--
@component
Numeric points over a numeric axis, for values that are measured rather than continuous.
It takes the same series, labels and formatters as `LineChart`, and like every chart it needs
a `description` and offers its values as a table.
-->

<XYChart {...props} kind="scatter" />
